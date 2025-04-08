import {scrapeLessenOverzicht, scrapeModules} from "./scrape";
import {buildTableData} from "./convert";
import {buildTrimesterTable, getDefaultPageSettings, getSavedNameSorting, LessenPageState, NameSorting, setSavedNameSorting, TrimesterGrouping} from "./build";
import * as def from "../def";
import {createSearchField, createTextRowFilter, filterTable, filterTableRows, getPageSettings, savePageSettings, setButtonHighlighted} from "../globals";
import {HashObserver} from "../pageObserver";
import * as html from "../../libs/Emmeter/html";
import {emmet} from "../../libs/Emmeter/html";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState} from "../gotoState";

export default new HashObserver("#lessen-overzicht", onMutation);

function onMutation (mutation: MutationRecord) {
    let lessenOverzicht = document.getElementById(def.LESSEN_OVERZICHT_ID);
    if (mutation.target !== lessenOverzicht) {
        return false;
    }

    if(!document.getElementById("btn_show_trimesters")) {
        let {first} = emmet.insertAfter(document.getElementById("btn_lessen_overzicht_zoeken"),
            "button.btn.btn-sm.btn-primary.w-100.mt-1#btn_show_trimesters>i.fas.fa-sitemap+{ Toon trimesters}");
        (first as HTMLElement).onclick = onClickShowTrimesters;
    }

    console.log(mutation)
    let pageState = getGotoStateOrDefault(PageName.Lessen);
    switch (pageState.goto) {
        case Goto.Lessen_trimesters_set_filter:
            pageState.goto = Goto.None;
            saveGotoState(pageState);
            onClickShowTrimesters();
            return true;
        case Goto.Lessen_trimesters_show:
            console.log("TODO: show trims");
            pageState.goto = Goto.None;
            saveGotoState(pageState);
            return true;
    }

    return decorateTable();
}


function onClickShowTrimesters() {
    document.getElementById("lessen_overzicht").innerHTML = "<span class=\"text-muted\">\n" +
        "                <i class=\"fa fa-cog fa-spin\"></i> <i>Bezig met laden...</i>\n" +
        "            </span>";
    setTrimesterFilterAndFetch().then((text) => {
        console.log("Filter been set: show trims after reload...");
        document.getElementById("lessen_overzicht").innerHTML = text;
        let table = document.getElementById("table_lessen_resultaat_tabel") as HTMLTableElement;
        decorateTable();//todo: this call is needed for call below. Inject it.
        showTrimesterTable(table, true);
    });
}

async function setTrimesterFilterAndFetch() {
    let params = new URLSearchParams({
        schooljaar: "2024-2025", //todo: hard coded year!
        domein:"3", //muziek
        vestigingsplaats: "",
        vak: "",
        graad: "",
        leerkracht: "",
        ag: "",
        lesdag: "",
        verberg_online:"-1",
        soorten_lessen:"3", //modules!
        volzet:"-1",
        // laad_tabel:"1"
    });
    let url = "https://administratie.dko3.cloud/views/lessen/overzicht/index.filters.php";
    await fetch(url+"?" + params);
    url = "https://administratie.dko3.cloud/views/lessen/overzicht/index.lessen.php";
    let res = await fetch(url+"?" + params);
    return res.text();
}


function createTrimTableDiv() {
    if (!document.getElementById(def.TRIM_DIV_ID)) {
        let trimDiv = document.createElement("div");
        let originalTable = document.getElementById("table_lessen_resultaat_tabel");
        originalTable.insertAdjacentElement("afterend", trimDiv);
        trimDiv.id = def.TRIM_DIV_ID;
    }
}

