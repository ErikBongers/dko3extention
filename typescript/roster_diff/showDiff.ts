import {dateDiffToString, unreachable} from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {decorateTableHeader} from "../table/tableHeaders";
import {DayUppercase} from "../lessen/scrape";
import {DKO3_BASE_URL, OPTION_HIDE_IGNORED_DIFFS, OPTION_HIDE_NO_TEACHER_DIFFS} from "../def";
import {buildAndSaveDiff, createDiffTable, DataPreparationFunction, Dko3DiffData, getDiffsFromCloud, getUrlForWorksheet, JsonBasicLesMoment, JsonDiff, JsonDiffs, prepareExcelData, prepareWwwData, setIgnoredFlags} from "./buildDiff";
import {fetchDiffSettings, uploadIgnoredDiffHashes} from "../cloud";
import {InfoBarTableFetchListener} from "../table/loadAnyTable";
import {createInfoBlock} from "../infoBlock";
import {defaultIgnoreList, defaultTagDefs, DiffSettings} from "./diffSettings";
import {options} from "../plugin_options/options";
import {OtherLesType} from "../www_diff/buildDiff";
import {DiffType, GradeYear, Weight} from "./calcDiff";

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

export interface StatusBlock {
    runStatus: HTMLDivElement;
    divInfo: HTMLDivElement;
    divError: HTMLDivElement;
    divResults: HTMLDivElement;
}
export function createStatusBlock(divInfoWrapper: HTMLDivElement) {
    emmet.appendChild(divInfoWrapper, "div.runStatus");
    emmet.appendChild(divInfoWrapper, 'div.diffInfo');
    emmet.appendChild(divInfoWrapper, 'div.diffErrors.errors');
    emmet.appendChild(divInfoWrapper, "div.diffResults");
}

function getStatusBlock(divInfoWrapper: HTMLDivElement) {
    let runStatus = divInfoWrapper.querySelector(".runStatus") as HTMLDivElement;
    let divInfo = divInfoWrapper.querySelector(".diffInfo") as HTMLDivElement;
    let divError = divInfoWrapper.querySelector(".diffErrors") as HTMLDivElement;
    let divResults = divInfoWrapper.querySelector(".diffResults") as HTMLDivElement;
    return {runStatus, divInfo, divError, divResults} as StatusBlock;
}

export async function getAndShowDiffs(showOrCalc: "justShow" | "calcAndShow", useDkoCache: "dkoCache" | "fetchDko", diffType: OtherLesType) {
    let statusBlock = getStatusBlock(document.getElementById(diffType == "excel"? "wrapperExcelDiffs" : "wrapperWwwDiffs") as HTMLDivElement);
    statusBlock.divResults.innerHTML = "Ophalen...";

    let cmbDiffAcademie = document.querySelector("#cmbDiffAcademie") as HTMLSelectElement;
    let cmbDiffSchoolYear = document.querySelector("#cmbDiffSchoolYear") as HTMLSelectElement;
    let infoBlock = createInfoBlock(statusBlock.divInfo, "");
    let fetchListener = new InfoBarTableFetchListener(infoBlock);
    let errors: string[] = [];
    function reportStatus(message: string, isError?: "error") {
        if(isError == "error")
            errors.push(message);
        else
            statusBlock.runStatus.innerHTML = message;
        statusBlock.divError.innerHTML = errors.join("<br>");
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
        statusBlock.divResults.innerHTML = "";
        let dataPreparationFunction: DataPreparationFunction;
        if(diffType == "excel")
            dataPreparationFunction = prepareExcelData;
        else
            dataPreparationFunction = prepareWwwData;
        jsonDiffs = await buildAndSaveDiff(reportStatus, fetchListener, cmbDiffAcademie.value, cmbDiffSchoolYear.value, dko3DiffData, diffSettings, diffType, dataPreparationFunction);
    }
    if(jsonDiffs)
        await showDiffs(jsonDiffs, cmbDiffAcademie.value, cmbDiffSchoolYear.value, dko3DiffData, diffSettings, statusBlock, diffType);
}

