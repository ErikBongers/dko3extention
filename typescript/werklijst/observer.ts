import {addButton, calculateSchooljaar, createSchoolyearString, createShortSchoolyearString, findSchooljaar, getHighestSchooljaarAvailable, getSchoolIdString, setButtonHighlighted} from "../globals";
import * as def from "../def";
import {buildTable, createJsonCloudData, getUrenVakLeraarFileName, JsonCloudData} from "./buildUren";
import {scrapeStudent, VakLeraar} from "./scrapeUren";
import {cloud} from "../cloud";
import {FetchedTable, findTableRefInCode, TableDef} from "../table/tableDef";
import {prefillInstruments} from "./prefillInstruments";
import {HashObserver} from "../pageObserver";
import {NamedCellTablePageHandler} from "../pageHandlers";
import {addTableHeaderClickEvents} from "../table/tableHeaders";
import {getPageStateOrDefault, Goto, PageName, savePageState, WerklijstPageState} from "../pageState";
import {getChecksumHandler, registerChecksumHandler} from "../table/observer";

const tableId = "table_leerlingen_werklijst_table";

registerChecksumHandler(tableId,  (_tableDef: TableDef) => {
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
    let pageState = getPageStateOrDefault(PageName.Werklijst) as WerklijstPageState;
    if(pageState.goto == Goto.Werklijst_uren_prevYear) {
        pageState.goto = Goto.None;
        savePageState(pageState);
        prefillInstruments(createSchoolyearString(calculateSchooljaar())).then(() => {});
        return;
    }
    if(pageState.goto == Goto.Werklijst_uren_nextYear) {
        pageState.goto = Goto.None;
        savePageState(pageState);
        prefillInstruments(createSchoolyearString(calculateSchooljaar()+1)).then(() => {});
        return;
    }
    pageState.werklijstTableName = "";
    savePageState(pageState);
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
    let werklijstPageState = getPageStateOrDefault(PageName.Werklijst) as WerklijstPageState;
    if(werklijstPageState.werklijstTableName === def.UREN_TABLE_STATE_NAME) {
        tryUntil(onClickShowCounts);
    }
    addTableHeaderClickEvents(document.querySelector("table#table_leerlingen_werklijst_table") as HTMLTableElement);
}

function onButtonBarChanged() {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)") as HTMLButtonElement;
    addButton(targetButton, def.COUNT_BUTTON_ID, "Toon telling", onClickShowCounts, "fa-guitar", ["btn-outline-info"]);
    addButton(targetButton, def.MAIL_BTN_ID, "Email to clipboard", onClickCopyEmails, "fa-envelope", ["btn", "btn-outline-info"]);
}

function onClickCopyEmails() {
    let requiredHeaderLabels = ["e-mailadressen"];

    let pageHandler = new NamedCellTablePageHandler(requiredHeaderLabels, onEmailsLoaded, tableDef1 => {
        navigator.clipboard.writeText("").then(value => {
            console.log("Clipboard cleared.")
        });
    });

    let tableDef = new TableDef(
        findTableRefInCode(),
        pageHandler,
        getChecksumHandler(tableId)
    );

    function onEmailsLoaded(fetchedTable: FetchedTable) {
        let allEmails = this.rows = fetchedTable.getRowsAsArray()
            .map(tr=> (tableDef.pageHandler as NamedCellTablePageHandler).getColumnText(tr, "e-mailadressen"));

        let flattened = allEmails
            .map((emails: string) => emails.split(/[,;]/))
            .flat()
            .filter((email: string) => !email.includes("@academiestudent.be"))
            .filter((email: string) => email !== "");
        navigator.clipboard.writeText(flattened.join(";\n")).then(() =>
            tableDef.setTempMessage("Alle emails zijn naar het clipboard gekopieerd. Je kan ze plakken in Outlook.")
        );
    }

    tableDef.getTableData(undefined )
        .then((_results) => {
        });
}

function tryUntil(func: () => boolean) {
    if(!func())
        setTimeout(() => tryUntil(func), 100);
}

function onClickShowCounts() {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.COUNT_TABLE_ID)) {
        let tableRef = findTableRefInCode();
        if(!tableRef)
            return false;

        let fileName = getUrenVakLeraarFileName();
        let requiredHeaderLabels = ["naam", "voornaam", "vak", "klasleerkracht", "graad + leerjaar"];
        let pageHandler = new NamedCellTablePageHandler(requiredHeaderLabels, onLoaded, () => {});
        let tableDef = new TableDef(
            tableRef,
            pageHandler,
            getChecksumHandler(tableRef.htmlTableId)
        );

        function onLoaded(fetchedTable: FetchedTable) {
            let vakLeraars = new Map();
            let rows = this.rows = fetchedTable.getRows();
            for(let tr of rows) {
                scrapeStudent(tableDef, tr, vakLeraars);//TODO: returns false if fails. Report error.
            }
            let fromCloud = tableDef.parallelData as JsonCloudData;
            fromCloud = upgradeCloudData(fromCloud);
            vakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : ((a[0] > b[0])? 1 : 0))) as Map<string, VakLeraar>;
            document.getElementById(def.COUNT_TABLE_ID)?.remove();
            let schoolYear = findSchooljaar();
            let year = parseInt(schoolYear);
            buildTable({year, vakLeraars, fromCloud}, tableDef);
            document.getElementById(def.COUNT_TABLE_ID).style.display = "none";
            showOrHideNewTable();
        }

        tableDef.getTableData(() => getUrenFromCloud(fileName))
            .then((_results) => { });

        return true;
    }
    showOrHideNewTable();
    return true;
}

async function getUrenFromCloud(fileName: string) {
    try {
        return await cloud.json.fetch(fileName);
    } catch (e) {
        return createJsonCloudData();
    }
}

function showOrHideNewTable() {
    let showNewTable = document.getElementById(def.COUNT_TABLE_ID).style.display === "none";
    document.getElementById("table_leerlingen_werklijst_table").style.display = showNewTable ? "none" : "table";
    document.getElementById(def.COUNT_TABLE_ID).style.display = showNewTable ? "table" : "none";
    document.getElementById(def.COUNT_BUTTON_ID).title = showNewTable ? "Toon normaal" : "Toon telling";
    setButtonHighlighted(def.COUNT_BUTTON_ID, showNewTable);
    let pageState = getPageStateOrDefault(PageName.Werklijst) as WerklijstPageState;
    pageState.werklijstTableName = showNewTable ? def.UREN_TABLE_STATE_NAME : "";
    savePageState(pageState);
}

function upgradeCloudData(fromCloud: JsonCloudData) {
    //if fromCloud.version === "...." --> convert.
    return fromCloud;


}
