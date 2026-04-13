import {dateDiffToString, unreachable} from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {decorateTableHeader} from "../table/tableHeaders";
import {DayUppercase} from "../lessen/scrape";
import {DKO3_BASE_URL, OPTION_HIDE_IGNORED_DIFFS} from "../def";
import {createDiffTable, DiffType, getUrlForWorksheet, JsonDiff, JsonDiffs, setIgnoredFlags} from "./buildDiff";
import {uploadIgnoredDiffHashes} from "../cloud";

export async function showDiffs(diffs: JsonDiffs) {
    await setIgnoredFlags(diffs.orphanedDko3Lessen, diffs.orphanedExcelLessen);
    let divResults = document.getElementById("diffResults") as HTMLDivElement;
    divResults.innerHTML = "";
    let elapsedTimeString = dateDiffToString(new Date(diffs.isoDate), new Date());
    if(elapsedTimeString != "")
        emmet.appendChild(divResults, `p{Laatste vergelijking: ${elapsedTimeString} geleden.}`)
    let chkHideChecked = emmet.appendChild(divResults, `input#chkHideChecked[type="checkbox"]+label[for="chkHideChecked"]{Verberg aangevinkte lijnen}`).first as HTMLInputElement;
    chkHideChecked.onchange = (ev) => {
        let input = ev.currentTarget as HTMLInputElement;
        let table = document.getElementById("orphans") as HTMLTableElement;
        table.id = "table_diffs";
        table.classList.toggle("hideChecked", input.checked);
        let ignore = table.classList.contains("hideChecked");
        localStorage.setItem(OPTION_HIDE_IGNORED_DIFFS, ignore.toString());
    }
    for(let diff of diffs.diffs)
        displayDiff(diff, divResults); //<i class="fa-solid fa-arrow-up-right-from-square"></i>

    emmet.appendChild(divResults, "h4{Lessen zonder overeenkomsten}");
    let {table, tbody} = createDiffTable(divResults);

    decorateTableHeader(table, false);
    for(let les of diffs.orphanedDko3Lessen) {
        let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
        fillDiffRow(tr, les.subject, les.teacher, les.day, les.timeSlice, les.location, "perfect match", "dko3", les.momentId, "", les.lesId, "", "", les.hash, les.ignore);
    }
    for(let les of diffs.orphanedExcelLessen) {
        let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
        fillDiffRow(tr, les.subject, les.teacher, les.day as DayUppercase, les.timeSlice, les.location, "perfect match", "excel", excelPostoExcelAddress(les.excelRow, les.excelColumn), les.cellValue, "", les.workBook, les.workSheet, les.hash, les.ignore);
        tr.classList.add("excelRow");
    }
    let ingore = localStorage.getItem(OPTION_HIDE_IGNORED_DIFFS)?? "false";
    chkHideChecked.checked = ingore == "true";
    table.classList.toggle("hideChecked", chkHideChecked.checked);
}

export function fillExcelDiffRow(tr: HTMLTableRowElement, diff: JsonDiff) {
    fillDiffRow(tr, diff.excelLes.subject, diff.excelLes.teacher, diff.excelLes.day as DayUppercase, diff.excelLes.timeSlice, diff.excelLes.location, diff.diffType, "excel", excelPostoExcelAddress(diff.excelLes.excelRow, diff.excelLes.excelColumn), diff.excelLes.cellValue, "", diff.excelLes.workBook, diff.excelLes.workSheet, diff.excelLes.hash, diff.excelLes.ignore);
}

function displayDiff(diff: JsonDiff, divResults: HTMLDivElement) {
    let tbody = emmet.appendChild(divResults, "table.diff>tbody").last as HTMLTableSectionElement;
    let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
    fillExcelDiffRow(tr, diff);
    tr.classList.add("excelRow");
    let tr2 = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
    fillDiffRow(tr2, diff.dko3Les.subject, diff.dko3Les.teacher, diff.dko3Les.day as DayUppercase, diff.dko3Les.timeSlice, diff.dko3Les.location, diff.diffType, "dko3", diff.dko3Les.momentId, "", diff.dko3Les.lesId, "", "", diff.dko3Les.hash, diff.dko3Les.ignore);
}

