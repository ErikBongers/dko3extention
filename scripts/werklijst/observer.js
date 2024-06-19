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
    if (document.querySelector("#btn_werklijst_maken")) {
        onPreparingFilter();
        return true;
    }
    return false;
}

function onPreparingFilter() {
    let btnWerklijstMaken = document.querySelector("#btn_werklijst_maken");
    if(document.getElementById(def.PREFILL_INSTR_BTN_ID))
        return;
    let btnPrefill = document.createElement("button");
    btnWerklijstMaken.insertAdjacentElement("beforebegin", btnPrefill);
    btnPrefill.innerText = "prefill";
    btnPrefill.id = def.PREFILL_INSTR_BTN_ID;
    btnPrefill.onclick = prefillInstruments;
}


function prefillInstruments() {
  let criteria = [
        {"criteria":"Schooljaar","operator":"=","values":"2024-2025"},
        {"criteria":"Status","operator":"=","values":"12"},
        {"criteria":"Uitschrijvingen","operator":"=","values":"0"},
        {"criteria":"Domein","operator":"=","values":"3"},
        {"criteria":"Vak","operator":"=","values":"761,762,763,764,765,734,766,732,767,768,735,795,736,769,770,771,772,773,759,834,775,776,845,777,737,778,779,780,781,808,782,783,738,810,792,791,739,784,760,785,740,786,787,741,733,788,796,742,814,727"}
    ];
    sendCriteria(criteria).then(() => {
        console.log("Crieria sent.");
    })
}

async function sendCriteria(criteria) {
    // Construct a FormData instance
    const formData = new FormData();

    formData.append("criteria", JSON.stringify(criteria));

    const response = await fetch("/views/leerlingen/werklijst/index.criteria.session_reload.php", {
        method: "POST",
        body: formData,
    });
    // console.log(await response.text());
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
        fetchAll().then((vakLeraars) => {
            let sortedVakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0]));
            buildTable(sortedVakLeraars);
            document.getElementById(def.COUNT_TABLE_ID).style.display = "none";
            showOrHideNewTable();
        });
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
