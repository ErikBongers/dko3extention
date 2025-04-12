import {addTableNavigationButton, getBothToolbars} from "../globals";
import * as def from "../def";
import {CAN_HAVE_MENU, CAN_SORT} from "../def";
import {AllPageFilter, BaseObserver} from "../pageObserver";
import {CheckSumBuilder, findTableRefInCode, TableFetcher} from "./tableFetcher";
import {decorateTableHeader} from "./tableHeaders";
import {downloadTableRows} from "./loadAnyTable";

export default new BaseObserver(undefined, new AllPageFilter(), onMutation);

function onMutation (_mutation: MutationRecord) {
    let navigationBars = getBothToolbars();
    if(!navigationBars)
        return; //wait for top and bottom bars.
    if(!findTableRefInCode()?.navigationData.isOnePage()) {
        addTableNavigationButton(navigationBars, def.DOWNLOAD_TABLE_BTN_ID, "download full table", () => {
            downloadTableRows();
        }, "fa-arrow-down");
    }
    if(document.querySelector("main div.table-responsive table thead")) {
        let table = document.querySelector("main div.table-responsive table");
        table.classList.add(CAN_HAVE_MENU);
        decorateTableHeader(document.querySelector("main div.table-responsive table"));
    }
    let canSort = document.querySelector("table."+CAN_SORT) as HTMLTableElement;
    if(canSort) {
        decorateTableHeader(canSort);
    }
    return true;
}

let tableCriteriaBuilders = new Map<string, CheckSumBuilder>();

export function getChecksumBuilder(tableId: string): CheckSumBuilder {
    let builder = tableCriteriaBuilders.get(tableId);
    if(builder)
        return builder;
    return (tableFetcher: TableFetcher) => "";
}

export function registerChecksumHandler(tableId: string, checksumHandler: CheckSumBuilder) {
    tableCriteriaBuilders.set(tableId, checksumHandler);
}