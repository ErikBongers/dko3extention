import {addTableNavigationButton, getBothToolbars} from "../globals";
import * as def from "../def";
import {AllPageFilter, BaseObserver} from "../pageObserver";
import {CheckSumBuilder, FetchedTable, findTableRefInCode, TableFetcher} from "./tableFetcher";
import {decorateTableHeader} from "./tableHeaders";
import {downloadTableRows} from "./loadAnyTable";
import {pageState} from "../pageState";

export default new BaseObserver(undefined, new AllPageFilter(), onMutation);

function onMutation (_mutation: MutationRecord) {
    let navigationBars = getBothToolbars();
    if(!navigationBars)
        return; //wait for top and bottom bars.
    if(!findTableRefInCode()?.navigationData.isOnePage()) {
        addTableNavigationButton(navigationBars, def.DOWNLOAD_TABLE_BTN_ID, "download full table", createDownloadTableWithExtraAction(), "fa-arrow-down");
    }
    if(document.querySelector("main div.table-responsive table thead")) {
        decorateTableHeader(document.querySelector("main div.table-responsive table"));
    }
    let sortableTable = document.querySelector("table."+def.CAN_SORT) as HTMLTableElement;
    if(sortableTable) {
        decorateTableHeader(sortableTable);
    }
    return true;
}

let tableCriteriaBuilders = new Map<string, CheckSumBuilder>();

export function getChecksumBuilder(tableId: string): CheckSumBuilder {
    let builder = tableCriteriaBuilders.get(tableId);
    if(builder)
        return builder;
    return (_tableFetcher: TableFetcher) => "";
}

export function registerChecksumHandler(tableId: string, checksumHandler: CheckSumBuilder) {
    tableCriteriaBuilders.set(tableId, checksumHandler);
}

export function createDownloadTableWithExtraAction() {
    return (_: Event) => {
        downloadTableRows().then(fetchedTable => {
            pageState.transient.getValue(def.AFTER_DOWNLOAD_TABLE_ACTION, undefined)?.(fetchedTable);
        });
    };
}

export function  setAfterDownloadTableAction(action:  (fetchedTable: FetchedTable) => void) {
    pageState.transient.setValue(def.AFTER_DOWNLOAD_TABLE_ACTION, action);
}
