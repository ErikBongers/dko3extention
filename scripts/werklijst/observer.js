import {
    addButton, db3,
    getNavigation,
    getSchoolIdString, getSchooljaar,
    HashObserver,
    ProgressBar,
    setButtonHighlighted
} from "../globals.js";
import * as def from "../lessen/def.js";
import {buildTable, getUrenVakLeraarFileName} from "./build.js";
import {extractStudents} from "./scrape.js";
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
    getSchoolIdString();
}

let instrumentSet = new Set([
    "Accordeon",
    "Altfluit",
    "Althoorn",
    "Altklarinet",
    "Altsaxofoon",
    "Altsaxofoon (jazz pop rock)",
    "Altviool",
    "Baglama/saz (wereldmuziek)",
    "Bariton",
    "Baritonsaxofoon",
    "Baritonsaxofoon (jazz pop rock)",
    "Basfluit",
    "Basgitaar (jazz pop rock)",
    "Basklarinet",
    "Bastrombone",
    "Bastuba",
    "Bugel",
    "Cello",
    "Contrabas (jazz pop rock)",
    "Contrabas (klassiek)",
    "Dwarsfluit",
    "Engelse hoorn",
    "Eufonium",
    "Fagot",
    "Gitaar",
    "Gitaar (jazz pop rock)",
    "Harp",
    "Hobo",
    "Hoorn",
    "Keyboard (jazz pop rock)",
    "Klarinet",
    "Kornet",
    "Orgel",
    "Piano",
    "Piano (jazz pop rock)",
    "Pianolab",
    "Piccolo",
    "Slagwerk",
    "Slagwerk (jazz pop rock)",
    "Sopraansaxofoon",
    "Sopraansaxofoon (jazz pop rock)",
    "Tenorsaxofoon",
    "Tenorsaxofoon (jazz pop rock)",
    "Trombone",
    "Trompet",
    "Trompet (jazz pop rock)",
    "Ud (wereldmuziek)",
    "Viool",
    "Zang",
    "Zang (jazz pop rock)",
    "Zang (musical 2e graad)",
    "Zang (musical)",
]);

function isInstrument(text) {
    return instrumentSet.has(text);
}

async function fetchVakken(clear) {
    if(clear) {
        await sendClearWerklijst();
    }
    await sendAddCriterium("2024-2025","Vak");
    let text = await fetchCritera("2024-2025");
    const template = document.createElement('template');
    template.innerHTML = text;
    let vakken = template.content.querySelectorAll("#form_field_leerling_werklijst_criterium_vak option");
    return  Array.from(vakken).map(vak => [vak.label, vak.value]);
}

async function fetchCritera(schoolYear, criterium) {
    return (await fetch("https://administratie.dko3.cloud/views/leerlingen/werklijst/index.criteria.php?schooljaar="+schoolYear, {
        method: "GET"
    })).text();
}

async function sendAddCriterium(schoolYear, criterium) {
    const formData = new FormData();
    formData.append(`criterium`, criterium);
    formData.append(`schooljaar`, schoolYear);

    const response = await fetch("https://administratie.dko3.cloud/views/leerlingen/werklijst/index.criteria.session_add.php", {
        method: "POST",
        body: formData,
    });
}

async function prefillInstruments() {
    await sendClearWerklijst();
    let vakken = await fetchVakken(false);
    let instruments = vakken.filter((vak) => isInstrument(vak[0]));
    let values = instruments.map(vak => parseInt(vak[1]));
    let valueString = values.join();

    let criteria = [
        {"criteria": "Schooljaar", "operator": "=", "values": "2024-2025"},
        {"criteria": "Status", "operator": "=", "values": "12"},
        {"criteria": "Uitschrijvingen", "operator": "=", "values": "0"},
        {"criteria": "Domein", "operator": "=", "values": "3"},
        {
            "criteria": "Vak",
            "operator": "=",
            "values": valueString
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

async function fetchFullWerklijst(results, pageReader, parallelAsyncFunction) {
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
    db3(navigationData);
    let progressBar = new ProgressBar(divProgressLine, divProgressBar, Math.ceil(navigationData.maxCount/navigationData.step));

    return Promise.all([
        fetchAllWerklijstPages(progressBar, navigationData, results, pageReader),
        parallelAsyncFunction()
        ]);
}

export async function fetchAllWerklijstPages(progressBar, navigationData, results, pageReader) {
    let offset = 0;
    progressBar.start();
    while(true) {
        console.log("fetching page " + offset);
        let response = await fetch("/views/ui/datatable.php?id=leerlingen_werklijst&start="+offset+"&aantal=0");
        let text = await response.text();
        let count = pageReader(text, results);
        offset+= navigationData.step;
        if(!progressBar.next())
            break;
    }
    progressBar.stop();
    return results;
}

function onClickShowCounts() {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.COUNT_TABLE_ID)) {
        let navigationData = getNavigation(document.querySelector("#tablenav_leerlingen_werklijst_top"));
        console.log(navigationData);

        let fileName = getUrenVakLeraarFileName();
        console.log("reading: " + fileName);
        fetchFullWerklijst(new Map(), extractStudents, () => fetchFromCloud(fileName))
            .then((results) => {
                let vakLeraars = results[0];
                let fromCloud = results[1];
                fromCloud = upgradeCloudData(fromCloud);
                let sortedVakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0]));
                buildTable({ vakLeraars: sortedVakLeraars, fromCloud});
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

function upgradeCloudData(fromCloud) {
    //if fromCloud.version === "...." --> convert.
    return fromCloud;
}
