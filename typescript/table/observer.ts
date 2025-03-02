import {addButton, addTableNavigationButton, getBothToolbars} from "../globals";
import * as def from "../def";
import {AllPageFilter, BaseObserver} from "../pageObserver";
import {SimpleTableHandler} from "../pageHandlers";
import {CalculateTableCheckSumHandler, findTableRefInCode, TableDef} from "./tableDef";
import {addTableHeaderClickEvents} from "./tableHeaders";

export default new BaseObserver(undefined, new AllPageFilter(), onMutation);

function onMutation (_mutation: MutationRecord) {
    let navigationBars = getBothToolbars();
    if(!navigationBars)
        return; //wait for top and bottom bars.
    if(!findTableRefInCode()?.navigationData.isOnePage()) {
        addTableNavigationButton(navigationBars, def.DOWNLOAD_TABLE_BTN_ID, "download full table", downloadTable, "fa-arrow-down");
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

let tableCriteriaBuilders = new Map<string, CalculateTableCheckSumHandler>();

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
        getChecksumHandler(tableRef.htmlTableId)
    );

    tableDef.getTableData().then(() => { });
}

export function getChecksumHandler(tableId: string): CalculateTableCheckSumHandler {
    let handler = tableCriteriaBuilders.get(tableId);
    debugger;
    if(handler)
        return handler;
    return (tableDef: TableDef) => "";
}

export function registerChecksumHandler(tableId: string, checksumHandler: CalculateTableCheckSumHandler) {
    tableCriteriaBuilders.set(tableId, checksumHandler);
}