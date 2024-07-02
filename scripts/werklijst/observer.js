import {addButton, getSchoolIdString, setButtonHighlighted} from "../globals.js";
import * as def from "../lessen/def.js";
import {buildTable, getUrenVakLeraarFileName} from "./buildUren.js";
import {scrapeStudent} from "./scrapeUren.js";
import {fetchFromCloud} from "../cloud.js";
import {findFirstNavigation, TableDef} from "../tableDef.js";
import {fetchFullTable} from "./pageFetcher.js";
import {prefillInstruments} from "./prefillInstruments.js";
import {HashObserver} from "../pageObserver.js";
import {NamedCellPageHandler} from "../pageHandlers.js";

export default new HashObserver("#leerlingen-werklijst", onMutation);

function onMutation(mutation) {
    if (mutation.target.id === "table_leerlingen_werklijst_table") {
        onWerklijstChanged();
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

    addButton(btnWerklijstMaken, def.PREFILL_INSTR_BTN_ID, "Prefill instrumenten", prefillInstruments, "fa-guitar", ["btn", "btn-outline-dark"], "prefill ");
    getSchoolIdString();
}

function getCriteriaString() {
    return document.querySelector("#view_contents > div.alert.alert-info").textContent.replace("Criteria aanpassen", "").replace("Criteria:", "").replaceAll(/\s/g, "");
}

function onWerklijstChanged() {
    console.log("werklijst chqanged.");
    //recognize werklijst.
    let criteriaString = getCriteriaString();
    console.log(criteriaString);
    //TODO: remember last werklijst subtype in session storage, independent of tableDef -> log it to test!!!?
}

function onButtonBarChanged() {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)");
    addButton(targetButton, def.COUNT_BUTTON_ID, "Toon telling", onClickShowCounts, "fa-guitar", ["btn-outline-info"]);
    addButton(targetButton, def.MAIL_BTN_ID, "Email to clipboard", onClickCopyEmails, "fa-envelope", ["btn", "btn-outline-info"]);
}

// noinspection JSUnusedLocalSymbols
function scrapeEmails(row, collection, offset) {
    collection.push(row.getColumnText("e-mailadressen"));
    return true;
}

function onClickCopyEmails() {
    let requiredHeaderLabels = ["e-mailadressen"];
    let pageHandler = new NamedCellPageHandler(requiredHeaderLabels, scrapeEmails);
    let tableDef = new TableDef(
        document.getElementById("table_leerlingen_werklijst_table"),
        (offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0",
        pageHandler,
        findFirstNavigation(),
        "werklijst",
        "",
        ""
    );

    fetchFullTable(
        tableDef,
        [],
        undefined
    )
        .then((results) => {
            let flattened = results
                .map((emails) => emails.split(/[,;]/))
                .flat()
                .filter((email) => !email.includes("@academiestudent.be"))
                .filter((email) => email !== "");
            console.log("email count: " + flattened.length);
            navigator.clipboard.writeText(flattened.join(";\n")).then();
        });
}

function onClickShowCounts() {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.COUNT_TABLE_ID)) {
        let fileName = getUrenVakLeraarFileName();

        console.log("reading: " + fileName);
        let requiredHeaderLabels = ["naam", "voornaam", "vak", "klasleerkracht", "graad + leerjaar"];
        let pageHandler = new NamedCellPageHandler(requiredHeaderLabels, scrapeStudent);
        let tableDef = new TableDef(
            document.getElementById("table_leerlingen_werklijst_table"),
            (offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0",
            pageHandler,
            findFirstNavigation(),
            "werklijst_uren",
            def.COUNT_TABLE_ID
        );

        fetchFullTable(
            tableDef,
            new Map(),
            () => fetchFromCloud(fileName))
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
