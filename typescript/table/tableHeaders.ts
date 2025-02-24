import {rangeGenerator} from "../globals";

function sortRows(cmpFunction: (a: HTMLTableCellElement, b: HTMLTableCellElement) => number, header: Element, rows: HTMLTableRowElement[], index: number, wasAscending: boolean) {
    let cmpDirectionalFunction: (a: HTMLTableRowElement, b: HTMLTableRowElement) => number;
    if (wasAscending) {
        cmpDirectionalFunction = (a: HTMLTableRowElement, b: HTMLTableRowElement) => cmpFunction(b.cells[index], a.cells[index]);
        header.classList.add("sortDescending");
    } else {
        cmpDirectionalFunction = (a: HTMLTableRowElement, b: HTMLTableRowElement) => cmpFunction(a.cells[index], b.cells[index]);
        header.classList.add("sortAscending");
    }

    rows.sort((a, b) => cmpDirectionalFunction(a, b));
}

function cmpAlpha(a: HTMLTableCellElement, b: HTMLTableCellElement) {
    return a.innerText.localeCompare(b.innerText);
}

function cmpDate(a: HTMLTableCellElement, b: HTMLTableCellElement) {
    return normalizeDate(a.innerText).localeCompare(normalizeDate(b.innerText));
}

// Convert date string for sorting: DD-MM-YYYY >  YYYYMMDD
function normalizeDate(date: string) {
    let dateParts = date.split('-');
    return dateParts[2] + dateParts[1] + dateParts[0];
}

function cmpNumber(a: HTMLTableCellElement, b: HTMLTableCellElement) {
    let res = Number(a.innerText) - Number(b.innerText);
    if(isNaN(res)) {
        throw new Error();
    }
    return res;
}

function sortTableByColumn(table: HTMLTableElement, index: number) {
    let header = table.tHead.children[0].children[index];
    let rows = Array.from(table.tBodies[0].rows);
    let wasAscending = header.classList.contains("sortAscending");
    for (let thead of table.tHead.children[0].children) {
        thead.classList.remove("sortAscending", "sortDescending")
    }
    let cmpFunc = cmpAlpha;
    if(isColumnProbablyNumeric(table, index)) {
        cmpFunc = cmpNumber;
    } else if(isColumnProbablyDate(table, index)) {
        cmpFunc = cmpDate;
    }
    try {
        sortRows(cmpFunc, header, rows, index, wasAscending);
    } catch (e) {
        console.error(e);
        if(cmpFunc !== cmpAlpha)
            sortRows(cmpAlpha, header, rows, index, wasAscending);
    }

    rows.forEach(row => table.tBodies[0].appendChild(row));
}

function isColumnProbablyDate(table: HTMLTableElement, index: number) {
    let rows = Array.from(table.tBodies[0].rows);
    let reDate =/\d\d-\d\d-\d\d\d\d/;
    return reDate.test(rows[0].cells[index].textContent);
}

function isColumnProbablyNumeric(table: HTMLTableElement, index: number) {
    let rows = Array.from(table.tBodies[0].rows);

    const MAX_SAMPLES = 100;
    let samples = rangeGenerator(0, rows.length, rows.length > MAX_SAMPLES ? rows.length/MAX_SAMPLES : 1)
        .map(float => Math.floor(float));
    return !samples
        .map(rowIndex => rows[rowIndex])
        .some(row => {
            return isNaN(Number((row.children[index] as HTMLElement).innerText));
        });
}

export function addTableHeaderClickEvents(table: HTMLTableElement) {
    if (table.tHead.classList.contains("clickHandler"))
        return;
    table.tHead.classList.add("clickHandler");
    Array.from(table.tHead.children[0].children).forEach((header: HTMLElement, index) => {
        header.onclick = _ev => {
            sortTableByColumn(table, index);
        };
    });
}