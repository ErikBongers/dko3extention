import { addButton } from "../globals.js";
import * as def from "../lessen/def.js";
import { AllPageFilter, BaseObserver } from "../pageObserver.js";
import { PrebuildTableHandler } from "../pageHandlers.js";
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
    let prebuildPageHandler = new PrebuildTableHandler(onLoaded, onBeforeLoading, onData);
    function onBeforeLoading(tableDef) {
        tableDef.tableRef.getOrgTable().querySelector("tbody").innerHTML = "";
    }
    function onData(tableDef) {
        return 'TODO';
    }
    function onLoaded(_tableDef) {
        let template = tableDef.shadowTableTemplate;
        tableDef.tableRef.getOrgTable()
            .querySelector("tbody")
            .replaceChildren(...template.content.querySelectorAll("tbody tr"));
    }
    let tableRef = new IdTableRef("table_leerlingen_werklijst_table", findFirstNavigation(), (offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0");
    let tableDef = new TableDef(tableRef, prebuildPageHandler, "werklijst", undefined);
    tableDef.getTableData(undefined, undefined).then(() => {
        console.log("Fetch complete!");
    });
}
//# sourceMappingURL=observer.js.map