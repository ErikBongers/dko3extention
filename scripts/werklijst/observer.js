import {db3, HashObserver, options, setButtonHighlighted} from "../globals.js";
import * as def from "../lessen/def.js";
import {buildTable} from "./build.js";
import {fetchAll} from "./scrape.js";

export default new HashObserver("#leerlingen-werklijst", onMutation);

function onMutation(mutation) {
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
    addButton(targetButton, def.COUNT_BUTTON_ID, "Toon trimesters", onClickShowCounts, "fa-guitar", ["btn-outline-info"]);
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


function onClickShowCounts() {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.COUNT_TABLE_ID)) {
        fetchAll((counters) => {
            //sort table

            let sorted = new Map([...counters.entries()].sort((a, b) => a[0].localeCompare(b[0])));
            buildTable(sorted);
            document.getElementById(def.COUNT_TABLE_ID).style.display = "none";
            showOrHideNewTable();
        }); //TODO: make async
        return;
    }
    showOrHideNewTable();
}

function showOrHideNewTable() {
    let showNewTable = document.getElementById(def.COUNT_TABLE_ID).style.display === "none";
    document.getElementById("table_leerlingen_werklijst_table").style.display = showNewTable ? "none" : "table";
    document.getElementById(def.COUNT_TABLE_ID).style.display = showNewTable ? "table" : "none";
    document.getElementById(def.COUNT_BUTTON_ID).title = showNewTable ? "Toon normaal" : "Toon telling";
    setButtonHighlighted(def.COUNT_BUTTON_ID, showNewTable);
}

function isInstrument(vak) {
    switch (vak) {
        case "Muziekatelier": 
        case "Groepsmusiceren (jazz pop rock)": 
        case "Groepsmusiceren (klassiek)": 
        case "Harmonielab": 
        case "Instrumentinitiatie - elke trimester een ander instrument": 
        case "instrumentinitiatie – piano het hele jaar": 
        case "Klanklab elektronische muziek": 
        case "Muziektheorie": 
        case "Koor (jazz pop rock)": 
        case "Koor (musical)": 
        case "Arrangeren": 
        case "Groepsmusiceren (opera)": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
            return false;
    }
    return true;
}

function translateVak(vak) {
    if(vak.includes("(jazz pop rock)")) {
        return "JPR " + vak.replace("(jazz pop rock)", "");
    }
    if(vak.includes("musical")) {
        return "M " + vak.replace("(musical)", "");
    }

    return "K " + vak;
}