function decorateTable() {
    let printButton = document.getElementById("btn_print_overzicht_lessen") as HTMLButtonElement;
    if (!printButton) {
        return false;
    }
    let copyLessonButton = printButton.parentElement.querySelector("button:has(i.fa-reply-all)") as HTMLButtonElement;
    if(copyLessonButton?.title === "") {
        copyLessonButton.title = copyLessonButton.textContent.replaceAll("\n", " ").replaceAll("      ", " ").replaceAll("     ", " ").replaceAll("    ", " ").replaceAll("   ", " ").replaceAll("  ", " ");
        copyLessonButton.childNodes.forEach(node => {
            if(node.nodeType === Node.TEXT_NODE)
                node.remove();
        });
        copyLessonButton.querySelector("strong")?.remove();
        copyLessonButton.style.backgroundColor = "red";
        copyLessonButton.style.color = "white";
    }

    //reset state
    let overzichtDiv = document.getElementById(def.LESSEN_OVERZICHT_ID);
    createTrimTableDiv();
    overzichtDiv.dataset.filterFullClasses = "false";

    let badges = document.getElementsByClassName("badge");
    let hasModules = Array.from(badges).some((el) => el.textContent === "module");
    let hasAlc = Array.from(badges).some((el) => el.textContent === "ALC")
    let warnings = document.getElementsByClassName("text-warning");
    let hasWarnings = warnings.length !==0;

    let hasFullClasses = Array.from(warnings).map((item) => item.textContent).some((txt) => txt.includes("leerlingen"));

    if (!hasModules && !hasAlc && !hasWarnings && !hasFullClasses) {
        return true;
    }
    if (hasModules) {
        addButton(printButton, def.TRIM_BUTTON_ID, "Toon trimesters", onClickToggleTrimesters, "fa-sitemap");
    }
    if(hasAlc || hasWarnings) {
        addButton(printButton, def.CHECKS_BUTTON_ID, "Controleer lessen op fouten", onClickCheckResults, "fa-stethoscope");
    }
    if(hasFullClasses) {
        addButton(printButton, def.FULL_CLASS_BUTTON_ID, "Filter volle klassen", onClickFullClasses, "fa-weight-hanging");
    }

    addFilterFields();
    return true;
}

const TXT_FILTER_ID = "txtFilter";

function addFilterFields() {
    let divButtonNieuweLes = document.querySelector("#lessen_overzicht > div > button");
    if(!document.getElementById(TXT_FILTER_ID)) {
        let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
        divButtonNieuweLes.insertAdjacentElement("afterend", createSearchField(TXT_FILTER_ID, onSearchInput, pageState.searchText));
    }

    onSearchInput();
}

