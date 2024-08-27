import {rangeGenerator} from "../globals.js";

function sortRowsAlpha(wasAscending: boolean, rows: HTMLTableRowElement[], index: number, header: Element) {
    if (wasAscending) {
        rows.sort((a, b) => {
            return b.cells[index].innerText.localeCompare(a.cells[index].innerText);
        })
        header.classList.add("sortDescending");
    } else {
        rows.sort((a, b) => {
            return a.cells[index].innerText.localeCompare(b.cells[index].innerText);
        })
        header.classList.add("sortAscending");
    }
}

function trySortTableNumeric(wasAscending: boolean, rows: HTMLTableRowElement[], index: number, header: Element) {
    try {
        if (wasAscending) {
            rows.sort((a, b) => {
                let res = Number(b.cells[index].innerText) - Number(a.cells[index].innerText);
                if(isNaN(res)) {
                    throw new Error();
                }
                return res;
            })
            header.classList.add("sortDescending");
        } else {
            rows.sort((a, b) => {
            let res = Number(a.cells[index].innerText) - Number(b.cells[index].innerText);
                if(isNaN(res)) {
                    throw new Error();
                }
                return res;
            })
            header.classList.add("sortAscending");
        }
        return true;
    } catch (e) {
        return false;
    }
}

function sortTableByColumn(table: HTMLTableElement, index: number) {
    let header = table.tHead.children[0].children[index];
    let rows = Array.from(table.tBodies[0].rows);
    let wasAscending = header.classList.contains("sortAscending");
    for (let thead of table.tHead.children[0].children) {
        thead.classList.remove("sortAscending", "sortDescending")
    }
    if(isColumnProbablyNumeric(table, index)) {
        if(!trySortTableNumeric(wasAscending, rows, index, header))
            sortRowsAlpha(wasAscending, rows, index, header);
    } else {
        sortRowsAlpha(wasAscending, rows, index, header);
    }
    rows.forEach(row => table.tBodies[0].appendChild(row));
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