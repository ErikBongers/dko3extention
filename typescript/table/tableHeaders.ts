import {distinct, openTab, rangeGenerator} from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import { FetchedTable } from "./tableDef";
import {downloadTable} from "./loadAnyTable";

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
    if (isNaN(res)) {
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
    if (isColumnProbablyNumeric(table, index)) {
        cmpFunc = cmpNumber;
    } else if (isColumnProbablyDate(table, index)) {
        cmpFunc = cmpDate;
    }
    try {
        sortRows(cmpFunc, header, rows, index, wasAscending);
    } catch (e) {
        console.error(e);
        if (cmpFunc !== cmpAlpha)
            sortRows(cmpAlpha, header, rows, index, wasAscending);
    }

    rows.forEach(row => table.tBodies[0].appendChild(row));
}

function isColumnProbablyDate(table: HTMLTableElement, index: number) {
    let rows = Array.from(table.tBodies[0].rows);
    return stringToDate(rows[0].cells[index].textContent);
}

function stringToDate(text: string) {
    let reDate = /^(\d\d)[-\/](\d\d)[-\/](\d\d\d\d)/;
    let matches = text.match(reDate);
    if (!matches)
        return undefined;
    return new Date(matches[3] + "-" + matches[2] + "/" + matches[1]);
}

function isColumnProbablyNumeric(table: HTMLTableElement, index: number) {
    let rows = Array.from(table.tBodies[0].rows);

    const MAX_SAMPLES = 100;
    let samples = rangeGenerator(0, rows.length, rows.length > MAX_SAMPLES ? rows.length / MAX_SAMPLES : 1)
        .map(float => Math.floor(float));
    return !samples
        .map(rowIndex => rows[rowIndex])
        .some(row => {
            return isNaN(Number((row.children[index] as HTMLElement).innerText));
        });
}

export function decorateTableHeader(table: HTMLTableElement) {
    if (table.tHead.classList.contains("clickHandler"))
        return;
    table.tHead.classList.add("clickHandler");
    Array.from(table.tHead.children[0].children)
        .forEach((colHeader: HTMLElement, index) => {
            // colHeader.onclick = _ev => {
            //     sortTableByColumn(table, index);
            // };
            let {first: span, last: idiom} = emmet.appendChild(colHeader, 'span.dropDownContainer>button.dropDownButton.miniButton.naked>i.dropDownIgnoreHide.fas.fa-list[title="Toon unieke waarden"]');
            emmet.appendChild(span as HTMLElement, "div.dropDownMenu>button.naked.dropDownItem.dropDownIgnoreHide{Click me $}*3")
            idiom.onclick = ev => {
                console.log("showing menu...");
                (ev.target as HTMLElement).closest(".dropDownContainer").querySelector(".dropDownMenu") .classList.add("show");
            }
            let buttons = [...span.querySelectorAll<HTMLButtonElement>("button.dropDownItem")];
            buttons[0].textContent = "Toon unieke waarden";
            buttons[0].onclick = () => {
                console.log("click");
                showDistinctColumn(index);
            };
        });
}

function getDistinctColumn(tableContainer: HTMLTableElement, index: number) {
    let rows = Array.from(tableContainer.querySelector("tbody").rows);

    return distinct(rows.map(row => row.children[index].textContent)).sort();
}

function showDistinctColumn(index: number) {
    downloadTable()
        .then(fetchedTable => {
            let cols = getDistinctColumn(fetchedTable.tableDef.tableRef.getOrgTableContainer(), index);
            let tmpDiv = document.createElement("div");
            let tbody = emmet.appendChild(tmpDiv, "table>tbody").last as HTMLTableSectionElement;
            for(let col of cols) {
                emmet.appendChild(tbody, `tr>td>{${col}}`);
            }
            let headerRow = fetchedTable.tableDef.tableRef.getOrgTableContainer().querySelector("thead>tr");
            openTab(tmpDiv.innerHTML, headerRow.querySelectorAll("th")[index].textContent+ " (uniek)");
        });
}

window.onclick = function(event) {
    if (event.target.matches('.dropDownIgnoreHide'))
        return;
    let dropdowns = document.getElementsByClassName("dropDownMenu");
    for (let dropDown of dropdowns) {
        dropDown.classList.remove('show');
    }
}
