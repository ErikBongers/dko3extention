import {addTableNavigationButton, getBothToolbars} from "../globals";
import * as def from "../def";
import {AllPageFilter, BaseObserver} from "../pageObserver";
import {CalculateTableCheckSumHandler, findTableRefInCode, TableDef} from "./tableDef";
import {decorateTableHeader} from "./tableHeaders";
import {downloadTable} from "./loadAnyTable";

export default new BaseObserver(undefined, new AllPageFilter(), onMutation);

function onMutation (_mutation: MutationRecord) {
    let navigationBars = getBothToolbars();
    if(!navigationBars)
        return; //wait for top and bottom bars.
    if(!findTableRefInCode()?.navigationData.isOnePage()) {
        addTableNavigationButton(navigationBars, def.DOWNLOAD_TABLE_BTN_ID, "download full table", downloadTable, "fa-arrow-down");
    }
    if(document.querySelector("main div.table-responsive table thead")) {
        decorateTableHeader(document.querySelector("main div.table-responsive table"));
    }
    let customTable = document.querySelector("table.canSort") as HTMLTableElement;
    if(customTable) {
        decorateTableHeader(customTable);
    }
    return true;
}

let tableCriteriaBuilders = new Map<string, CalculateTableCheckSumHandler>();

export function getChecksumHandler(tableId: string): CalculateTableCheckSumHandler {
    let handler = tableCriteriaBuilders.get(tableId);
    if(handler)
        return handler;
    return (tableDef: TableDef) => "";
}

export function registerChecksumHandler(tableId: string, checksumHandler: CalculateTableCheckSumHandler) {
    tableCriteriaBuilders.set(tableId, checksumHandler);
}