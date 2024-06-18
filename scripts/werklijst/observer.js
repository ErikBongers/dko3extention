import {db3, HashObserver, options} from "../globals.js";
import * as def from "../lessen/def.js";

export default new HashObserver("#leerlingen-werklijst", onMutation);

function onMutation(mutation) {
    console.log(mutation);
    console.log("WErklijst !!!");
    let werklijst = document.getElementById("div_table_werklijst");
    if (mutation.target === werklijst) {
        onWerklijstChanged(werklijst);
        return true;
    }
    let buttonBar = document.getElementById("tablenav_leerlingen_werklijst_top");
    if (mutation.target === buttonBar) {
        onButtonBarChanged(buttonBar);
        return true;
    }
    return false;
}

function onWerklijstChanged(tabWerklijst) {
}

function onButtonBarChanged(buttonBar) {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)");
    addButton(targetButton, def.FETCH_ALL_BUTTON_ID, "Toon trimesters", onClickFetchAll, "fa-guitar", ["btn-outline-info"]);
}

function addButton(targetButton, buttonId, title, clickFunction, imageId, classList) { //TODO: generalize this function.
    let button = document.getElementById(buttonId);
    if (button === null) {
        const button = document.createElement("button");
        button.classList.add("btn", "btn-sm"/*, "btn-outline-secondary", "w-100"*/, ...classList);
        button.id = buttonId;
        button.style.marginTop = "0";
        button.onclick = clickFunction;
        button.title = title;
        const buttonContent = document.createElement("i");
        button.appendChild(buttonContent);
        buttonContent.classList.add("fas", imageId);
        targetButton.insertAdjacentElement("beforebegin", button);
    }
}

function onClickFetchAll() {
    console.log("Fetching ALLLLLLL");
}
