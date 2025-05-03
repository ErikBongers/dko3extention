import {addButton, arrayIsEqual, getSchoolIdString, openHoursSettings, Schoolyear, setButtonHighlighted} from "../globals";
import * as def from "../def";
import {createTable, getUrenVakLeraarFileName, refillTable} from "./buildUren";
import {addStudentToVakLeraarsMap, scrapeUren, StudentUrenRow, VakLeraar} from "./scrapeUren";
import {cloud} from "../cloud";
import {TableFetcher, TableRef} from "../table/tableFetcher";
import {setCriteriaForTeacherHoursAndClickFetchButton} from "./prefillInstruments";
import {HashObserver} from "../pageObserver";
import {NamedCellTableFetchListener} from "../pageHandlers";
import {decorateTableHeader} from "../table/tableHeaders";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {registerChecksumHandler, setAfterDownloadTableAction} from "../table/observer";
import {CloudData, JsonCloudData, UrenData} from "./urenData";
import {createDefaultTableFetcher} from "../table/loadAnyTable";
import {Actions, sendRequest, ServiceRequest, TabType} from "../messaging";
import {fetchHoursSettingsOrSaveDefault, mapHourSettings, TeacherHoursSetup, TeacherHoursSetupMapped} from "./hoursSettings";
import MessageSender = chrome.runtime.MessageSender;

registerChecksumHandler(def.WERKLIJST_TABLE_ID,  (_tableDef: TableFetcher) => {
    return document.querySelector("#view_contents > div.alert.alert-primary")?.textContent.replace("Criteria aanpassen", "")?.replace("Criteria:", "") ?? ""
    }
    );

let observer = new HashObserver("#leerlingen-werklijst", onMutation, false, onPageLoaded);
export default observer;

function onPageLoaded() {
    console.log("Werklijst onPageLoaded");
    if (document.querySelector("#btn_werklijst_maken")) {
        onCriteriaShown();
    }
}

function onMutation(mutation: MutationRecord) {
    console.log("Werklijst onMutation");
    if ((mutation.target as HTMLElement).id === def.WERKLIJST_TABLE_ID) {
        onWerklijstChanged();
        return true;
    }
    let buttonBar = document.getElementById("tablenav_leerlingen_werklijst_top");
    if (mutation.target === buttonBar) {
        onButtonBarChanged();
        return true;
    }
    if (document.querySelector("#btn_werklijst_maken")) {
        onCriteriaShown();
        return true;
    }
    return false;
}

function onCriteriaShown() {
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    if(pageState.goto == Goto.Werklijst_uren_prevYear) {
        pageState.goto = Goto.None;
        saveGotoState(pageState);
        setCriteriaForTeacherHoursAndClickFetchButton(Schoolyear.toFullString(Schoolyear.calculateCurrent())).then(() => {});
        return;
    }
    if(pageState.goto == Goto.Werklijst_uren_nextYear) {
        pageState.goto = Goto.None;
        saveGotoState(pageState);
        setCriteriaForTeacherHoursAndClickFetchButton(Schoolyear.toFullString(Schoolyear.calculateCurrent()+1)).then(() => {});
        return;
    }
    pageState.werklijstTableName = "";
    saveGotoState(pageState);
    let btnWerklijstMaken = document.querySelector("#btn_werklijst_maken") as HTMLButtonElement;
    if(document.getElementById(def.UREN_PREV_BTN_ID))
        return;

    let year = parseInt(Schoolyear.getHighestAvailable());
    let prevSchoolyear = Schoolyear.toFullString(year-1);
    let nextSchoolyear = Schoolyear.toFullString(year);
    let prevSchoolyearShort = Schoolyear.toShortString(year-1);
    let nextSchoolyearShort = Schoolyear.toShortString(year);
    addButton(btnWerklijstMaken, def.UREN_PREV_BTN_ID, "Toon lerarenuren voor "+ prevSchoolyear, async () => { await setCriteriaForTeacherHoursAndClickFetchButton(prevSchoolyear); }, "", ["btn", "btn-outline-dark"], "Uren "+ prevSchoolyearShort);
    addButton(btnWerklijstMaken, def.UREN_PREV_SETUP_BTN_ID, "Setup voor "+ prevSchoolyear, async () => { await showUrenSetup(prevSchoolyear); }, "fas-certificate", ["btn", "btn-outline-dark"], "", "beforebegin", "gear.svg");
    addButton(btnWerklijstMaken, def.UREN_PREV_SETUP_BTN_ID+"sdf", "test", async () => { await sendMessageToHoursSettings(); }, "", ["btn", "btn-outline-dark"], "send");
    addButton(btnWerklijstMaken, def.UREN_NEXT_BTN_ID, "Toon lerarenuren voor "+ nextSchoolyear, async () => { await setCriteriaForTeacherHoursAndClickFetchButton(nextSchoolyear); }, "", ["btn", "btn-outline-dark"], "Uren "+ nextSchoolyearShort);
    getSchoolIdString();
}

