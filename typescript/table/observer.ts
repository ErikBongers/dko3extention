import {addButton} from "../globals.js";
import * as def from "../lessen/def.js";
import {AllPageFilter, BaseObserver} from "../pageObserver.js";
import {RowObject, RowPageHandler} from "../pageHandlers.js";
import {fetchFullTable} from "../werklijst/pageFetcher.js";
import {findFirstNavigation, TableDef} from "../tableDef.js";

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
        tableDef.orgTable.querySelector("tbody").innerHTML = "";
    }

    function onRow(tableDef: TableDef, rowObject: RowObject, _collection: any) {
        let tbody = tableDef.orgTable.querySelector("tbody");
        tbody.appendChild(rowObject.tr);
        return true;
    }

    let tableDef = new TableDef(
        document.getElementById("table_leerlingen_werklijst_table") as HTMLTableElement,
        (offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0",
        rowPageHandler,
        findFirstNavigation(),
        "werklijst",
        "",
        ""
    );

    fetchFullTable(tableDef, undefined, undefined).then(() => {
        console.log("Fetch complete!");
    })
}
