import {scrapeLessenOverzicht, scrapeModules} from "./scrape";
import {buildTableData} from "./convert";
import {buildTrimesterTable, getDefaultPageSettings, getSavedNameSorting, LessenPageState, NameSorting, setSavedNameSorting, TrimElements, TrimesterGrouping} from "./build";
import * as def from "../def";
import {FILTER_INFO_ID, LESSEN_TABLE_ID} from "../def";
import {combineFilters, createSearchField, createTextRowFilter, filterTable, filterTableRows, findSchooljaar, getPageSettings, RowFilter, savePageSettings, setButtonHighlighted} from "../globals";
import {HashObserver} from "../pageObserver";
import * as html from "../../libs/Emmeter/html";
import {emmet} from "../../libs/Emmeter/html";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState} from "../gotoState";
import {addMenuItem, setupMenu} from "../menus";

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

    return decorateTable() !== undefined;
}


function onClickShowTrimesters() {
    document.getElementById("lessen_overzicht").innerHTML = "<span class=\"text-muted\">\n" +
        "                <i class=\"fa fa-cog fa-spin\"></i> <i>Bezig met laden...</i>\n" +
        "            </span>";
    setTrimesterFilterAndFetch().then((text) => {
        console.log("Filter been set: show trims after reload...");
        document.getElementById("lessen_overzicht").innerHTML = text;
        showTrimesterTable(decorateTable(), true);
    });
}

