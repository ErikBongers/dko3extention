import { addButton } from "../globals.js";
import * as def from "../def.js";
import { AllPageFilter, BaseObserver } from "../pageObserver.js";
import { SimpleTableHandler } from "../pageHandlers.js";
import { findTableRefInCode, TableDef } from "./tableDef.js";
import { addTableHeaderClickEvents } from "./tableHeaders.js";
export default new BaseObserver(undefined, new AllPageFilter(), onMutation);
function onMutation(_mutation) {
    let navigationBar = document.querySelector("div.datatable-navigation-toolbar");
    if (!navigationBar)
        return false;
    addButton(navigationBar.lastElementChild, def.DOWNLOAD_TABLE_BTN_ID, "download full table", downloadTable, "fa-arrow-down", ["btn-secondary"], "", "afterend");
    if (document.querySelector("main div.table-responsive table thead")) {
        addTableHeaderClickEvents(document.querySelector("main div.table-responsive table"));
    }
    return true;
}
function downloadTable() {
    let prebuildPageHandler = new SimpleTableHandler(onLoaded, undefined);
    function onLoaded(tableDef) {
        let template = tableDef.shadowTableTemplate;
        tableDef.tableRef.getOrgTable()
            .querySelector("tbody")
            .replaceChildren(...template.content.querySelectorAll("tbody tr"));
    }
    // let tableRef = new TableRef("table_leerlingen_werklijst_table", findFirstNavigation(),(offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0");
    let tableRef = findTableRefInCode();
    let tableDef = new TableDef(tableRef, prebuildPageHandler, undefined);
    tableDef.getTableData().then(() => {
        console.log("Fetch complete!");
    });
}
//# sourceMappingURL=observer.js.map