import { addButton } from "../globals.js";
import * as def from "../lessen/def.js";
import { AllPageFilter, BaseObserver } from "../pageObserver.js";
import { RowPageHandler } from "../pageHandlers.js";
import { IdTableRef, TableDef } from "./tableDef.js";
import { findFirstNavigation } from "./tableNavigation.js";
export default new BaseObserver(undefined, new AllPageFilter(), onMutation);
function onMutation(_mutation) {
    let navigationBar = document.querySelector("div.datatable-navigation-toolbar");
    if (!navigationBar)
        return false;
    addButton(navigationBar.lastElementChild, def.DOWNLOAD_TABLE_BTN_ID, "download full table", downloadTable, "fa-arrow-down", ["btn-secondary"], "", "afterend");
    return true;
}
function downloadTable() {
    let rowPageHandler = new RowPageHandler(onRow, onLoading, onBeforeLoading, onData);
    function onBeforeLoading(tableDef) {
        tableDef.tableRef.getOrgTable().querySelector("tbody").innerHTML = "";
    }
    function onRow(tableDef, rowObject, _collection) {
        let tbody = tableDef.tableRef.getOrgTable().querySelector("tbody");
        tbody.appendChild(rowObject.tr);
        return true;
    }
    function onData(tableDef) {
        return tableDef.tableRef.getOrgTable().querySelector("tbody").innerHTML;
    }
    function onLoading(tableDef) {
        //nothing to do. The data is the tbody content.
    }
    let tableRef = new IdTableRef("table_leerlingen_werklijst_table", findFirstNavigation(), (offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0");
    let tableDef = new TableDef(tableRef, rowPageHandler, "werklijst", "", "");
    tableDef.fetchFullTable(undefined, undefined).then(() => {
        console.log("Fetch complete!");
    });
}
