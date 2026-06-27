import {addButton, arrayIsEqual, copyToClipboardOrRequestRetry, getSchoolIdString, openHoursSettings, Schoolyear, tryUntilThen} from "../globals";
import * as def from "../def";
import {BTN_WERKLIJST_NAV_BOTTOM} from "../def";
import {refillTable} from "./buildUren";
import {addStudentToVakLeraarsMap, StudentUrenRow, VakLeraar} from "./scrapeUren";
import {TableFetcher} from "../table/tableFetcher";
import {fetchHoursSettingsOrSaveDefault} from "./prefillInstruments";
import {HashObserver} from "../pageObserver";
import {NamedCellTableFetchListener, NotHTMLTemplate} from "../pageHandlers";
import {decorateTableHeader} from "../table/tableHeaders";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {registerChecksumHandler} from "../table/observer";
import {CloudData, UrenData} from "./urenData";
import {createDefaultTableFetcher, createDefaultTableRefAndInfoBlock} from "../table/loadAnyTable";
import {Actions, sendRequest, ServiceRequest, TabType} from "../messaging";
import {TeacherHoursSetup, TeacherHoursSetupMapped} from "./hoursSettings";
import {getJaarToewijzigingWerklijst} from "../lessen/observer";
import {emmet} from "../../libs/Emmeter/html";
import {createInfoBlock} from "../infoBlock";
import {fetchMailMergeData} from "../table/mailMerge";
import {TeacherHoursCachedState} from "./teacherHoursCachedState";
import MessageSender = chrome.runtime.MessageSender;

const TARGET_BUTTON_ID = "#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)";

registerChecksumHandler(def.WERKLIJST_TABLE_ID,  (tableDef: TableFetcher) => {
    let headers = NamedCellTableFetchListener.getHeaderIndices(tableDef.tableRef.getOrgTableContainer() as NotHTMLTemplate);
    let fields = [...headers].map(([key, value]) => key);
    let criteria =  document.querySelector("#view_contents > div.alert.alert-info")
        ?.textContent.replace("Criteria aanpassen", "")
        ?.replace("Criteria:", "") ?? "";
    return criteria + "__" + fields.join("_");
    }
);

class WerklijstObserver extends HashObserver {
    constructor() {
        super("#leerlingen-werklijst", onMutation, false, onPageReallyLoaded);
    }
    isPageReallyLoaded()  {
        return isPageReallyLoaded();
    }
}

let observer = new WerklijstObserver();
export default observer;

/*
Werklijst has 2 incarnations:
  * Criteria selection (hash #leerlingen-werklijst)
  * Result (hash #leerlingen-werklijst$werklijst)

Unforunatelly hash changes don't cause a page reload, therefore of limited use.

*/

let pageIncarnationChanged = true;
window.addEventListener("hashchange", () => { pageIncarnationChanged = true;});

function isPageReallyLoaded()  {
    if (document.querySelector(def.BTN_WERKLIJST_MAKEN_ID))
        return true;
    if (document.getElementById(BTN_WERKLIJST_NAV_BOTTOM)
        && document.querySelector(TARGET_BUTTON_ID))
        return true;
    return false;
}

function onPageReallyLoaded() {
    onAnyChangeEvent();
}

function onAnyChangeEvent() {
    if(!pageIncarnationChanged){
        return;
    }
    pageIncarnationChanged = false;
    console.log("onAnyChangeEvent");
    if (document.querySelector(def.BTN_WERKLIJST_MAKEN_ID)) {
        onCriteriaShown();
    } else if (document.getElementById(def.BTN_WERKLIJST_NAV_BOTTOM)) {
        addButtons();
        decorateTableHeader(document.querySelector("table#"+def.WERKLIJST_TABLE_ID) as HTMLTableElement, true);
    }
}

function onMutation(mutation: MutationRecord) {
    console.log("onMutation");
    tryUntilThen(isPageReallyLoaded, onAnyChangeEvent);
    return true;
}

