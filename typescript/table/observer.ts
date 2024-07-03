import {addButton} from "../globals.js";
import * as def from "../lessen/def.js";
import {AllPageFilter, BaseObserver} from "../pageObserver.js";
import {RowObject, RowPageHandler} from "../pageHandlers.js";
import {fetchFullTable} from "../werklijst/pageFetcher.js";

export default new BaseObserver(undefined, new AllPageFilter(), onMutation);

function onMutation (_mutation: MutationRecord) {
    let navigationBar = document.querySelector("div.datatable-navigation-toolbar") as HTMLElement;
    if(!navigationBar)
        return false;
    addButton(navigationBar.lastElementChild as HTMLElement, def.DOWNLOAD_TABLE_BTN_ID, "download full table", downloadTable, "fa-arrow-down", ["btn-secondary"], "", "afterend");
    return true;
}

function downloadTable() {
    let rowPageHandler = new RowPageHandler(onRow, onBeforeLoading);

    function onBeforeLoading(tableDef: TableDef) {
    }

    function onRow(tableDef: TableDef, rowObject: RowObject, _collection: any) {
        tbody.appendChild(rowObject.tr);
        return true;
    }

    let tableDef = new TableDef(
        rowPageHandler,
        "werklijst",
        "",
        ""
    );

    fetchFullTable(tableDef, undefined, undefined).then(() => {
        console.log("Fetch complete!");
    })
}