async function setTrimesterFilterAndFetch() {
    let params = new URLSearchParams({
        schooljaar: findSchooljaar(),
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
    let trimDiv = document.getElementById(def.TRIM_DIV_ID);
    if (!trimDiv) {
        trimDiv = document.createElement("div");
        let originalTable = document.getElementById(LESSEN_TABLE_ID);
        originalTable.insertAdjacentElement("afterend", trimDiv);
        trimDiv.id = def.TRIM_DIV_ID;
    }
    return trimDiv;
}

function decorateTable() {
    let printButton = document.getElementById("btn_print_overzicht_lessen") as HTMLButtonElement;
    if (!printButton) {
        return undefined;
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
        return getTrimPageElements();
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

    return getTrimPageElements();
}

const TXT_FILTER_ID = "txtFilter";

function addFilterFields() {
    let divButtonNieuweLes = document.querySelector("#lessen_overzicht > div > button");
    if(!document.getElementById(TXT_FILTER_ID)) {
        let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
        let searchField = createSearchField(TXT_FILTER_ID, applyFilters, pageState.searchText);
        divButtonNieuweLes.insertAdjacentElement("afterend", searchField);
        //menu
        let {first: span, last: idiom} = emmet.insertAfter(searchField, 'span.btn-group-sm>button.btn.btn-sm.btn-outline-secondary.ml-2>i.fas.fa-list');
        let menu = setupMenu(span as HTMLElement, idiom.parentElement);
        addMenuItem(menu, "Show all", 0, _ => filterAll());
        addMenuItem(menu, "Filter online lessen", 0, _ => filterOnline());
        addMenuItem(menu, "Filter offline lessen", 0, _ => filterOffline());
        emmet.insertAfter(idiom.parentElement, `span#${def.FILTER_INFO_ID}.filterInfo{sdfsdf}`);
    }

    applyFilters();
}

function setFilterInfo(text: string) {
    document.getElementById(FILTER_INFO_ID).innerText = text;
}

function filterAll() {
    let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
    pageState.filterOffline = false;
    pageState.filterOnline = false;
    savePageSettings(pageState);
    applyFilters();
}


function filterOffline() {
    let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
    pageState.filterOffline = true;
    pageState.filterOnline = false;
    savePageSettings(pageState);
    applyFilters();
}

function filterOnline() {
    let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
    pageState.filterOffline = false;
    pageState.filterOnline = true;
    savePageSettings(pageState);
    applyFilters();
}

function applyFilters() {
    let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
    pageState.searchText = (document.getElementById(TXT_FILTER_ID) as HTMLInputElement).value;
    savePageSettings(pageState);

    if(isTrimesterTableVisible()) {
        let textPreFilter = createTextRowFilter(pageState.searchText, (tr) => tr.textContent);

        let preFilter = textPreFilter;
        let extraFilter: RowFilter = undefined;
        if(pageState.filterOffline) {
            extraFilter = {
                context: undefined,
                rowFilter: function (tr: HTMLTableRowElement, _context: any): boolean {
                    return tr.dataset.visibility === "offline";
                }
            };
        } else if(pageState.filterOnline) {
            extraFilter = {
                context: undefined,
                rowFilter: function (tr: HTMLTableRowElement, _context: any): boolean {
                    return tr.dataset.visibility === "online";
                }
            };
        }
        if(extraFilter)
            preFilter = combineFilters(buildAncestorFilter(textPreFilter), extraFilter);

        let filter = buildAncestorFilter(preFilter);
        filterTable(def.TRIM_TABLE_ID, filter);
    } else {
        let textFilter = createTextRowFilter(pageState.searchText, (tr) => tr.cells[0].textContent);
        let filter = textFilter;
        let extraFilter: RowFilter = undefined;
        if(pageState.filterOffline) {
            extraFilter = {
                context: undefined,
                rowFilter: function (tr: HTMLTableRowElement, _context: any): boolean {
                    return tr.querySelector("td>i.fa-eye-slash") != undefined;
                }
            };
        } else if(pageState.filterOnline) {
            extraFilter = {
                context: undefined,
                rowFilter: function (tr: HTMLTableRowElement, _context: any): boolean {
                    return tr.querySelector("td>i.fa-eye-slash") == undefined;
                }
            };
        }

        if(extraFilter)
            filter = combineFilters(textFilter, extraFilter);
        filterTable(LESSEN_TABLE_ID, filter);
    }
    if(pageState.filterOnline) {
        setFilterInfo("Online lessen");
    } else if(pageState.filterOffline) {
        setFilterInfo("Offline lessen");
    } else {
        setFilterInfo("");
    }
}

function buildAncestorFilter(rowPreFilter: RowFilter) {
    let filteredRows = filterTableRows(def.TRIM_TABLE_ID, rowPreFilter);

    //gather the blockIds and groupIds of the matching rows and show ALL of the rows in those blocks. (not just the matching rows).
    let blockIds = [...new Set(filteredRows.filter(tr => tr.dataset.blockId !== "groupTitle").map(tr => tr.dataset.blockId))];
    let groupIds = [...new Set(filteredRows.map(tr => tr.dataset.groupId))];
    //also show all rows of headers that match the text filter.
    let headerGroupIds = [...new Set(filteredRows.filter(tr => tr.dataset.blockId === "groupTitle").map(tr => tr.dataset.groupId))];

    function siblingsAndAncestorsFilter(tr: HTMLTableRowElement, context: TrimFilterContext) {
        //display all child rows for the headers that match
        if(context.headerGroupIds.includes(tr.dataset.groupId))
            return true;
        //display all siblings of non-header rows, thus the full block
        if(context.blockIds.includes(tr.dataset.blockId))
            return true;
        //display the ancestor (header) rows of matching non-header rows
        return context.groupIds.includes(tr.dataset.groupId) && tr.classList.contains("groupHeader");
    }

    return {context: {blockIds, groupIds, headerGroupIds}, rowFilter: siblingsAndAncestorsFilter};
}

interface TrimFilterContext {
    blockIds: string[],
    groupIds: string[],
    headerGroupIds: string[],
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
    let table = document.getElementById(LESSEN_TABLE_ID) as HTMLTableElement;
    let lessen = scrapeLessenOverzicht(table);

    let checksDiv = document.createElement("div");
    checksDiv.id = "checksDiv";
    checksDiv.classList.add("badge-warning");

    let checksText = "";
    table.parentNode.insertBefore(checksDiv, table.previousSibling);
    for(let les of lessen) {
        if (les.alc) {
            if(les.online) {
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
    let table = document.getElementById(LESSEN_TABLE_ID) as HTMLTableElement;
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
    showTrimesterTable(getTrimPageElements(), !isTrimesterTableVisible());
}

export function isTrimesterTableVisible() {
    return document.getElementById(LESSEN_TABLE_ID).style.display === "none";
}

export function getTrimPageElements(){
    return <TrimElements>{
        trimTable: document.getElementById(def.TRIM_TABLE_ID),
        trimTableDiv: createTrimTableDiv(),
        lessenTable: document.getElementById(LESSEN_TABLE_ID),
        trimButton: document.getElementById(def.TRIM_BUTTON_ID)
    }
}

export function showTrimesterTable(trimElements: TrimElements, show: boolean) {
    trimElements.trimTable?.remove();
    let inputModules = scrapeModules(trimElements.lessenTable);
    let tableData = buildTableData(inputModules.trimesterModules.concat(inputModules.jaarModules));
    buildTrimesterTable(tableData, trimElements);

    trimElements.lessenTable.style.display = show ? "none" : "table";
    trimElements.trimTable.style.display = show ? "table" : "none";
    trimElements.trimButton.title = show ? "Toon normaal" : "Toon trimesters";
    setButtonHighlighted(def.TRIM_BUTTON_ID, show);
    setSorteerLine(show);
    applyFilters();
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
            showTrimesterTable(getTrimPageElements(), true);
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
            let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
            pageState.grouping = grouping;
            savePageSettings(pageState);
            showTrimesterTable(getTrimPageElements(), true);
            return false;
        };
        return anchor;
    }
}
