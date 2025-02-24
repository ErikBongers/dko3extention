import {addButton} from "../globals";
import * as def from "../def";
import {AllPageFilter, BaseObserver} from "../pageObserver";
import {SimpleTableHandler} from "../pageHandlers";
import {findTableRefInCode, TableDef} from "./tableDef";
import {addTableHeaderClickEvents} from "./tableHeaders";
import {getCriteriaString} from "../werklijst/observer";

export default new BaseObserver(undefined, new AllPageFilter(), onMutation);

function onMutation (_mutation: MutationRecord) {
    let navigationBar = document.querySelector("div.datatable-navigation-toolbar") as HTMLElement;
    if(!navigationBar)
        return false;
    if(!findTableRefInCode()?.navigationData.isOnePage()) {
        addButton(navigationBar.lastElementChild as HTMLElement, def.DOWNLOAD_TABLE_BTN_ID, "download full table", downloadTable, "fa-arrow-down", ["btn-secondary"], "", "afterend");
    }
    if(document.querySelector("main div.table-responsive table thead")) {
        addTableHeaderClickEvents(document.querySelector("main div.table-responsive table"));
    }
    let customTable = document.querySelector("table.canSort") as HTMLTableElement;
    if(customTable) {
        addTableHeaderClickEvents(customTable);
    }
    return true;
}

function downloadTable() {
    let prebuildPageHandler = new SimpleTableHandler(onLoaded, undefined);

    function onLoaded(tableDef: TableDef) {
        let template = tableDef.shadowTableTemplate;
        tableDef.tableRef.getOrgTable()
            .querySelector("tbody")
            .replaceChildren(...template.content.querySelectorAll("tbody tr"));
    }

    // let tableRef = new TableRef("table_leerlingen_werklijst_table", findFirstNavigation(),(offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0");
    let tableRef = findTableRefInCode();
    let tableDef = new TableDef(
        tableRef,
        prebuildPageHandler,
        getCriteriaString
    );

    tableDef.getTableData().then(() => { });
}