chrome.runtime.onMessage.addListener(onMessage)
let pauseRefresh = false;

//reset the pause after some time, because otherwise, in case of an error, the page will no longer be refreshed.
setInterval(() => {
    pauseRefresh = false;
}, 2000);

async function onMessage(request: ServiceRequest, _sender: MessageSender, _sendResponse: (response?: any) => void) {
    if(globals.activeFetcher) {
        await globals.activeFetcher.cancel();
        pauseRefresh = false;
    }
    if(pauseRefresh)
        return;
    pauseRefresh = true;
    if(!globals.hourSettingsMapped)  {
        console.log("It seems the page hasn't been fully built yet. Start all over again.");
        await setCriteriaForTeacherHoursAndClickFetchButton(Schoolyear.findInPage());
        return;
    }
    let hourSettings = request.data as TeacherHoursSetup;

    let equalSelectedSubjects = arrayIsEqual(
        hourSettings.subjects.filter(s => s.checked).map(s => s.name),
        globals.hourSettingsMapped.subjects.filter(s => s.checked).map(s => s.name)
    );

    if(!equalSelectedSubjects) {
        setCriteriaForTeacherHoursAndClickFetchButton(hourSettings.schoolyear).then(_ => {
            pauseRefresh = false;
        });
    } else {
        globals.hourSettingsMapped = mapHourSettings(hourSettings);
        rebuildHoursTable(globals.table, globals.studentRowData, globals.hourSettingsMapped, globals.fromCloud);
        pauseRefresh = false;
    }
}

async function showUrenSetup(schoolyear: string) {
    let setup = await fetchHoursSettingsOrSaveDefault(schoolyear);
    let res = await openHoursSettings(setup);
    globalHoursSettingsTabId = res.tabId;
}

let globalHoursSettingsTabId: number;

async function sendMessageToHoursSettings() {
    sendRequest(Actions.GreetingsFromParent, TabType.Main, TabType.HoursSettings, globalHoursSettingsTabId, "Hello the main content script.").then(_ => {});
}

function onWerklijstChanged() {
    let werklijstPageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    if(werklijstPageState.werklijstTableName === def.UREN_TABLE_STATE_NAME) {
        tryUntil(onShowLerarenUren);
    }
    decorateTableHeader(document.querySelector("table#"+def.WERKLIJST_TABLE_ID) as HTMLTableElement);
}

function onButtonBarChanged() {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)") as HTMLButtonElement;
    addButton(targetButton, def.SHOW_HOURS_BUTTON_ID, "Toon telling", () => { toggleUrenTable(); }, "fa-guitar", ["btn-outline-info"]);
    addButton(targetButton, def.MAIL_BTN_ID, "Email to clipboard", onClickCopyEmails, "fa-envelope", ["btn", "btn-outline-info"]);
}

function onClickCopyEmails() {
    let requiredHeaderLabels = ["e-mailadressen"];

    let namedCellListener = new NamedCellTableFetchListener(requiredHeaderLabels, _tableDef1 => {
        navigator.clipboard.writeText("").then(_value => {
            console.log("Clipboard cleared.")
        });
    });

    let result = createDefaultTableFetcher();
    if("error" in result) {
        console.error(result.error);
        return;
    }

    let {tableFetcher, infoBar} = result.result;
    tableFetcher.addListener(namedCellListener);

    tableFetcher.fetch( )
        .then((fetchedTable) => {
            let allEmails = fetchedTable.getRowsAsArray()
                .map(tr=> namedCellListener.getColumnText(tr, "e-mailadressen"));

            let flattened = allEmails
                .map((emails: string) => emails.split(/[,;]/))
                .flat()
                .filter((email: string) => !email.includes("@academiestudent.be"))
                .filter((email: string) => email !== "");
            navigator.clipboard.writeText(flattened.join(";\n")).then(() =>
                infoBar.setTempMessage("Alle emails zijn naar het clipboard gekopieerd. Je kan ze plakken in Outlook.")
            );
        }).catch(reason => {
            console.log("Loading failed (gracefully.");
            console.log(reason);
    });
}

function tryUntil(func: () => boolean) {
    if(!func())
        setTimeout(() => tryUntil(func), 100);
}

function buildVakLeraarsMap(studentRowData: StudentUrenRow[], hourSettingsMapped: TeacherHoursSetupMapped) {
    let vakLeraars = new Map<string, VakLeraar>();
    for (let studentRow of studentRowData) {
        addStudentToVakLeraarsMap(studentRow, vakLeraars, hourSettingsMapped);
    }

    vakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : ((a[0] > b[0]) ? 1 : 0))) as Map<string, VakLeraar>;
    return vakLeraars;
}

