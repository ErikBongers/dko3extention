import {scrapeModules} from "./scrape";
import {buildTableData, connvertToewijzingenToModules} from "./convert";
import {buildTrimesterTable, getDefaultPageSettings, getSavedNameSorting, LessenPageState, NameSorting, setSavedNameSorting, TrimElements, TrimesterGrouping} from "./build";
import * as def from "../def";
import {LESSEN_TABLE_ID} from "../def";
import {Schoolyear, setButtonHighlighted, setViewFromCurrentUrl} from "../globals";
import {HashObserver} from "../pageObserver";
import * as html from "../../libs/Emmeter/html";
import {emmet} from "../../libs/Emmeter/html";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState} from "../gotoState";
import {addFilterFields, applyFilters} from "./filter";
import {getPageSettings, savePageSettings} from "../pageState";
import {FIELD, WerklijstBuilder} from "../table/werklijstBuilder";
import {Domein, Grouping} from "../werklijst/criteria";
import {FetchedTable} from "../table/tableFetcher";

export default new HashObserver("#lessen-overzicht", onMutation);

function onMutation (mutation: MutationRecord) {
    let btnZoek = document.getElementById("btn_lessen_overzicht_zoeken");
    if(btnZoek) {
        if (!document.getElementById("btn_show_trimesters")) {
            let {first} = emmet.insertAfter(btnZoek,
                "button.btn.btn-sm.btn-primary.w-100.mt-1#btn_show_trimesters>i.fas.fa-sitemap+{ Toon trimesters}");
            (first as HTMLElement).onclick = onClickShowTrimesters;
        }
    }

    let lessenOverzicht = document.getElementById(def.LESSEN_OVERZICHT_ID);
    if (mutation.target !== lessenOverzicht) {
        return false;
    }

    let pageState = getGotoStateOrDefault(PageName.Lessen);
    switch (pageState.goto) {
        case Goto.Lessen_trimesters_set_filter:
            pageState.goto = Goto.None;
            saveGotoState(pageState);
            onClickShowTrimesters();
            return true;
        case Goto.Lessen_trimesters_show:
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
        document.getElementById("lessen_overzicht").innerHTML = text;
        showTrimesterTable(decorateTable(), true);
    });
}

async function setTrimesterFilterAndFetch() {
    let params = new URLSearchParams({
        schooljaar: Schoolyear.findInPage(),
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
    let url = def.DKO3_BASE_URL+"views/lessen/overzicht/index.filters.php";
    await fetch(url+"?" + params);
    url = def.DKO3_BASE_URL+"views/lessen/overzicht/index.lessen.php";
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

    if (hasModules) {
        addButton(printButton, def.TRIM_BUTTON_ID, "Toon trimesters", onClickToggleTrimesters, "fa-sitemap");
    }
    addFilterFields();

    return getTrimPageElements();
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

export async function getJaarToewijzigingWerklijst(schoolYear: string) {
    let builder = new WerklijstBuilder(schoolYear);
    builder.addDomeinen([Domein.Muziek]);
    builder.addVakken([
        "instrumentinitiatie – hele jaar zelfde instrument - accordeon",
        "instrumentinitiatie – hele jaar zelfde instrument - bagglama (saz)",
        "instrumentinitiatie – hele jaar zelfde instrument - cello",
        "instrumentinitiatie – hele jaar zelfde instrument - dwarsfluit",
        "instrumentinitiatie – hele jaar zelfde instrument - gitaar",
        "instrumentinitiatie – hele jaar zelfde instrument - harp",
        "instrumentinitiatie – hele jaar zelfde instrument - klarinet",
        "instrumentinitiatie – hele jaar zelfde instrument - saxofoon",
        "instrumentinitiatie – hele jaar zelfde instrument - slagwerk",
        "instrumentinitiatie – hele jaar zelfde instrument - trombone",
        "instrumentinitiatie – hele jaar zelfde instrument - trompet",
        "instrumentinitiatie – hele jaar zelfde instrument - viool",
        "instrumentinitiatie – hele jaar zelfde instrument - zang",
    ]);
    builder.addFields([FIELD.VAK_NAAM, FIELD.LESMOMENTEN, FIELD.KLAS_LEERKRACHT, FIELD.GRAAD_LEERJAAR]);
    let table = await builder.getTable(Grouping.LEERLING);
    await setViewFromCurrentUrl();
    return table;
}

export async function showTrimesterTable(trimElements: TrimElements, show: boolean) {
    trimElements.trimTable?.remove();
    let toewijzingTable: FetchedTable;
    let schoolYear = Schoolyear.findInPage();
    if(schoolYear === "2024-2025")
        toewijzingTable = undefined;
    else
        toewijzingTable = await getJaarToewijzigingWerklijst(schoolYear);
    let inputModules = scrapeModules(trimElements.lessenTable, toewijzingTable);
    let toewijzingModules  =  connvertToewijzingenToModules(inputModules.jaarToewijzingen);
    console.log(toewijzingModules);
    inputModules.jaarModules = inputModules.jaarModules.concat(...toewijzingModules.values());
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
        newGroupingDiv = emmet.insertAfter(oldSorteerSpan, "div#trimGroepeerDiv.text-muted").first as HTMLElement;
    }
    let newSortingDiv = document.getElementById("trimSorteerDiv");
    if(!newSortingDiv) {
        html.emmet.insertBefore(newGroupingDiv, 'div#trimSorteerDiv.text-muted');
        addSortingAnchorOrText();
    }
    newGroupingDiv.innerText = "Groepeer: ";
    oldSorteerSpan.style.display = showTrimTable ? "none" : "";
    newGroupingDiv.style.display = showTrimTable ? "" : "none";

    appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.InstrumentTeacherHour, pageState.grouping, "");
    appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.TeacherInstrumentHour, pageState.grouping, " | ");
    appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.TeacherHour, pageState.grouping, " | ");
    appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.Instrument, pageState.grouping, " | ");
    appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.Teacher, pageState.grouping, " | ");
}

function appendGroupingAnchorOrText(target: HTMLElement, grouping: TrimesterGrouping, activeSorting: TrimesterGrouping, separator: string) {
    let sortingText = "";
    switch (grouping) {
        case TrimesterGrouping.InstrumentTeacherHour: sortingText = "instrument+leraar+lesuur"; break;
        case TrimesterGrouping.TeacherInstrumentHour: sortingText = "leraar+instrument+lesuur"; break;
        case TrimesterGrouping.TeacherHour: sortingText = "leraar+lesuur"; break;
        case TrimesterGrouping.InstrumentHour: sortingText = "instrument+lesuur"; break;
        case TrimesterGrouping.Instrument: sortingText = "instrument"; break;
        case TrimesterGrouping.Teacher: sortingText = "leraar"; break;
    }

    if(separator)
        separator = "{"+separator+"}+";

    if (activeSorting === grouping) {
        emmet.appendChild(target,  separator + "strong{" + sortingText + "}");
    } else {
        let button = emmet.appendChild(target, separator + "button.likeLink{" + sortingText + "}").last as HTMLButtonElement;
        button.onclick = () => {
            let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
            pageState.grouping = grouping;
            savePageSettings(pageState);
            showTrimesterTable(getTrimPageElements(), true);
            return false;
        };
    }
}