import {addButton, db3} from "../globals.js";
import * as def from "../lessen/def.js";
import {AllPageFilter, BaseObserver} from "../pageObserver.js";

export default new BaseObserver(undefined, new AllPageFilter(), onMutation);

function onMutation (mutation) {
    let navigationBar = document.querySelector("div.datatable-navigation-toolbar");
    if(!navigationBar)
        return;
    addButton(navigationBar.lastElementChild, def.DOWNLOAD_TABLE_BTN_ID, "download full table", downloadTable, "fa-arrow-down", ["btn-secondary"], "", "afterend");
}

function downloadTable() {

}
