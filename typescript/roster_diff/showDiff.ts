import {dateDiffToString, getOptions, unreachable} from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {decorateTableHeader} from "../table/tableHeaders";
import {DayUppercase} from "../lessen/scrape";
import {DKO3_BASE_URL, OPTION_HIDE_IGNORED_DIFFS} from "../def";
import {buildAndSaveDiff, createDiffTable, DataPreparationFunction, DiffType, Dko3DiffData, getDiffsFromCloud, getUrlForWorksheet, getWwwDiffsFromCloud, JsonBasicLesMoment, JsonDiff, JsonDiffs, prepareExcelData, prepareWwwData, setIgnoredFlags, Weight} from "./buildDiff";
import {fetchDiffSettings, uploadIgnoredDiffHashes} from "../cloud";
import {InfoBarTableFetchListener} from "../table/loadAnyTable";
import {createInfoBlock} from "../infoBlock";
import {defaultIgnoreList, defaultTagDefs, DiffSettings} from "./diffSettings";
import { options } from "../plugin_options/options";
import { GradeYear } from "./excelRoster";
import {buildWwwDiff, OtherLesType} from "../www_diff/buildDiff";

export async function fetchDiffSettingsOrDefault(academie: string, schoolYear: string) {
    let settings: DiffSettings | undefined;
    try {
        settings = await fetchDiffSettings(academie, schoolYear);
    } catch {}
    if (!settings)
        return {
            version: 0,
            academie,
            schoolYear,
            tagDefs: [...defaultTagDefs],
            ignoreList: [...defaultIgnoreList]
        } satisfies DiffSettings;
    return settings;
}

export function getDiffsDko3CacheFileName(academie: string, schoolYear: string, diffType: OtherLesType) {
    return `Dko3/Uurroosters/Cache/${academie}_${schoolYear}_${diffType}_diffcache.json`;
}

export async function getAndShowDiffs(showOrCalc: "justShow" | "calcAndShow", useDkoCache: "dkoCache" | "fetchDko", diffType: OtherLesType) {
    let divResults = document.getElementById("diffResults") as HTMLDivElement;
    divResults.innerHTML = "Ophalen...";

    let divError = document.getElementById("diffErrors") as HTMLDivElement;
    let runStatus = document.getElementById("runStatus") as HTMLDivElement;
    let divInfo = document.getElementById("diffInfo") as HTMLDivElement;
    let cmbDiffAcademie = document.querySelector("#cmbDiffAcademie") as HTMLSelectElement;
    let cmbDiffSchoolYear = document.querySelector("#cmbDiffSchoolYear") as HTMLSelectElement;
    let infoBlock = createInfoBlock(divInfo, "");
    let fetchListener = new InfoBarTableFetchListener(infoBlock);
    let errors: string[] = [];
    function reportStatus(message: string, isError?: "error") {
        if(isError == "error")
            errors.push(message);
        else
            runStatus.innerHTML = message;
        divError.innerHTML = errors.join("<br>");
    }
    errors = [];
    let json: string | null = null;
    if(useDkoCache == "dkoCache")
       json = localStorage.getItem(getDiffsDko3CacheFileName(cmbDiffAcademie.value, cmbDiffSchoolYear.value, diffType));
    let dko3DiffData = json ? JSON.parse(json) as Dko3DiffData : null;
    let jsonDiffs: JsonDiffs | null = null;
    let diffSettings = await fetchDiffSettingsOrDefault(cmbDiffAcademie.value, cmbDiffSchoolYear.value);
    if(showOrCalc == "justShow") {
        try {
            jsonDiffs = await getDiffsFromCloud(cmbDiffAcademie.value, cmbDiffSchoolYear.value, diffType);
        }
        catch (e) {}
    } else {
        let divResults = document.getElementById("diffResults") as HTMLDivElement;
        divResults.innerHTML = "";
        let dataPreparationFunction: DataPreparationFunction;
        if(diffType == "excel")
            dataPreparationFunction = prepareExcelData;
        else
            dataPreparationFunction = prepareWwwData;
        jsonDiffs = await buildAndSaveDiff(reportStatus, fetchListener, cmbDiffAcademie.value, cmbDiffSchoolYear.value, dko3DiffData, diffSettings, diffType, dataPreparationFunction);
    }
    if(jsonDiffs)
        await showDiffs(jsonDiffs, cmbDiffAcademie.value, cmbDiffSchoolYear.value, dko3DiffData, diffSettings);
}