export function fillDiffRow(tr: HTMLTableRowElement, subjects: string, teachers: string, day: DayUppercase, timeSlice: string, location: string, diffType: DiffType, rowType: ("excel" | "dko3"), rowId: string, cellValue: string, lesId: string, workBook: string ,worksheet: string, hash: string, ignore: boolean) {
    if(ignore)
        tr.classList.add("ignore");
    let diffTeacherClass: string = "";
    let diffLocationClass: string = "";
    let diffTimeClass: string = "";
    let diffDayClass: string = "";
    let diffSubjectClass: string = "";
    switch (diffType) {
        case "match without location": diffLocationClass = ".diff"; break;
        case "match without teacher": diffTeacherClass = ".diff"; break;
        case "match without time": diffTimeClass = ".diff"; break;
        case "match without time and day": diffTimeClass = ".diff"; diffDayClass = ".diff"; break;
        case "match without teacher, time and day": diffTeacherClass= ".diff"; diffTimeClass = ".diff"; diffDayClass = ".diff"; break;
        case "perfect match": break;
        default: unreachable(diffType);
    }
    if(!location) {
        location = "-onbekend-";
        diffLocationClass = ".diff";
    }
    let tdSubjects: string;
    if(subjects == "") {
        diffSubjectClass = ".diff";
        tdSubjects = `(td${diffSubjectClass}>div.diffTooltip{-onbekend-}>span.diffTooltiptext{${cellValue}})`;
    } else
        tdSubjects = `td${diffSubjectClass}{${subjects}}`;
    let iconClass = rowType == "excel" ? "fa-grid" : "fa-chalkboard-user";
    tr.dataset.lesId = lesId;
    tr.dataset.hash = hash;
    tr.dataset.cellAddress = rowId;
    tr.dataset.workbook = workBook;
    tr.dataset.worksheet = worksheet;
    tr.dataset.rowType = rowType;
    emmet.appendChild(tr, `${tdSubjects}+td${diffTeacherClass}{${teachers}}+td${diffDayClass}{${toCompactDayString(day as DayUppercase)}}+td${diffTimeClass}{${timeSlice}}+td${diffLocationClass}{${location}}+(td.buttonshow>button.goto>i.fas.${iconClass})+(td.button>button.goto.chkHide>i.fas.fa-check)`)
    let btnGoto = tr.querySelector("button.goto") as HTMLButtonElement;
    btnGoto.onclick = gotoData;
    let btnHide = tr.querySelector("button.chkHide") as HTMLButtonElement;
    btnHide.onclick = toggleIgnore;
}

async function toggleIgnore(ev: MouseEvent) {
    let button = ev.currentTarget as HTMLButtonElement;
    let tr = button.closest("tr") as HTMLTableRowElement;
    tr.classList.toggle("ignore");
    await saveIgnoredHashes();
}

async function saveIgnoredHashes() {
    let table = document.getElementById("orphans") as HTMLTableElement;
    let hashes = [...table.querySelectorAll("tr.ignore") as NodeListOf<HTMLTableRowElement>]
        .map(tr => tr.dataset.hash as string);
    await uploadIgnoredDiffHashes(hashes);
}

async function gotoData(ev: MouseEvent) {
    let button = ev.currentTarget as HTMLButtonElement;
    let tr = button.closest("tr") as HTMLTableRowElement;
    let rowType = tr.dataset.rowType as ("excel" | "dko3");
    let cellAddress = tr.dataset.cellAddress;
    let workBook = tr.dataset.workbook;
    let workSheet = tr.dataset.worksheet;
    let lesId = tr.dataset.lesId;

    if(rowType == "excel") {
        let url = await getUrlForWorksheet(workBook, workSheet, cellAddress);
        if(url == "")
            return; //todo: inform user that no url exists for this les/worksheet.
        // https:/...&activeCell=Definitief!Y24
        window.open(url, "_blank");
    }
    else if(rowType == "dko3") {
        location.href =  DKO3_BASE_URL + "#lessen-les?id="+lesId;
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

function indexToExcelColumn(index: number) {
    let quotient = Math.floor(index / 26);
    if (quotient <= 0)
        return chars[index];

    return indexToExcelColumn(quotient-1) + chars[index % 26];
}
const chars: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];