function onCriteriaShown() {
    console.log("onCriteriaShown");
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    if(pageState.goto == Goto.Werklijst_uren_prevYear) {
        pageState.goto = Goto.None;
        saveGotoState(pageState);
        fetchAndShowTeacherHours(Schoolyear.toFullString(Schoolyear.calculateCurrent())).then(() => {});
        return;
    }
    if(pageState.goto == Goto.Werklijst_uren_nextYear) {
        pageState.goto = Goto.None;
        saveGotoState(pageState);
        fetchAndShowTeacherHours(Schoolyear.toFullString(Schoolyear.calculateCurrent()+1)).then(() => {});
        return;
    }
    pageState.werklijstTableName = "";
    saveGotoState(pageState);
    let btnWerklijstMakenWrapper = document.querySelector(def.BTN_WERKLIJST_MAKEN_WRAPPER_ID) as HTMLDivElement;
    if(btnWerklijstMakenWrapper) {
        return;
    }

    let btnWerklijstMaken = document.querySelector(def.BTN_WERKLIJST_MAKEN_ID) as HTMLButtonElement;
    btnWerklijstMakenWrapper = emmet.insertBefore(btnWerklijstMaken, `div#${def.BTN_WERKLIJST_MAKEN_WRAPPER_ID}.werklijstButtonWrapper`).first as HTMLDivElement;
    btnWerklijstMakenWrapper.appendChild(btnWerklijstMaken);

    let schoolYear = Schoolyear.getHighestAvailable();
    if(!schoolYear) {
        alert("Geen schooljaar gevonden!");
        return;
    }
    let year = parseInt(schoolYear);
    let prevSchoolyear = Schoolyear.toFullString(year-1);
    let nextSchoolyear = Schoolyear.toFullString(year);
    let prevSchoolyearShort = Schoolyear.toShortString(year-1);
    let nextSchoolyearShort = Schoolyear.toShortString(year);
    addButton(btnWerklijstMaken, def.WERKLIJST_MAILMERGE_BTN_ID, "Mail merge", async () => { await mailMergeStartSchoolyear(); }, "", ["btn", "btn-outline-dark"], "Mailmerge");
    addButton(btnWerklijstMaken, def.UREN_PREV_BTN_ID, "Toon lerarenuren voor "+ prevSchoolyear, async () => { await fetchAndShowTeacherHours(prevSchoolyear); }, "", ["btn", "btn-outline-dark"], "Uren "+ prevSchoolyearShort);
    addButton(btnWerklijstMaken, def.UREN_PREV_SETUP_BTN_ID, "Setup voor "+ nextSchoolyear, async () => { await showUrenSetup(nextSchoolyear); }, "fas-certificate", ["btn", "btn-outline-dark"], "", "beforebegin", "gear.svg");
    addButton(btnWerklijstMaken, def.UREN_PREV_SETUP_BTN_ID+"sdf", "test", async () => { await sendGreetingsToHoursSettings(); }, "", ["btn", "btn-outline-dark"], "send");
    addButton(btnWerklijstMaken, def.UREN_NEXT_BTN_ID, "Toon lerarenuren voor "+ nextSchoolyear, async () => { await fetchAndShowTeacherHours(nextSchoolyear); }, "", ["btn", "btn-outline-dark"], "Uren "+ nextSchoolyearShort);

    addButton(btnWerklijstMaken, "test123", "Test 123", test123, "", ["btn", "btn-outline-dark"], "Test 123");

    document.getElementById("btn_leerling_werklijst_reset")!.addEventListener("click", resetPageIncarnationChangedFlag);

    getSchoolIdString();
}

function resetPageIncarnationChangedFlag() {
    pageIncarnationChanged = true;
}

async function test123() {
    let table = await getJaarToewijzigingWerklijst(Schoolyear.findInPage());
    console.log([...table.getRows()].map(row => row.textContent));
}

chrome.runtime.onMessage.addListener(onMessage)
let pauseRefresh = false;

//reset the pause after some time, because otherwise, in case of an error, the page will no longer be refreshed.
setInterval(() => {
    pauseRefresh = false;
}, 2000);