function onSearchInput() {
    let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
    pageState.searchText = (document.getElementById(TXT_FILTER_ID) as HTMLInputElement).value;
    savePageSettings(pageState);
    if(isTrimesterTableVisible()) {
        let rowFilter = createTextRowFilter(pageState.searchText, (tr) => tr.textContent);
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
        let rowFilter = createTextRowFilter(pageState.searchText, (tr) => tr.cells[0].textContent);
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
    let table = document.getElementById("table_lessen_resultaat_tabel") as HTMLTableElement;
    let lessen = scrapeLessenOverzicht(table);

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
    let table = document.getElementById("table_lessen_resultaat_tabel") as HTMLTableElement;
    let lessen = scrapeLessenOverzicht(table);
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

function onClickToggleTrimesters() {
    let table = document.getElementById("table_lessen_resultaat_tabel") as HTMLTableElement;
    showTrimesterTable(table, !isTrimesterTableVisible());
}

export function isTrimesterTableVisible() {
    return document.getElementById("table_lessen_resultaat_tabel").style.display === "none";
}

export function showTrimesterTable(originalTable: HTMLTableElement, show: boolean) {
    document.getElementById(def.TRIM_TABLE_ID)?.remove();
    let inputModules = scrapeModules(originalTable);
    let tableData = buildTableData(inputModules.trimesterModules.concat(inputModules.jaarModules));
    createTrimTableDiv();//todo: since required for next function, inject it.
    buildTrimesterTable(tableData);

    document.getElementById("table_lessen_resultaat_tabel").style.display = show ? "none" : "table";
    document.getElementById(def.TRIM_TABLE_ID).style.display = show ? "table" : "none";
    document.getElementById(def.TRIM_BUTTON_ID).title = show ? "Toon normaal" : "Toon trimesters";
    setButtonHighlighted(def.TRIM_BUTTON_ID, show);
    setSorteerLine(show);
    onSearchInput();
}

function addSortingAnchorOrText() {
    let sorteerDiv = document.getElementById("trimSorteerDiv");
    sorteerDiv.innerHTML = "Sorteer : ";
    if(getSavedNameSorting() === NameSorting.FirstName) {
        html.emmet.append(sorteerDiv, "a{Naam}[href=\"#\"]+{ | }+strong{Voornaam}");
    } else {
        html.emmet.append(sorteerDiv, "strong{Naam}+{ | }+a{Voornaam}[href=\"#\"]");
    }
    for (let anchor of sorteerDiv.querySelectorAll("a")) {
        anchor.onclick = (mouseEvent: MouseEvent) => {
            if ((mouseEvent.target as HTMLElement).textContent === "Naam")
                setSavedNameSorting(NameSorting.LastName);
            else
                setSavedNameSorting(NameSorting.FirstName);
            let table = document.getElementById("table_lessen_resultaat_tabel") as HTMLTableElement;
            showTrimesterTable(table, true);
            addSortingAnchorOrText();
            return false;
        };
    }
}

function setSorteerLine(showTrimTable: boolean) {
    let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
    let oldSorteerSpan = document.querySelector("#lessen_overzicht > span") as HTMLElement;
    let newGroupingDiv = document.getElementById("trimGroepeerDiv");
    if(!newGroupingDiv) {
        newGroupingDiv = document.createElement("div");
        newGroupingDiv.id = "trimGroepeerDiv";
        newGroupingDiv.classList.add("text-muted");
        oldSorteerSpan.parentNode.insertBefore(newGroupingDiv, oldSorteerSpan.nextSibling);
    }
    let newSortingDiv = document.getElementById("trimSorteerDiv");
    if(!newSortingDiv) {
        html.emmet.insertBefore(newGroupingDiv, 'div#trimSorteerDiv.text-muted');
        addSortingAnchorOrText();
    }
    newGroupingDiv.innerText = "Groepeer: ";
    oldSorteerSpan.style.display = showTrimTable ? "none" : "";
    newGroupingDiv.style.display = showTrimTable ? "" : "none";

    newGroupingDiv.appendChild(createGroupingAnchorOrText(TrimesterGrouping.InstrumentTeacherHour, pageState.grouping));
    newGroupingDiv.appendChild(document.createTextNode(" | "));
    newGroupingDiv.appendChild(createGroupingAnchorOrText(TrimesterGrouping.TeacherInstrumentHour, pageState.grouping));
    newGroupingDiv.appendChild(document.createTextNode(" | "));
    newGroupingDiv.appendChild(createGroupingAnchorOrText(TrimesterGrouping.TeacherHour, pageState.grouping));
    newGroupingDiv.appendChild(document.createTextNode(" | "));
    newGroupingDiv.appendChild(createGroupingAnchorOrText(TrimesterGrouping.Instrument, pageState.grouping));
    newGroupingDiv.appendChild(document.createTextNode(" | "));
    newGroupingDiv.appendChild(createGroupingAnchorOrText(TrimesterGrouping.Teacher, pageState.grouping));
}

function createGroupingAnchorOrText(grouping: TrimesterGrouping, activeSorting: TrimesterGrouping) {
    let sortingText = "";
    switch (grouping) {
        case TrimesterGrouping.InstrumentTeacherHour: sortingText = "instrument+leraar+lesuur"; break;
        case TrimesterGrouping.TeacherInstrumentHour: sortingText = "leraar+instrument+lesuur"; break;
        case TrimesterGrouping.TeacherHour: sortingText = "leraar+lesuur"; break;
        case TrimesterGrouping.InstrumentHour: sortingText = "instrument+lesuur"; break;
        case TrimesterGrouping.Instrument: sortingText = "instrument"; break;
        case TrimesterGrouping.Teacher: sortingText = "leraar"; break;
    }

    if (activeSorting === grouping) {
        let strong = document.createElement("strong");
        strong.appendChild(document.createTextNode(sortingText));
        return strong;
    } else {
        let anchor = document.createElement('a');
        anchor.innerText = sortingText;
        anchor.href = "#";
        anchor.onclick = () => {
            let table = document.getElementById("table_lessen_resultaat_tabel") as HTMLTableElement;
            let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
            pageState.grouping = grouping;
            savePageSettings(pageState);
            showTrimesterTable(table, true);
            return false;
        };
        return anchor;
    }
}