export async function showDiffs(diffs: JsonDiffs, academie: string, schoolYear: string, dko3DiffData: Dko3DiffData | null, diffSettings: DiffSettings) {
    let divResults = document.getElementById("diffResults") as HTMLDivElement;
    divResults.innerHTML = "Ophalen...";
    if(!diffs) {
        divResults.innerHTML = "";
        return;
    }
    await setIgnoredFlags(diffs.orphanedDko3Lessen, diffs.orphanedOtherLessen, academie, schoolYear);
    divResults.innerHTML = "";
    let elapsedTimeString = dateDiffToString(new Date(diffs.isoDate), new Date());
    if(elapsedTimeString != "")
        emmet.appendChild(divResults, `div.gray{Laatste vergelijking: ${elapsedTimeString} geleden.}`)
    if(options.showDebug && dko3DiffData) {
        let div = emmet.appendChild(divResults, `div.gray`).first as HTMLDivElement;
        let button = emmet.appendChild(div, "button.likeLink").first as HTMLButtonElement;
        button.innerHTML = "Zoek met dko3 cache";
        button.onclick = () => {
            getAndShowDiffs("calcAndShow", "dkoCache", "excel");
        };
    }
    let divChk = emmet.appendChild(divResults, `div#divHideChecked>(input#chkHideChecked[type="checkbox"]+label[for="chkHideChecked"]{Verberg aangevinkte lijnen})`).first as HTMLDivElement;
    let chkHideChecked = divChk.querySelector("#chkHideChecked") as HTMLInputElement;
    chkHideChecked.onchange = (ev) => {
        let input = ev.currentTarget as HTMLInputElement;
        let table = document.getElementById("orphans") as HTMLTableElement;
        table.classList.toggle("hideChecked", input.checked);
        let ignore = table.classList.contains("hideChecked");
        localStorage.setItem(OPTION_HIDE_IGNORED_DIFFS, ignore.toString());
    }
    for(let diff of diffs.diffs)
        displayDiff(diff, divResults, academie, schoolYear); //<i class="fa-solid fa-arrow-up-right-from-square"></i>

    emmet.appendChild(divResults, "h4{Lessen zonder overeenkomsten}");
    let {table, tbody} = createDiffTable(divResults);

    decorateTableHeader(table, false);
    for(let les of diffs.orphanedDko3Lessen) {
        let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
        let gotoData: DiffGotoData = {
            lesId: les.lesId,
            cellAddress: "",
            rowType: "dko3",
            url: "",
            workBook: "",
            workSheet: "",
            text: "",
        };
        fillDiffRow(tr, les, "perfect match", "dko3", gotoData, "", les.hash, les.ignore, academie, schoolYear, null);
    }
    for(let les of diffs.orphanedOtherLessen) {
        let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
        fillDiffRow(tr, les, "perfect match", "excel", les.gotoData, les.gotoData.text, les.hash, les.ignore, academie, schoolYear, null);
        tr.classList.add("excelRow");
    }
    let ingore = localStorage.getItem(OPTION_HIDE_IGNORED_DIFFS)?? "false";
    chkHideChecked.checked = ingore == "true";
    table.classList.toggle("hideChecked", chkHideChecked.checked);
}
export type StatusCallback = (message: string, isError?: "error") => void;

export function fillOtherDiffRow(tr: HTMLTableRowElement, diff: JsonDiff, academie: string, schoolYear: string) {
    fillDiffRow(tr, diff.otherLes, diff.diffType, "excel", diff.otherLes.gotoData, diff.otherLes.gotoData.text, diff.otherLes.hash, diff.otherLes.ignore, academie, schoolYear, diff.weight);
}

function displayDiff(diff: JsonDiff, divResults: HTMLDivElement, academie: string, schoolYear: string) {
    let tbody = emmet.appendChild(divResults, "table.diff>tbody").last as HTMLTableSectionElement;
    let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
    fillOtherDiffRow(tr, diff, academie, schoolYear);
    tr.classList.add("excelRow");
    let tr2 = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
    let gotoData: DiffGotoData = {
        lesId: diff.dko3Les.lesId,
        cellAddress: "",
        rowType: "dko3",
        url: "",
        workBook: "",
        workSheet: "",
        text: "",
    };
    fillDiffRow(tr2, diff.dko3Les, diff.diffType, "dko3", gotoData, "", diff.dko3Les.hash, diff.dko3Les.ignore, academie, schoolYear, diff.weight);
}

