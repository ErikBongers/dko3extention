import {addButton, calculateSchooljaar, createSchoolyearString, createShortSchoolyearString, createTable, findSchooljaar, getHighestSchooljaarAvailable, getSchoolIdString, openTab, setButtonHighlighted} from "../globals";
import * as def from "../def";
import {buildTable, getUrenVakLeraarFileName} from "./buildUren";
import {scrapeStudent, VakLeraar} from "./scrapeUren";
import {cloud} from "../cloud";
import {findTableRefInCode, TableFetcher} from "../table/tableFetcher";
import {prefillInstruments} from "./prefillInstruments";
import {HashObserver} from "../pageObserver";
import {NamedCellTableFetchListener} from "../pageHandlers";
import {decorateTableHeader} from "../table/tableHeaders";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {registerChecksumHandler} from "../table/observer";
import {CloudData, JsonCloudData, UrenData} from "./urenData";
import {createDefaultTableFetcher} from "../table/loadAnyTable";

const tableId = "table_leerlingen_werklijst_table";

registerChecksumHandler(tableId,  (_tableDef: TableFetcher) => {
    return document.querySelector("#view_contents > div.alert.alert-primary")?.textContent.replace("Criteria aanpassen", "")?.replace("Criteria:", "") ?? ""
    }
    );

export default new HashObserver("#leerlingen-werklijst", onMutation);

function onMutation(mutation: MutationRecord) {
    if ((mutation.target as HTMLElement).id === "table_leerlingen_werklijst_table") {
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
        prefillInstruments(createSchoolyearString(calculateSchooljaar())).then(() => {});
        return;
    }
    if(pageState.goto == Goto.Werklijst_uren_nextYear) {
        pageState.goto = Goto.None;
        saveGotoState(pageState);
        prefillInstruments(createSchoolyearString(calculateSchooljaar()+1)).then(() => {});
        return;
    }
    pageState.werklijstTableName = "";
    saveGotoState(pageState);
    let btnWerklijstMaken = document.querySelector("#btn_werklijst_maken") as HTMLButtonElement;
    if(document.getElementById(def.UREN_PREV_BTN_ID))
        return;

    let year = parseInt(getHighestSchooljaarAvailable());
    let prevSchoolyear = createSchoolyearString(year-1);
    let nextSchoolyear = createSchoolyearString(year);
    let prevSchoolyearShort = createShortSchoolyearString(year-1);
    let nextSchoolyearShort = createShortSchoolyearString(year);
    addButton(btnWerklijstMaken, def.UREN_PREV_BTN_ID, "Toon lerarenuren voor "+ prevSchoolyear, async () => { await prefillInstruments(prevSchoolyear); }, "", ["btn", "btn-outline-dark"], "Uren "+ prevSchoolyearShort);
    addButton(btnWerklijstMaken, def.UREN_NEXT_BTN_ID, "Toon lerarenuren voor "+ nextSchoolyear, async () => { await prefillInstruments(nextSchoolyear); }, "", ["btn", "btn-outline-dark"], "Uren "+ nextSchoolyearShort);
    getSchoolIdString();
}



function onWerklijstChanged() {
    let werklijstPageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    if(werklijstPageState.werklijstTableName === def.UREN_TABLE_STATE_NAME) {
        tryUntil(onShowLerarenUren);
    }
    decorateTableHeader(document.querySelector("table#table_leerlingen_werklijst_table") as HTMLTableElement);
}

function onButtonBarChanged() {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)") as HTMLButtonElement;
    addButton(targetButton, def.COUNT_BUTTON_ID, "Toon telling", onShowLerarenUren, "fa-guitar", ["btn-outline-info"]);
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

function onShowLerarenUren() {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.COUNT_TABLE_ID)) {
        let result = createDefaultTableFetcher();
        if("error" in result) {
            console.log(result.error); //don't report as log.error.
            return false;
        }

        let {tableFetcher} = result.result;
        let fileName = getUrenVakLeraarFileName();
        let requiredHeaderLabels = ["naam", "voornaam", "vak", "klasleerkracht", "graad + leerjaar"];
        let tableFetchListener = new NamedCellTableFetchListener(requiredHeaderLabels, () => {});
        tableFetcher.addListener(tableFetchListener);

        Promise.all([tableFetcher.fetch(), getUrenFromCloud(fileName)]).then(results => {
            let [fetchedTable, jsonCloudData] = results;
            let vakLeraars = new Map();
            let rows = fetchedTable.getRows();
            let errors = [];
            for(let tr of rows) {
                let error = scrapeStudent(tableFetcher, tableFetchListener, tr, vakLeraars);
                if(error)
                    errors.push(error);
            }
            if(errors.length)
                openTab(createTable(["Error"], errors.map(error => [error])).outerHTML, "Errors");
            let fromCloud = upgradeCloudData(jsonCloudData);
            vakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : ((a[0] > b[0])? 1 : 0))) as Map<string, VakLeraar>;
            document.getElementById(def.COUNT_TABLE_ID)?.remove();
            let schoolYear = findSchooljaar();
            let year = parseInt(schoolYear);
            buildTable(new UrenData(year, new CloudData(fromCloud), vakLeraars), tableFetcher);
            document.getElementById(def.COUNT_TABLE_ID).style.display = "none";
            showOrHideNewTable();
        });

        return true;
    }
    showOrHideNewTable();
    return true;
}

async function getUrenFromCloud(fileName: string): Promise<JsonCloudData> {
    try {
        return await cloud.json.fetch(fileName);
    } catch (e) {
        return new JsonCloudData();
    }
}

function showOrHideNewTable() {
    let showNewTable = document.getElementById(def.COUNT_TABLE_ID).style.display === "none";
    document.getElementById("table_leerlingen_werklijst_table").style.display = showNewTable ? "none" : "table";
    document.getElementById(def.COUNT_TABLE_ID).style.display = showNewTable ? "table" : "none";
    document.getElementById(def.COUNT_BUTTON_ID).title = showNewTable ? "Toon normaal" : "Toon telling";
    setButtonHighlighted(def.COUNT_BUTTON_ID, showNewTable);
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    pageState.werklijstTableName = showNewTable ? def.UREN_TABLE_STATE_NAME : "";
    saveGotoState(pageState);
}

function upgradeCloudData(fromCloud: JsonCloudData) {
    //if fromCloud.version === "...." --> convert.
    return new JsonCloudData(fromCloud); //re-create, just to be sure we have all the fields.


}