async function onMessage(request: ServiceRequest<any>, _sender: MessageSender, sendResponse: (response?: any) => void) {
    if(request.senderTabType != TabType.HoursSettings)
        return;
    if(request.action == Actions.RequestTabData) {
        console.log("Requesting tab data", request.data);
        let setup = await fetchHoursSettingsOrSaveDefault(request.data.params.schoolYear);
        console.log(setup);
        await sendMessageToHoursSettings(Actions.TabData, setup);
        return;
    }
    // if(globals.activeFetcher) {
    //     //todo await globals.activeFetcher.cancel();
    //     pauseRefresh = false;
    // }
    if(pauseRefresh)
        return;
    pauseRefresh = true;
    let hourSettings = request.data as TeacherHoursSetup;

    if(!globals)
        return; //oops...
    let equalSelectedSubjects = arrayIsEqual(
        hourSettings.subjects.filter(s => s.checked).map(s => s.name),
        (await globals.getHourSettingsMapped()).subjects.filter(s => s.checked).map(s => s.name)
    );

    if(!equalSelectedSubjects) {
        fetchAndShowTeacherHours(hourSettings.schoolyear).then(_ => {
            pauseRefresh = false;
        });
    } else {
        globals.setHourSettings(hourSettings);
        rebuildHoursTable(await globals.getStudentRowData(), await globals.getHourSettingsMapped(), await globals.getFromCloud());
        pauseRefresh = false;
    }
}

async function showUrenSetup(schoolyear: string) {
    let res = await openHoursSettings(schoolyear);
    globalHoursSettingsTabId = res.tabId;
}

let globalHoursSettingsTabId: number;

async function sendMessageToHoursSettings(action: Actions, data: any) {
    return sendRequest(action, TabType.Main, TabType.HoursSettings, globalHoursSettingsTabId, data);
}

async function sendGreetingsToHoursSettings() {
    sendRequest(Actions.GreetingsFromParent, TabType.Main, TabType.HoursSettings, globalHoursSettingsTabId, "Hello the main content script.").then(_ => {});
}

function addButtons() {
    let targetButton = document.querySelector(TARGET_BUTTON_ID) as HTMLButtonElement;
    addButton(targetButton, def.MAIL_BTN_ID, "Email to clipboard", onClickCopyEmails, "fa-envelope", ["btn", "btn-outline-info"]);
}

function onClickCopyEmails() {
    let requiredHeaderLabels = ["e-mailadressen"];

    let namedCellListener = new NamedCellTableFetchListener(requiredHeaderLabels, _tableDef1 => {
        navigator.clipboard.writeText("").then(_value => {
            console.log("Clipboard cleared.")
        });
    });

    let result = createDefaultTableRefAndInfoBlock();
    if("error" in result) {
        console.error(result.error);
        return;
    }
    let {tableRef, infoBlock} = result.result;

    let result2 = createDefaultTableFetcher(tableRef, infoBlock);
    if("error" in result2) {
        console.error(result2.error);
        return;
    }

    let {tableFetcher} = result2.result;
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
            flattened = [...new Set(flattened)];
            navigator.clipboard.writeText(flattened.join(";\n")).then(() =>
                infoBlock.infoBar.setTempMessage("Alle emails zijn naar het clipboard gekopieerd. Je kan ze plakken in Outlook.")
            );
        }).catch(reason => {
            console.log("Loading failed (gracefully.");
            console.log(reason);
    });
}

function buildVakLeraarsMap(studentRowData: StudentUrenRow[], hourSettingsMapped: TeacherHoursSetupMapped) {
    let vakLeraars = new Map<string, VakLeraar>();
    for (let studentRow of studentRowData) {
        addStudentToVakLeraarsMap(studentRow, vakLeraars, hourSettingsMapped);
    }

    vakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : ((a[0] > b[0]) ? 1 : 0))) as Map<string, VakLeraar>;
    return vakLeraars;
}

let globals: TeacherHoursCachedState | null = null;

