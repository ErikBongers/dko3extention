import { addButton, millisToString } from "../globals.js";
import * as def from "../lessen/def.js";
import { AllPageFilter, BaseObserver } from "../pageObserver.js";
import { SimpleTableHandler } from "../pageHandlers.js";
import { TableDef, TableRef } from "./tableDef.js";
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
    let prebuildPageHandler = new SimpleTableHandler(onLoaded, undefined);
    function onLoaded(tableDef) {
        let template = tableDef.shadowTableTemplate;
        tableDef.tableRef.getOrgTable()
            .querySelector("tbody")
            .replaceChildren(...template.content.querySelectorAll("tbody tr"));
        if (tableDef.isUsingChached) {
            let p = document.createElement("p");
            tableDef.divInfoContainer.appendChild(p);
            p.classList.add("cacheInfo");
            p.innerHTML = `Gegevens uit cache, ${millisToString((new Date()).getTime() - tableDef.shadowTableDate.getTime())} oud. `;
            let a = document.createElement("a");
            p.appendChild(a);
            a.innerHTML = "refresh";
            a.href = "#";
            a.onclick = (e) => {
                e.preventDefault();
                console.log("refreshinggggg");
                tableDef.clearCache();
                // noinspection JSIgnoredPromiseFromCall
                tableDef.getTableData();
                return true;
            };
        }
    }
    let tableRef = new TableRef("table_leerlingen_werklijst_table", findFirstNavigation(), (offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0");
    let tableDef = new TableDef(tableRef, prebuildPageHandler, undefined);
    tableDef.setupInfoBar(); //TODO: this is a bit mandatory. How?
    tableDef.getTableData().then(() => {
        console.log("Fetch complete!");
    });
}
//# sourceMappingURL=observer.js.map