import {HashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {getDiffsCloudFileName, getDiffsFromCloud, JsonDiffs} from "../roster_diff/buildDiff";
import {fillExcelDiffRow} from "../roster_diff/showDiff";
import {Schoolyear} from "../globals";
import {getDiffDirStructure, getDiffMyAcademieFolder} from "../startPage/diffPage";

class LesObserver extends HashObserver {
    constructor() {
        super( "#lessen-les", onMutation );
    }
    isPageReallyLoaded(): boolean {
        return document.querySelectorAll("#les_leerlingen_leerlingen > span").length > 0;
    }
}
export default new LesObserver();

function onMutation(mutation: MutationRecord) {
    let tabLeerlingen = document.getElementById("les_leerlingen_leerlingen");
    if (mutation.target === tabLeerlingen) {
        onLeerlingenChanged();
        return true;
    }
    let titleHeader = document.getElementById("vh_header_lessen_les_left_title") as HTMLElement;
    if(titleHeader && !titleHeader.classList.contains("diffSearched")) {
        titleHeader.classList.add("diffSearched");
        let academie = localStorage.getItem("diffLastAcademie");
        let schoolYear = localStorage.getItem("diffLastSchoolYear");
        if(academie && schoolYear)
            addDiff(titleHeader, academie, schoolYear).then(r => {});
    }
    return false;
}

async function scrapeDiffsAcademieAndSchoolYear() {
    let dirs = await getDiffDirStructure();
    let academieFolder = getDiffMyAcademieFolder(dirs);
    let schoolYear = Schoolyear.findInPage();
    return {academieFolder, schoolYear};
}

function onLeerlingenChanged() {
    console.log("Les-Leerlingen changed.")
    addSortVoornaamLink();
}

function addSortVoornaamLink() {
    try {
        let headerSpans = document.querySelectorAll("#les_leerlingen_leerlingen > span");
        let sortSpan = Array.from(headerSpans).find((value: HTMLSpanElement) => value.textContent.includes("gesorteerd op:"))!;
        let graadEnNaam = Array.from(sortSpan.querySelectorAll("a")).find(anchor => anchor.textContent === "graad en naam")!;
        const SORT_VOORNAAM_ID = "dko_plugin_sortVoornaam";
        if(document.getElementById(SORT_VOORNAAM_ID))
            return;
        let anchorSortVoornaam = document.createElement("a");
        anchorSortVoornaam.id = SORT_VOORNAAM_ID;
        anchorSortVoornaam.href = "#";
        anchorSortVoornaam.innerText = "voornaam";
        anchorSortVoornaam.classList.add("text-muted");
        anchorSortVoornaam.onclick = onSortVoornaam;
        sortSpan.insertBefore(anchorSortVoornaam, graadEnNaam);
        sortSpan.insertBefore(document.createTextNode(" | "), graadEnNaam);
    }
    catch (e) {}
}

function onSortVoornaam(event: MouseEvent) {
    sortVoornaam(event);
    switchNaamVoornaam(event);
    return false;
}

function sortVoornaam(event: MouseEvent) {
    let rows: HTMLTableRowElement[] = Array.from(document.querySelectorAll("#les_leerlingen_leerlingen > table > tbody > tr"));

    rows.sort((tr1, tr2) => {
        let name1 = tr1.querySelector("td > strong")!.textContent;
        let name2 = tr2.querySelector("td > strong")!.textContent;
        let voornaam1 = name1.split(",").pop()!;
        let voornaam2 = name2.split(",").pop()!;
        return voornaam1.localeCompare(voornaam2);
    });

    let table: HTMLTableElement = document.querySelector("#les_leerlingen_leerlingen > table")!;
    rows.forEach(row => table.tBodies[0].appendChild(row));

    Array.from(document.querySelectorAll("#les_leerlingen_leerlingen > span > a"))
        .forEach((a) => a.classList.add("text-muted"));
    (event.target as HTMLElement).classList.remove("text-muted");
}

function switchNaamVoornaam(_event: MouseEvent) {
    let rows: HTMLTableRowElement[] = Array.from(document.querySelectorAll("#les_leerlingen_leerlingen > table > tbody > tr"));

    rows.forEach((tr) => {
        let strong = tr.querySelector("td > strong")!;
        let name = strong.textContent;
        let split = name.split(",");
        let voornaam = split.pop() ?? "";
        let naam = split.pop() ?? "";
        strong.textContent = voornaam + " " + naam;
    });
}

function getDiffsLocalFirst(academie: string, schoolYear: string) {
    let fileName = getDiffsCloudFileName(academie, schoolYear);
    let jsonDiff = sessionStorage.getItem(fileName);
    if(jsonDiff)
        return JSON.parse(jsonDiff) as JsonDiffs;
    return getDiffsFromCloud(academie, schoolYear);
}

async function addDiff(titleHeader: HTMLElement, academie: string, schoolYear: string) {
    let divDiff = document.querySelector("div.diff") as HTMLDivElement;
    if(divDiff)
        return;

    divDiff = emmet.insertAfter(titleHeader, "div.diff").first as HTMLDivElement;
    let diffs = await getDiffsLocalFirst(academie, schoolYear);
    if(!diffs)
        return;
    let rxId = /id=(\d+)/g;
    let matches = rxId.exec(document.location.href);
    let lesId = matches![1];
    let diff = diffs.diffs.find(diff => diff.dko3Les.lesId == lesId);
    if(diff) {
        let tbody = emmet.appendChild(divDiff, "table.diff>tbody").last as HTMLTableSectionElement;
        let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
        fillExcelDiffRow(tr, diff, academie, schoolYear);
        return;
    }

    //todo: orphans.
}