type UrenGlobals = {
    activeFetcher: TableFetcher;
    studentRowData: StudentUrenRow[],
    hourSettingsMapped: TeacherHoursSetupMapped,
    fromCloud: CloudData,
    table: HTMLTableElement
}

let globals: UrenGlobals = {
    studentRowData: [],
    hourSettingsMapped: undefined,
    fromCloud: undefined,
    table: undefined,
    activeFetcher: undefined
};

function rebuildHoursTable(table: HTMLTableElement, studentRowData: StudentUrenRow[], hourSettingsMapped: TeacherHoursSetupMapped, fromCloud: CloudData) {
    let vakLeraars = buildVakLeraarsMap(studentRowData, hourSettingsMapped);
    let urenData: UrenData  = {
        year: parseInt(hourSettingsMapped.schoolyear),
        fromCloud: fromCloud,
        vakLeraars
    };
    observer.disconnect();
    refillTable(table, urenData);
    observer.observeElement(document.querySelector("main"));
    document.getElementById(def.HOURS_TABLE_ID).style.display = "none";
    showUrenTable(true);
}

function onShowLerarenUren() {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.HOURS_TABLE_ID)) {
        let result = createDefaultTableFetcher();
        if("error" in result) {
            console.log(result.error); //don't report as log.error.
            return false;
        }

        globals.activeFetcher = result.result.tableFetcher;
        globals.activeFetcher.addListener(createUrenFetchListener());

        setAfterDownloadTableAction(undefined); // Can't use this action to build the table as we're also fetching the cloud data.
        Promise.all([
            globals.activeFetcher.fetch(),
            getUrenFromCloud(getUrenVakLeraarFileName())
        ])
            .then(async results => {
                let [fetchedTable, jsonCloudData] = results;
                globals.activeFetcher = undefined;
                globals.hourSettingsMapped = mapHourSettings(await fetchHoursSettingsOrSaveDefault(Schoolyear.findInPage()));
                globals.fromCloud = new CloudData(upgradeCloudData(jsonCloudData));
                rebuildHoursTableAfterDownloadFullTable(fetchedTable.getRows(), fetchedTable.tableFetcher.tableRef);
            });

        return true;
    }
    showUrenTable(true);
    return true;
}

function createUrenFetchListener(): NamedCellTableFetchListener {
    let requiredHeaderLabels = ["naam", "voornaam", "vak", "klasleerkracht", "graad + leerjaar"];
    return new NamedCellTableFetchListener(requiredHeaderLabels, () => {});
}

function rebuildHoursTableAfterDownloadFullTable(rows: NodeListOf<HTMLTableRowElement>, tableRef: TableRef) {
    globals.studentRowData = scrapeUren(rows, NamedCellTableFetchListener.getHeaderIndices(tableRef.getOrgTableContainer() as HTMLDivElement));
    globals.table = createTable(tableRef);

    rebuildHoursTable(globals.table, globals.studentRowData, globals.hourSettingsMapped, globals.fromCloud);
}

async function getUrenFromCloud(fileName: string): Promise<JsonCloudData> {
    try {
        return await cloud.json.fetch(fileName);
    } catch (e) {
        return new JsonCloudData();
    }
}

function toggleUrenTable() {
    let showNewTable = document.getElementById(def.HOURS_TABLE_ID).style.display === "none";
    showUrenTable(showNewTable);
}

function showUrenTable(show: boolean) {
    if(show) {
        setAfterDownloadTableAction((fetchedTable) => {
            rebuildHoursTableAfterDownloadFullTable(fetchedTable.tableFetcher.tableRef.getOrgTableRows(), fetchedTable.tableFetcher.tableRef);
        });
    } else {
        setAfterDownloadTableAction(undefined);
    }
    document.getElementById(def.WERKLIJST_TABLE_ID).style.display = show ? "none" : "table";
    document.getElementById(def.HOURS_TABLE_ID).style.display = show ? "table" : "none";
    document.getElementById(def.SHOW_HOURS_BUTTON_ID).title = show ? "Toon normaal" : "Toon telling";
    setButtonHighlighted(def.SHOW_HOURS_BUTTON_ID, show);
    if (document.getElementById(def.HOURS_TABLE_ID)) {
        let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)") as HTMLButtonElement;
        addButton(targetButton, def.UREN_PREV_SETUP_BTN_ID, "Setup ", async () => {  await showUrenSetup(Schoolyear.findInPage()); }, "fas-certificate", ["btn", "btn-outline-dark"], "", "beforebegin", "gear.svg");
    }

    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    pageState.werklijstTableName = show ? def.UREN_TABLE_STATE_NAME : "";
    saveGotoState(pageState);
}

function upgradeCloudData(fromCloud: JsonCloudData) {
    //if fromCloud.version === "...." --> convert.
    return new JsonCloudData(fromCloud); //re-create, just to be sure we have all the fields.


}
