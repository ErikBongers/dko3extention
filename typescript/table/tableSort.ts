import {options} from "../plugin_options/options";
import * as def from "../def";
import {TableRef} from "./tableFetcher";
import {range, rangeGenerator} from "../globals";

export let defaultValueFunc: ColumnValueFunc = (td: HTMLTableCellElement) => td.innerText;

export function getDefaultValueFuncs(table: HTMLTableElement) {
    let columnCount = table.tHead!.rows![0].cells.length; //! assumptions, assumptions...
    return range(0, columnCount).map(_ => defaultValueFunc);
}

export function makeTableSortable(table: HTMLTableElement, valueFuncs?: ColumnValueFunc[]) {
    let actualValueFuncs = valueFuncs ?? getDefaultValueFuncs(table);

    Array.from(table.tHead!.children[0].children)
        .forEach((colHeader: Element) => {
            (colHeader as HTMLElement).onclick = (ev) => {
                reSortTableByColumn2(ev, table, actualValueFuncs);
            };
        });
}
export type ColumnValueFunc = (td: HTMLTableCellElement) => string;

function reSortTableByColumn2(ev: MouseEvent, table: HTMLTableElement, valueFuncs: ColumnValueFunc[]) {
    let header = table.tHead!.children[0].children[getColumnIndex(ev)];
    let wasAscending = header.classList.contains("sortAscending");
    let columnIndex = getColumnIndex(ev);
    sortTableByColumn(table, columnIndex, wasAscending, valueFuncs[columnIndex]);
}

export function sortTableByColumn(table: HTMLTableElement, index: number, descending: boolean, valueFunc: ColumnValueFunc) {
    let header = table.tHead!.children[0].children[index];
    let rows = Array.from(table.tBodies[0].rows);
    for (let thead of table.tHead!.children[0].children) {
        thead.classList.remove("sortAscending", "sortDescending")
    }
    let cmpFunc = cmpAlpha;
    if (isColumnProbablyNumeric(table, index, valueFunc)) {
        cmpFunc = cmpNumber;
    } else if (isColumnProbablyDate(table, index, valueFunc)) {
        cmpFunc = cmpDate;
    }
    try {
        sortRows(cmpFunc, header, rows, index, descending, valueFunc);
    } catch (e) {
        console.error(e);
        if (cmpFunc !== cmpAlpha)
            sortRows(cmpAlpha, header, rows, index, descending, valueFunc);
    }

    rows.forEach(row => table.tBodies[0].appendChild(row));
}

export function getColumnIndex(ev: MouseEvent) {
    let td = ev.target as HTMLElement;
    if (td.tagName !== "TD") {
        td = td.closest("TH")!;
    }
    return Array.prototype.indexOf.call(td.parentElement!.children, td);
}

function isColumnProbablyNumeric(table: HTMLTableElement, index: number, valueFunc: ColumnValueFunc) {
    let rows = Array.from(table.tBodies[0].rows);

    const MAX_SAMPLES = 100;
    let samples = rangeGenerator(0, rows.length, rows.length > MAX_SAMPLES ? rows.length / MAX_SAMPLES : 1)
        .map(float => Math.floor(float));
    return !samples
        .map(rowIndex => rows[rowIndex])
        .some(row => {
            let value = valueFunc(row.children[index] as HTMLTableCellElement);
            return isNaN(Number(value));
        });
}

type CmpFunction = (a: HTMLTableCellElement, b: HTMLTableCellElement, valueFunc: ColumnValueFunc) => number
function sortRows(cmpFunction: CmpFunction, header: Element, rows: HTMLTableRowElement[], index: number, descending: boolean, valueFunc: ColumnValueFunc) {
    let cmpDirectionalFunction: (a: HTMLTableRowElement, b: HTMLTableRowElement) => number;
    if (descending) {
        cmpDirectionalFunction = (a: HTMLTableRowElement, b: HTMLTableRowElement) => cmpFunction(b.cells[index], a.cells[index],valueFunc);
        header.classList.add("sortDescending");
    } else {
        cmpDirectionalFunction = (a: HTMLTableRowElement, b: HTMLTableRowElement) => cmpFunction(a.cells[index], b.cells[index], valueFunc);
        header.classList.add("sortAscending");
    }

    rows.sort((a, b) => cmpDirectionalFunction(a, b));
}

function cmpAlpha(a: HTMLTableCellElement, b: HTMLTableCellElement, valueFunc: ColumnValueFunc) {
    return valueFunc(a).localeCompare(valueFunc(b));
}

function cmpDate(a: HTMLTableCellElement, b: HTMLTableCellElement, valueFunc: ColumnValueFunc) {
    return normalizeDate(valueFunc(a)).localeCompare(normalizeDate(valueFunc(b)));
}

// Convert date string for sorting: DD-MM-YYYY >  YYYYMMDD
function normalizeDate(date: string) {
    let dateParts = date.split('-');
    return dateParts[2] + dateParts[1] + dateParts[0];
}

function cmpNumber(a: HTMLTableCellElement, b: HTMLTableCellElement) {
    let res = Number(a.innerText) - Number(b.innerText);
    if (isNaN(res)) {
        throw new Error();
    }
    return res;
}

function isColumnProbablyDate(table: HTMLTableElement, index: number, valueFunc: ColumnValueFunc) {
    let rows = Array.from(table.tBodies[0].rows);
    return stringToDate(valueFunc(rows[0].cells[index]));
}

function stringToDate(text: string) {
    let reDate = /^(\d\d)[-\/](\d\d)[-\/](\d\d\d\d)/;
    let matches = text.match(reDate);
    if (!matches)
        return undefined;
    return new Date(matches[3] + "-" + matches[2] + "/" + matches[1]);
}
