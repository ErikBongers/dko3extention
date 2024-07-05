import { addButton, getSchoolIdString, setButtonHighlighted } from "../globals.js";
import * as def from "../def.js";
import { buildTable, getUrenVakLeraarFileName } from "./buildUren.js";
import { scrapeStudent } from "./scrapeUren.js";
import { fetchFromCloud } from "../cloud.js";
import { TableDef, findTableRefInCode } from "../table/tableDef.js";
import { prefillInstruments } from "./prefillInstruments.js";
import { HashObserver } from "../pageObserver.js";
import { NamedCellPageHandler } from "../pageHandlers.js";
export default new HashObserver("#leerlingen-werklijst", onMutation);
function onMutation(mutation) {
    if (mutation.target.id === "table_leerlingen_werklijst_table") {
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
    let btnWerklijstMaken = document.querySelector("#btn_werklijst_maken");
    if (document.getElementById(def.PREFILL_INSTR_BTN_ID))
        return;
    addButton(btnWerklijstMaken, def.PREFILL_INSTR_BTN_ID, "Prefill instrumenten", prefillInstruments, "fa-guitar", ["btn", "btn-outline-dark"], "prefill ");
    getSchoolIdString();
}
let getCriteriaString = (_tableDef) => {
    return document.querySelector("#view_contents > div.alert.alert-info").textContent.replace("Criteria aanpassen", "").replace("Criteria:", "");
};
function onWerklijstChanged() {
    console.log("werklijst chqanged.");
}
function onButtonBarChanged() {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)");
    addButton(targetButton, def.COUNT_BUTTON_ID, "Toon telling", onClickShowCounts, "fa-guitar", ["btn-outline-info"]);
    addButton(targetButton, def.MAIL_BTN_ID, "Email to clipboard", onClickCopyEmails, "fa-envelope", ["btn", "btn-outline-info"]);
}
function onClickCopyEmails() {
    let requiredHeaderLabels = ["e-mailadressen"];
    let pageHandler = new NamedCellPageHandler(requiredHeaderLabels, onLoaded);
    let tableDef = new TableDef(findTableRefInCode(), pageHandler, undefined);
    function onLoaded(tableDef) {
        let rows = this.rows = tableDef.shadowTableTemplate.content.querySelectorAll("tbody > tr");
        let allEmails = Array.from(rows)
            .map(tr => tableDef.pageHandler.getColumnText(tr, "e-mailadressen"));
        let flattened = allEmails
            .map((emails) => emails.split(/[,;]/))
            .flat()
            .filter((email) => !email.includes("@academiestudent.be"))
            .filter((email) => email !== "");
        console.log("email count: " + flattened.length);
        navigator.clipboard.writeText(flattened.join(";\n")).then(() => alert("Alle emails zijn naar het clipboard gekopieerd. Je kan ze plakken in Outlook."));
    }
    tableDef.getTableData([], undefined)
        .then((_results) => {
    });
}
function onClickShowCounts() {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.COUNT_TABLE_ID)) {
        let fileName = getUrenVakLeraarFileName();
        let requiredHeaderLabels = ["naam", "voornaam", "vak", "klasleerkracht", "graad + leerjaar"];
        let pageHandler = new NamedCellPageHandler(requiredHeaderLabels, onLoaded);
        let tableDef = new TableDef(findTableRefInCode(), pageHandler, getCriteriaString);
        function onLoaded(tableDef) {
            let vakLeraars = new Map();
            let rows = this.rows = tableDef.shadowTableTemplate.content.querySelectorAll("tbody > tr");
            for (let tr of rows) {
                scrapeStudent(tableDef, tr, vakLeraars); //TODO: returns false if fails. Report error.
            }
            let fromCloud = tableDef.parallelData;
            fromCloud = upgradeCloudData(fromCloud);
            vakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : ((a[0] > b[0]) ? 1 : 0)));
            buildTable({ vakLeraars, fromCloud }, tableDef);
            document.getElementById(def.COUNT_TABLE_ID).style.display = "none";
            showOrHideNewTable();
        }
        tableDef.getTableData(new Map(), () => fetchFromCloud(fileName))
            .then((_results) => { });
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
function upgradeCloudData(fromCloud) {
    //if fromCloud.version === "...." --> convert.
    return fromCloud;
}
//# sourceMappingURL=observer.js.map