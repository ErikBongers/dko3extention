import {addButton, db3} from "../globals.js";
import * as def from "../lessen/def.js";
import {AllPageFilter, BaseObserver} from "../pageObserver.js";
import {RowPageHandler} from "../pageHandlers.js";
import {fetchFullTable} from "../werklijst/pageFetcher.js";
import {findFirstNavigation, TableDef} from "../tableDef.js";

export default new BaseObserver(undefined, new AllPageFilter(), onMutation);

function onMutation (mutation) {
    let navigationBar = document.querySelector("div.datatable-navigation-toolbar");
    if(!navigationBar)
        return;
    addButton(navigationBar.lastElementChild, def.DOWNLOAD_TABLE_BTN_ID, "download full table", downloadTable, "fa-arrow-down", ["btn-secondary"], "", "afterend");
}

function downloadTable() {
    let rowPageHandler = new RowPageHandler(onRow, onBeforeLoading);

    function onBeforeLoading(tableDef) {
        tableDef.orgTable.querySelector("tbody").innerHTML = "";
    }

    function onRow(tableDef, row, collection, offset, index) {
        let tbody = tableDef.orgTable.querySelector("tbody");
        tbody.appendChild(row);
        return true;
    }

    let tableDef = new TableDef(
        document.getElementById("table_leerlingen_werklijst_table"),
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
