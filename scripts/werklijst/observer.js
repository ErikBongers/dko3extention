import {addButton, getNavigation, HashObserver, ProgressBar, setButtonHighlighted} from "../globals.js";
import * as def from "../lessen/def.js";
import {buildTable} from "./build.js";
import {fetchAllPages} from "./scrape.js";
import {fetchFromCloud} from "../cloud.js";

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
    addButton(btnWerklijstMaken, def.PREFILL_INSTR_BTN_ID, "Prefill instrumenten", prefillInstruments, "fa-guitar", ["btn", "btn-outline-dark"], "prefill ");
}


async function prefillInstruments() {
    await sendClearWerklijst();
    let criteria = [
        {"criteria": "Schooljaar", "operator": "=", "values": "2024-2025"},
        {"criteria": "Status", "operator": "=", "values": "12"},
        {"criteria": "Uitschrijvingen", "operator": "=", "values": "0"},
        {"criteria": "Domein", "operator": "=", "values": "3"},
        {
            "criteria": "Vak",
            "operator": "=",
            "values": "761,762,763,764,765,734,766,732,767,768,735,795,736,769,770,771,772,773,759,834,774,775,776,845,777,737,778,779,780,781,808,782,783,738,810,792,791,739,784,760,785,740,786,787,741,733,788,796,742,814,727"
        }
    ];
    await sendCriteria(criteria);
    console.log("Criteria sent.");
    await sendFields([
        {value: "vak_naam", text: "vak"},
        {value: "graad_leerjaar", text: "graad + leerjaar"},
        {value: "klasleerkracht", text: "klasleerkracht"}]
    );
    console.log("Fields sent.");
    await sendGrouping("vak_id");
    console.log("Grouping sent.");
    location.reload();
}

async function sendClearWerklijst() {
    const formData = new FormData();

    formData.append("session", "leerlingen_werklijst");

    await fetch("/views/util/clear_session.php", {
        method: "POST",
        body: formData,
    });

    //needed to prefill the default fields.
    await fetch("views/leerlingen/werklijst/index.velden.php", {
        method: "GET"
    });
}

async function sendCriteria(criteria) {
    const formData = new FormData();

    formData.append("criteria", JSON.stringify(criteria));

    const response = await fetch("/views/leerlingen/werklijst/index.criteria.session_reload.php", {
        method: "POST",
        body: formData,
    });
}

async function sendGrouping(grouping) {
    const formData = new FormData();

    formData.append("groepering", grouping);

    const response = await fetch("/views/leerlingen/werklijst/index.groeperen.session_add.php", {
        method: "POST",
        body: formData,
    });
}

async function sendFields(fields) {
    const formData = new FormData();

    let fieldCnt = 0;
    for(let field of fields) {
        formData.append(`velden[${fieldCnt}][value]`, field.value);
        formData.append(`velden[${fieldCnt}][text]`, field.text);
        fieldCnt++;
    }

    const response = await fetch("/views/leerlingen/werklijst/index.velden.session_add.php", {
        method: "POST",
        body: formData,
    });
}

function onWerklijstChanged(tabWerklijst) {
}

function onButtonBarChanged(buttonBar) {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)");
    addButton(targetButton, def.COUNT_BUTTON_ID, "Toon telling", onClickShowCounts, "fa-guitar", ["btn-outline-info"]);
}

function onClickShowCounts() {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.COUNT_TABLE_ID)) {
        let orgTable = document.getElementById("table_leerlingen_werklijst_table");
        let divProgressLine = document.createElement("div");
        orgTable.insertAdjacentElement("beforebegin", divProgressLine);
        divProgressLine.classList.add("progressLine");
        divProgressLine.id = def.PROGRESS_BAR_ID;
        let divProgressText = document.createElement("div");
        divProgressLine.appendChild(divProgressText);
        divProgressText.classList.add("progressText");
        divProgressText.innerText="loading pages... ";
        let divProgressBar = document.createElement("div");
        divProgressLine.appendChild(divProgressBar);
        divProgressBar.classList.add("progressBar");

        let navigationData = getNavigation(document.querySelector("#tablenav_leerlingen_werklijst_top"));
        console.log(navigationData);
        let progressBar = new ProgressBar(divProgressLine, divProgressBar, Math.ceil(navigationData.maxCount/navigationData.step));


        Promise.all([
            fetchAllPages(progressBar, navigationData),
            fetchFromCloud("brol.json")
            ])
            .then((results) => {
                let vakLeraars = results[0];
                let fromCloud = results[1];
                let sortedVakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0]));
                buildTable(sortedVakLeraars, fromCloud);
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
