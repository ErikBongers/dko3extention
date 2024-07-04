import {addButton, getSchoolIdString, setButtonHighlighted} from "../globals.js";
import * as def from "../lessen/def.js";
import {buildTable, getUrenVakLeraarFileName, JsonCloudData, TheData} from "./buildUren.js";
import {scrapeStudent, VakLeraar} from "./scrapeUren.js";
import {fetchFromCloud} from "../cloud.js";
import {CalculateTableCheckSumHandler, IdTableRef, TableDef} from "../table/tableDef.js";
import {prefillInstruments} from "./prefillInstruments.js";
import {HashObserver} from "../pageObserver.js";
import {NamedCellPageHandler, RowObject} from "../pageHandlers.js";
import {findFirstNavigation} from "../table/tableNavigation.js";

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
        onPreparingFilter();
        return true;
    }
    return false;
}

function onPreparingFilter() {
    let btnWerklijstMaken = document.querySelector("#btn_werklijst_maken") as HTMLButtonElement;
    if(document.getElementById(def.PREFILL_INSTR_BTN_ID))
        return;

    addButton(btnWerklijstMaken, def.PREFILL_INSTR_BTN_ID, "Prefill instrumenten", prefillInstruments, "fa-guitar", ["btn", "btn-outline-dark"], "prefill ");
    getSchoolIdString();
}

let getCriteriaString: CalculateTableCheckSumHandler =  (tableDef: TableDef) => {
    return document.querySelector("#view_contents > div.alert.alert-info").textContent.replace("Criteria aanpassen", "").replace("Criteria:", "");
}

function onWerklijstChanged() {
    console.log("werklijst chqanged.");
}

function onButtonBarChanged() {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)") as HTMLButtonElement;
    addButton(targetButton, def.COUNT_BUTTON_ID, "Toon telling", onClickShowCounts, "fa-guitar", ["btn-outline-info"]);
    addButton(targetButton, def.MAIL_BTN_ID, "Email to clipboard", onClickCopyEmails, "fa-envelope", ["btn", "btn-outline-info"]);
}

// noinspection JSUnusedLocalSymbols
function scrapeEmails(_tableDef: TableDef, row: RowObject, collection: any) {
    collection.push(row.getColumnText("e-mailadressen"));
    return true;
}

function onClickCopyEmails() {
    let requiredHeaderLabels = ["e-mailadressen"];

    let pageHandler = new NamedCellPageHandler(requiredHeaderLabels, scrapeEmails, getData, onLoaded);

    let tableRef = new IdTableRef("table_leerlingen_werklijst_table", findFirstNavigation(),(offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0");
    let tableDef = new TableDef(
        tableRef,
        pageHandler,
        "werklijst",
        undefined
    );

    let theData = undefined;

    function getData() {
        return JSON.stringify(theData);
    }

    function onLoaded(tableDef: TableDef) {
        let flattened = tableDef.lastFetchResults
            .map((emails: string) => emails.split(/[,;]/))
            .flat()
            .filter((email: string) => !email.includes("@academiestudent.be"))
            .filter((email: string) => email !== "");
        console.log("email count: " + flattened.length);
        navigator.clipboard.writeText(flattened.join(";\n")).then();
        theData = flattened;
    }

    tableDef.getTableData([], undefined )
        .then((results) => { });
}

function onClickShowCounts() {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.COUNT_TABLE_ID)) {
        let fileName = getUrenVakLeraarFileName();

        console.log("reading: " + fileName);
        let requiredHeaderLabels = ["naam", "voornaam", "vak", "klasleerkracht", "graad + leerjaar"];
        let pageHandler = new NamedCellPageHandler(requiredHeaderLabels, scrapeStudent, getData, onLoaded);
        let tableRef = new IdTableRef("table_leerlingen_werklijst_table", findFirstNavigation(),(offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0");
        let tableDef = new TableDef(
            tableRef,
            pageHandler,
            def.COUNT_TABLE_ID,
            getCriteriaString
        );

        let theData = {
            vakLeraars: undefined,
            fromCloud: undefined
        };

        //https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
        function getData(tableDef: TableDef) {
            function replacer(key, value) {
                if(value instanceof Map) {
                    return {
                        dataType: 'Map',
                        value: Array.from(value.entries()), // or with spread: value: [...value]
                    };
                } else {
                    return value;
                }
            }
            return JSON.stringify(theData, replacer); //TODO: build a stringify function that can handle Map data.
/*
 function reviver(key, value) {
  if(typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}
 */
        }

        function onLoaded(tableDef: TableDef) {
            let vakLeraars = tableDef.lastFetchResults[0];
            theData.fromCloud = tableDef.lastFetchResults[1] as JsonCloudData;
            theData.fromCloud = upgradeCloudData(theData.fromCloud);
            theData.vakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : ((a[0] > b[0])? 1 : 0))) as Map<string, VakLeraar>;
            buildTable(theData);
            document.getElementById(def.COUNT_TABLE_ID).style.display = "none";
            showOrHideNewTable();

        }

        tableDef.getTableData(
            new Map(),
            () => fetchFromCloud(fileName))
            .then((results) => {
            });
        return;
    }
    showOrHideNewTable();
}

function showOrHideNewTable() {
    let showNewTable = document.getElementById(def.COUNT_TABLE_ID).style.display === "none";
    document.getElementById("table_leerlingen_werklijst_table").style.display = showNewTable ? "none" : "table";
    document.getElementById(def.COUNT_TABLE_ID).style.display = showNewTable ? "table" : "none";
    document.getElementById(def.COUNT_BUTTON_ID).title = showNewTable ? "Toon normaal" : "Toon telling";
    setButtonHighlighted(def.COUNT_BUTTON_ID, showNewTable);
}

function upgradeCloudData(fromCloud: JsonCloudData) {
    //if fromCloud.version === "...." --> convert.
    return fromCloud;
}
