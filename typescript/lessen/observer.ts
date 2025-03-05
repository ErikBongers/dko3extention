import {scrapeLessenOverzicht, scrapeModules} from "./scrape";
import {buildTableData} from "./convert";
import {buildTrimesterTable, TrimesterSorting} from "./build";
import * as def from "../def";
import {createScearchField, createTextRowFilter, filterTable, filterTableRows, setButtonHighlighted} from "../globals";
import {HashObserver} from "../pageObserver";

export default new HashObserver("#lessen-overzicht", onMutation);

function onMutation (mutation: MutationRecord) {
    let lessenOverzicht = document.getElementById(def.LESSEN_OVERZICHT_ID);
    if (mutation.target !== lessenOverzicht) {
        return false;
    }
    let printButton = document.getElementById("btn_print_overzicht_lessen") as HTMLButtonElement;
    if (!printButton) {
        return false;
    }
    onLessenOverzichtChanged(printButton);
    return true;
}

function onLessenOverzichtChanged(printButton: HTMLButtonElement) {
    //reset state
    let overzichtDiv = document.getElementById(def.LESSEN_OVERZICHT_ID);
    let trimDiv = document.getElementById(def.TRIM_DIV_ID);
    if (!trimDiv) {
        let trimDiv = document.createElement("div");
        let originalTable = document.getElementById("table_lessen_resultaat_tabel");
        originalTable.insertAdjacentElement("afterend", trimDiv);
        trimDiv.id = def.TRIM_DIV_ID;
    }
    overzichtDiv.dataset.filterFullClasses = "false";

    let badges = document.getElementsByClassName("badge");
    let hasModules = Array.from(badges).some((el) => el.textContent === "module");
    let hasAlc = Array.from(badges).some((el) => el.textContent === "ALC")
    let warnings = document.getElementsByClassName("text-warning");
    let hasWarnings = warnings.length !==0;

    let hasFullClasses = Array.from(warnings).map((item) => item.textContent).some((txt) => txt.includes("leerlingen"));

    if (!hasModules && !hasAlc && !hasWarnings && !hasFullClasses) {
        return;
    }
    if (hasModules) {
        addButton(printButton, def.TRIM_BUTTON_ID, "Toon trimesters", onClickShowTrimesters, "fa-sitemap");
    }
    if(hasAlc || hasWarnings) {
        addButton(printButton, def.CHECKS_BUTTON_ID, "Controleer lessen op fouten", onClickCheckResults, "fa-stethoscope");
    }
    if(hasFullClasses) {
        addButton(printButton, def.FULL_CLASS_BUTTON_ID, "Filter volle klassen", onClickFullClasses, "fa-weight-hanging");
    }

    addFilterField();
}

const TXT_FILTER_ID = "txtFilter";
// Well, saved until the browser is refreshed :)
let savedSearch = "";

function addFilterField() {
    let divButtonNieuweLes = document.querySelector("#lessen_overzicht > div > button");
    if(!document.getElementById(TXT_FILTER_ID))
        divButtonNieuweLes.insertAdjacentElement("afterend", createScearchField(TXT_FILTER_ID, onSearchInput, savedSearch));

    onSearchInput();
}

function onSearchInput() {
    savedSearch = (document.getElementById(TXT_FILTER_ID) as HTMLInputElement).value;
    if(isTrimesterTableVisible()) {
        let rowFilter = createTextRowFilter(savedSearch, (tr) => tr.textContent);
        let filteredRows = filterTableRows(def.TRIM_TABLE_ID, rowFilter);

        //gather the blockIds and groupIds of the matching rows and show ALL of the rows in those blocks. (not just the matching rows).
        let blockIds = [...new Set(filteredRows.filter(tr => tr.dataset.blockId !== "groupTitle").map(tr => tr.dataset.blockId))];
        let groupIds = [...new Set(filteredRows.map(tr => tr.dataset.groupId))];
        //also show all rows of headers that match the text filter.
        let headerGroupIds = [...new Set(filteredRows.filter(tr => tr.dataset.blockId === "groupTitle").map(tr => tr.dataset.groupId))];

        function siblingsAndAncestorsFilter(tr: HTMLTableRowElement, context: any) {
            //display all child rows for the headers that match
            if((<string[]>context.headerGroupIds).includes(tr.dataset.groupId))
                return true;
            //display all siblings of non-header rows, thus the full block
            if((<string[]>context.blockIds).includes(tr.dataset.blockId))
                return true;
            //display the ancestor (header) rows of matching non-header rows
            return (<string[]>context.groupIds).includes(tr.dataset.groupId) && tr.classList.contains("groupHeader");
        }

        filterTable(def.TRIM_TABLE_ID, {context: {blockIds, groupIds, headerGroupIds}, rowFilter: siblingsAndAncestorsFilter});
    } else {
        let rowFilter = createTextRowFilter(savedSearch, (tr) => tr.cells[0].textContent);
        filterTable("table_lessen_resultaat_tabel",rowFilter);
    }
}