export function fillDiffRow(tr: HTMLTableRowElement, jsonLes: JsonBasicLesMoment, diffType: DiffType, rowType: ("excel" | "dko3"), gotoData: DiffGotoData, orgText: string, hash: string, ignore: boolean, academie: string, schoolYear: string, weight: Weight | null) {
    if(ignore)
        tr.classList.add("ignore");
    let diffTeacherClass: string = "";
    let diffGradeYearsClass: string = "";
    let diffLocationClass: string = "";
    let diffTimeClass: string = "";
    let diffSubjectClass: string = "";
    if(weight) {
        if(weight.diffSubject) diffSubjectClass = ".diff";
        if(weight.diffLocation) diffLocationClass = ".diff";
        if(weight.diffGradeYears) diffGradeYearsClass = ".diff";
        if(weight.diffTeacher) diffTeacherClass = ".diff";
        if(weight.diffDayTime) diffTimeClass = ".diff";
    }
    if(!jsonLes.location) {
        jsonLes.location = "-onbekend-";
        diffLocationClass = ".diff";
    }
    let tdSubjects: string;
    let strSubjects = jsonLes.subjects;
    if(jsonLes.subjects == "") {
        diffSubjectClass = ".diff";
        strSubjects = "-onbekend-";
    }
    if(rowType == "excel")
        tdSubjects = `(td${diffSubjectClass}>div.diffTooltip{${strSubjects}}>span.diffTooltiptext{${orgText}})`;
    else
        tdSubjects = `td${diffSubjectClass}{${jsonLes.subjects}}`;
    let iconClass = rowType == "excel" ? "fa-grid" : "fa-chalkboard-user";
    tr.dataset.hash = hash;
    tr.dataset.lesId = gotoData.lesId;
    tr.dataset.cellAddress = gotoData.cellAddress;
    tr.dataset.workbook = gotoData.workBook;
    tr.dataset.worksheet = gotoData.workSheet;
    tr.dataset.rowType = gotoData.rowType;
    tr.dataset.url = gotoData.url;
    emmet.appendChild(tr, `${tdSubjects}+td${diffGradeYearsClass}{${GradeYear.toString(jsonLes.gradeYears)}}+td${diffTeacherClass}{${jsonLes.teachers}}+td${diffTimeClass}{${toCompactDayString(jsonLes.day as DayUppercase)}}+td${diffTimeClass}{${jsonLes.timeSlice}}+td${diffLocationClass}{${jsonLes.location}}+(td.buttonshow>button.goto>i.fas.${iconClass})+(td.button>button.goto.chkHide>i.fas.fa-check)`)
    let btnGoto = tr.querySelector("button.goto") as HTMLButtonElement;
    btnGoto.onclick = (ev) => gotoSource(ev, academie, schoolYear);
    let btnHide = tr.querySelector("button.chkHide") as HTMLButtonElement;
    btnHide.onclick = (ev) => toggleIgnore(ev, academie, schoolYear);
}

async function toggleIgnore(ev: MouseEvent, academie: string, schoolYear: string) {
    let button = ev.currentTarget as HTMLButtonElement;
    let tr = button.closest("tr") as HTMLTableRowElement;
    tr.classList.toggle("ignore");
    await saveIgnoredHashes(academie, schoolYear);
}

async function saveIgnoredHashes(academie: string, schoolYear: string) {
    let table = document.getElementById("orphans") as HTMLTableElement;
    let hashes = [...table.querySelectorAll("tr.ignore") as NodeListOf<HTMLTableRowElement>]
        .map(tr => tr.dataset.hash as string);
    await uploadIgnoredDiffHashes(academie, schoolYear, hashes);
}

export interface DiffGotoData {
    rowType: "excel" | "dko3" | "www";
    cellAddress: string;
    workBook: string;
    workSheet: string;
    lesId: string;
    url: string;
    text: string;
}

async function gotoSource(ev: MouseEvent, academie: string, schoolYear: string) {
    let button = ev.currentTarget as HTMLButtonElement;
    let tr = button.closest("tr") as HTMLTableRowElement;
    let rowType = tr.dataset.rowType as ("excel" | "dko3" | "www"); //todo: use a type for this
    let cellAddress = tr.dataset.cellAddress!;
    let workBook = tr.dataset.workbook!;
    let workSheet = tr.dataset.worksheet!;
    let lesId = tr.dataset.lesId;
    let url = tr.dataset.url!;

    if(rowType == "excel") {
        let url = await getUrlForWorksheet(workBook, workSheet, cellAddress, academie, schoolYear);
        if(url == "") {
            alert("Geen url naar het Excel bestand. Plak de url in het Excelbestand en geef de cel de naam 'Url'. Stuur de gegevens terug door.");
            return;
        }
        // https:/...&activeCell=Definitief!Y24
        window.open(url, "_blank");
    }
    else if(rowType == "dko3") {
        location.href =  DKO3_BASE_URL + "#lessen-les?id="+lesId;
    }
    else if(rowType == "www") {
        window.open(url, '_blank')!.focus();
    }
}

function toCompactDayString(day: DayUppercase): string {
    switch (day) {
        case "MAANDAG": return "ma ";
        case "DINSDAG": return "di ";
        case "WOENSDAG": return "wo ";
        case "DONDERDAG": return "do ";
        case "VRIJDAG": return "vr ";
        case "ZATERDAG": return "za ";
        case "ZONDAG": return "zo ";
        case "": return "?? ";
        default: unreachable(day);
    }
}

// zero based position!
export function excelPostoExcelAddress(row: number, column: number) {
    return indexToExcelColumn(column) + (row + 1).toString();
}

function indexToExcelColumn(index: number): string {
    let quotient = Math.floor(index / 26);
    if (quotient <= 0)
        return chars[index];

    return indexToExcelColumn(quotient-1) + chars[index % 26];
}
const chars: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];