export async function showDiffs(diffs: JsonDiffs, academie: string, schoolYear: string, dko3DiffData: Dko3DiffData | null, diffSettings: DiffSettings, statusBlock: StatusBlock, diffType: OtherLesType) {
    statusBlock.divResults.innerHTML = "Ophalen...";
    if(!diffs) {
        statusBlock.divResults.innerHTML = "";
        return;
    }
    await setIgnoredFlags(diffs.orphanedDko3Lessen, diffs.orphanedOtherLessen, academie, schoolYear);
    statusBlock.divResults.innerHTML = "";
    let elapsedTimeString = dateDiffToString(new Date(diffs.isoDate), new Date());
    if(elapsedTimeString != "")
        emmet.appendChild(statusBlock.divResults, `div.gray{Laatste vergelijking: ${elapsedTimeString} geleden.}`)
    if(options.showDebug && dko3DiffData) {
        let div = emmet.appendChild(statusBlock.divResults, `div.gray`).first as HTMLDivElement;
        let button = emmet.appendChild(div, "button.likeLink").first as HTMLButtonElement;
        button.innerHTML = "Zoek met dko3 cache";
        button.onclick = () => {
            getAndShowDiffs("calcAndShow", "dkoCache", "excel");
        };
    }
    let divChk = emmet.appendChild(statusBlock.divResults, `div#divHideChecked>(input#chkHideChecked${diffType}[type="checkbox"]+label[for="chkHideChecked${diffType}"]{Verberg aangevinkte lijnen})`).first as HTMLDivElement;
    let chkHideChecked = divChk.querySelector(`#chkHideChecked${diffType}`) as HTMLInputElement;
    chkHideChecked.onchange = (ev) => {
        let input = ev.currentTarget as HTMLInputElement;
        let table = document.getElementById(`orphans${diffType}`) as HTMLTableElement;
        table.classList.toggle("hideChecked", input.checked);
        let ignore = table.classList.contains("hideChecked");
        localStorage.setItem(OPTION_HIDE_IGNORED_DIFFS+diffType, ignore.toString());
    }
    emmet.appendChild(divChk, `
        div>(
            input#chkHideNoTeacher${diffType}[type="checkbox"]+
            label[for="chkHideNoTeacher${diffType}"]{Verberg nog te bepalen leraren}
        )
    `);
    let chkHideNoTeacher = divChk.querySelector(`#chkHideNoTeacher${diffType}`) as HTMLInputElement;
    chkHideNoTeacher.onchange = (ev) => {
        let input = ev.currentTarget as HTMLInputElement;
        statusBlock.divResults.classList.toggle("hideNoTeacher", input.checked);
        let hideNoTeacher = statusBlock.divResults.classList.contains("hideNoTeacher");
        localStorage.setItem(OPTION_HIDE_NO_TEACHER_DIFFS+diffType, hideNoTeacher.toString());
    }
    for(let diff of diffs.diffs)
        displayDiff(diff, statusBlock.divResults, academie, schoolYear); //<i class="fa-solid fa-arrow-up-right-from-square"></i>

    emmet.appendChild(statusBlock.divResults, "h4{Lessen zonder overeenkomsten}");
    let {table, tbody} = createDiffTable(statusBlock.divResults);

    decorateTableHeader(table, false);
    for(let les of diffs.orphanedDko3Lessen) {
        let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
        fillDiffRow(tr, les, "perfect match", createDko3GotoData(les.lesId), "", les.hash, les.ignore, academie, schoolYear, null);
    }
    for(let les of diffs.orphanedOtherLessen) {
        let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
        fillDiffRow(tr, les, "perfect match", les.gotoData, les.gotoData.text, les.hash, les.ignore, academie, schoolYear, null);
        tr.classList.add("excelRow");
    }
    let ignore = localStorage.getItem(OPTION_HIDE_IGNORED_DIFFS+diffType)?? "false";
    chkHideChecked.checked = ignore == "true";
    table.classList.toggle("hideChecked", chkHideChecked.checked);

    let hideNoTeacher = localStorage.getItem(OPTION_HIDE_NO_TEACHER_DIFFS+diffType)?? "false";
    chkHideNoTeacher.checked = hideNoTeacher == "true";
    statusBlock.divResults.classList.toggle("hideNoTeacher", chkHideNoTeacher.checked);
}
export type StatusCallback = (message: string, isError?: "error") => void;

export function fillOtherDiffRow(tr: HTMLTableRowElement, diff: JsonDiff, academie: string, schoolYear: string) {
    fillDiffRow(tr, diff.otherLes, diff.diffType, diff.otherLes.gotoData, diff.otherLes.gotoData.text, diff.otherLes.hash, diff.otherLes.ignore, academie, schoolYear, diff.weight);
}