function rebuildHoursTable(studentRowData: StudentUrenRow[], hourSettingsMapped: TeacherHoursSetupMapped, fromCloud: CloudData) {
    document.getElementById(def.HOURS_TABLE_ID)?.remove();
    let table = emmet.create("#view_contents>table").last as HTMLTableElement; //todo: make a breaking change for this function. It's API sucks. It appends an element to a selector. Perhaps even remove this function.
    table.id = def.HOURS_TABLE_ID;
    table.classList.add(def.CAN_SORT, def.NO_MENU);
    let vakLeraars = buildVakLeraarsMap(studentRowData, hourSettingsMapped);
    let urenData: UrenData  = {
        year: parseInt(hourSettingsMapped.schoolyear),
        fromCloud: fromCloud,
        vakLeraars
    };
    observer.disconnect();
    refillTable(table, urenData);
    observer.observeElement(document.querySelector("main")!);
}

async function rebuildHoursTableAfterFetch(schoolYear: string) {
    if(!globals)
        globals = new TeacherHoursCachedState(schoolYear);

    rebuildHoursTable(await globals.getStudentRowData(), await globals.getHourSettingsMapped(), await globals.getFromCloud());
}

async function mailMergeStartSchoolyear() {
    let schoolyear = Schoolyear.findInPage();
    if(!schoolyear) {
        alert("Geen schooljaar gevonden!");
        return;
    }
    let divFooter = document.getElementById("div_leerling_werklijst_footer") as HTMLDivElement;
    let divInfo = divFooter.insertAdjacentElement("afterend", document.createElement("div")) as HTMLDivElement;
    let infoBlock = createInfoBlock(divInfo, "");
    let selectedFields = scrapeSelectedFieldIndexes();
    let text = await fetchMailMergeData(schoolyear, infoBlock, selectedFields, hasWerklijstNoCriteria(), scrapeCriteria());
    if(text != "") {
        copyToClipboardOrRequestRetry(infoBlock.infoBar, text);
        //todo: rebuild criteria.
        infoBlock.infoBar.setInfoLine("HERLAAD WEBPAGINA VOOR JE OPNIEUW EEN MAILMERGE DOET! (sorry)");
    }
}

function scrapeSelectedFieldIndexes() {
    let rows = document.querySelectorAll("#tbody_leerlingen_werklijst_velden > tr");
    return [...rows].map(row => {
        let cells = row.querySelectorAll("td");
        return cells[1].textContent.trim();
    });
}

function scrapeCriteria() {
    let rows = document.querySelectorAll("#tbody_leerlingen_werklijst_criteria > tr") as NodeListOf<HTMLTableRowElement>;
    let criteria: string[] = [...rows].map(tr => {
        let id = tr.dataset.criterium_id;
        let select = tr.cells[1].querySelector("select") as HTMLSelectElement;
        let operator = select?.value ?? "";
        let value = "-null-";
        let selectionRenderedSpan = tr.cells[2].querySelector("span.select2-selection__rendered") as HTMLSpanElement;
        if(selectionRenderedSpan) {
            value = selectionRenderedSpan.getAttribute("title") ?? "-null-";
            let options = tr.cells[2].querySelectorAll(".select2 option") as NodeListOf<HTMLOptionElement>;
            let selectedOption = [...options].find(option => option.textContent === value);
            value = selectedOption?.getAttribute("value") ?? "-null-";
        } else {
            let selectionRenderedUl = tr.cells[2].querySelector("ul.select2-selection__rendered") as HTMLUListElement;
            value = [...selectionRenderedUl.querySelectorAll("li.select2-selection__choice") as NodeListOf<HTMLLIElement>].map(li => li.title).join(",");
        }
        return id + "_" + operator + "_" + value;
    });
    return criteria.join("_");
}

function hasWerklijstNoCriteria() {
    let rows = document.querySelectorAll("#tbody_leerlingen_werklijst_criteria > tr") as NodeListOf<HTMLTableRowElement>;
    let ids = [...rows].map(tr =>  tr.dataset.criterium_id);
    return ids.length === 2 && ["1", "2"].every(value => ids.includes(value));
}

async function fetchAndShowTeacherHours(schooljaar: string) {
    let divViewContents = document.getElementById("view_contents") as HTMLDivElement;
    divViewContents.classList.add("hideWerklijst");
    await rebuildHoursTableAfterFetch(schooljaar);
}