function addButton(printButton: HTMLButtonElement, buttonId: string, title: string, clickFunction: (this: GlobalEventHandlers, ev: MouseEvent) => any, imageId: string) {
    let button = document.getElementById(buttonId);
    if (button === null) {
        const button = document.createElement("button",);
        button.classList.add("btn", "btn-sm", "btn-outline-secondary", "w-100");
        button.id = buttonId;
        button.style.marginTop = "0";
        button.onclick = clickFunction;
        button.title = title;
        const buttonContent = document.createElement("i");
        button.appendChild(buttonContent);
        buttonContent.classList.add("fas", imageId);
        printButton.insertAdjacentElement("beforebegin", button);
    }
}
function onClickCheckResults() {
    let lessen = scrapeLessenOverzicht();

    let table = document.getElementById("table_lessen_resultaat_tabel");

    let checksDiv = document.createElement("div");
    checksDiv.id = "checksDiv";
    checksDiv.classList.add("badge-warning");

    let checksText = "";
    table.parentNode.insertBefore(checksDiv, table.previousSibling);
    for(let les of lessen) {
        if (les.alc) {
            if(les.visible) {
                checksText += `<div>ALC les <b>${les.naam}</b> is online zichtbaar.</div>`;
            }
        }
    }
    checksDiv.innerHTML = checksText;
}

function showOnlyFullTrimesters(onlyFull: boolean) {
    let trimDiv = document.getElementById(def.TRIM_DIV_ID);
    trimDiv.dataset.showFullClass = onlyFull ? "true" : "false";
}

function onClickFullClasses() {
    let lessen = scrapeLessenOverzicht();
    let overzichtDiv = document.getElementById(def.LESSEN_OVERZICHT_ID);
    overzichtDiv.dataset.filterFullClasses = (overzichtDiv.dataset.filterFullClasses?? "false") === "false" ? "true" : "false";
    let displayState = overzichtDiv.dataset.filterFullClasses === "true" ? "none" : "table-row";
    for(let les of lessen) {
        if (les.aantal < les.maxAantal) {
            les.tableRow.style.display = displayState;
        }
    }
    setButtonHighlighted(def.FULL_CLASS_BUTTON_ID, overzichtDiv.dataset.filterFullClasses === "true");
    showOnlyFullTrimesters(displayState === "none");
}

function onClickShowTrimesters() {
    showTrimesterTable(!isTrimesterTableVisible());
}

export function isTrimesterTableVisible() {
    return document.getElementById("table_lessen_resultaat_tabel").style.display === "none";
}

function showTrimesterTable(show: boolean) {
    //Build lazily and only once. Table will automatically be erased when filters are changed.
    if (!document.getElementById(def.TRIM_TABLE_ID)) {
        let inputModules = scrapeModules();
        let tableData = buildTableData(inputModules.trimesterModules.concat(inputModules.jaarModules));
        buildTrimesterTable(tableData, TrimesterSorting.Teacher);
    }

    document.getElementById("table_lessen_resultaat_tabel").style.display = show ? "none" : "table";
    document.getElementById(def.TRIM_TABLE_ID).style.display = show ? "table" : "none";
    document.getElementById(def.TRIM_BUTTON_ID).title = show ? "Toon normaal" : "Toon trimesters";
    setButtonHighlighted(def.TRIM_BUTTON_ID, show);
}