function displayDiff(diff: JsonDiff, divResults: HTMLDivElement, academie: string, schoolYear: string) {
    let tbody = emmet.appendChild(divResults, "table.diff>tbody").last as HTMLTableSectionElement;
    let trTop = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
    let trBottom = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
    let trOther = trTop;
    let trDko3 = trBottom;
    if(diff.otherLes.lesType == "www") {
        trOther = trBottom;
        trDko3 = trTop;
    }

    let diffOnlyTeacher = !diff.weight.diffDayTime && diff.weight.diffGradeYears == 0 && !diff.weight.diffLocation && !diff.weight.diffSubject && diff.weight.diffTeacher;
    tbody.parentElement!.classList.toggle("justNoTeacher", diffOnlyTeacher && diff.otherLes.teachers.includes("nog te bepalen"));


    fillOtherDiffRow(trOther, diff, academie, schoolYear);
    fillDiffRow(trDko3, diff.dko3Les, diff.diffType, createDko3GotoData(diff.dko3Les.lesId), "", diff.dko3Les.hash, diff.dko3Les.ignore, academie, schoolYear, diff.weight);
}

export function fillDiffRow(tr: HTMLTableRowElement, jsonLes: JsonBasicLesMoment, diffType: DiffType, gotoData: DiffGotoData, orgText: string, hash: string, ignore: boolean, academie: string, schoolYear: string, weight: Weight | null) {
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
    if(jsonLes.lesType != "dko3")
        tdSubjects = `(td${diffSubjectClass}>div.diffTooltip{${strSubjects}}>span.diffTooltiptext{${orgText}})`;
    else
        tdSubjects = `td${diffSubjectClass}{${jsonLes.subjects}}`;
    tr.classList.add(jsonLes.lesType+"Row");
    let iconClass: string;
    switch (jsonLes.lesType) {
        case "excel": iconClass = "fa-grid"; break;
        case "dko3": iconClass = "fa-chalkboard-user"; break;
        case "www": iconClass = "fa-globe"; break;
        default: unreachable(jsonLes.lesType);
    }
    tr.dataset.hash = hash;
    tr.dataset.lesId = gotoData.lesId;
    tr.dataset.cellAddress = gotoData.cellAddress;
    tr.dataset.workbook = gotoData.workBook;
    tr.dataset.worksheet = gotoData.workSheet;
    tr.dataset.rowType = gotoData.rowType;
    tr.dataset.url = gotoData.url;
    emmet.appendChild(tr, `${tdSubjects}+
        td${diffGradeYearsClass}{${GradeYear.toString(jsonLes.gradeYears)}}+
        td${diffTeacherClass}{${jsonLes.teachers}}+
        td${diffTimeClass}{${toCompactDayString(jsonLes.day as DayUppercase)}}+
        td${diffTimeClass}{${jsonLes.timeSlice}}+
        td${diffLocationClass}{${jsonLes.location}}+
        (td.buttonshow>button.goto>i.fas.${iconClass})+
        (td.button>button.goto.chkHide>i.fas.fa-check)
    `);
    let btnGoto = tr.querySelector("button.goto") as HTMLButtonElement;
    btnGoto.onclick = (ev) => gotoSource(ev, academie, schoolYear);
    let btnHide = tr.querySelector("button.chkHide") as HTMLButtonElement;
    btnHide.onclick = (ev) => toggleIgnore(ev, academie, schoolYear, "excel"); //todo: this is wrong!!!! Should be excel or www, based on the page tab we're at.
}

async function toggleIgnore(ev: MouseEvent, academie: string, schoolYear: string, diffType: OtherLesType) {
    let button = ev.currentTarget as HTMLButtonElement;
    let tr = button.closest("tr") as HTMLTableRowElement;
    tr.classList.toggle("ignore");
    await saveIgnoredHashes(academie, schoolYear, diffType);
}

async function saveIgnoredHashes(academie: string, schoolYear: string, diffType: OtherLesType) {
    let table = document.getElementById(`orphans${diffType}`) as HTMLTableElement;
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

function createDko3GotoData(lesId: string) {
    return {
        lesId,
        cellAddress: "",
        rowType: "dko3",
        url: "",
        workBook: "",
        workSheet: "",
        text: "",
    } satisfies DiffGotoData as DiffGotoData;

}

type DiffRowType = "excel" | "dko3" | "www";

async function gotoSource(ev: MouseEvent, academie: string, schoolYear: string) {
    let button = ev.currentTarget as HTMLButtonElement;
    let tr = button.closest("tr") as HTMLTableRowElement;
    let rowType = tr.dataset.rowType as DiffRowType;
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