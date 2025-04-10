import {createTable, distinct, openTab, rangeGenerator} from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {downloadTable} from "./loadAnyTable";
import {addMenuItem, addMenuSeparator, setupMenu} from "../menus";
import {FetchedTable, findTableRefInCode, TableFetcher, TableHandler} from "./tableFetcher";
import {CAN_HAVE_MENU} from "../def";
import {InfoBar} from "../infoBar";
import {insertProgressBar} from "../progressBar";


function sortRows(cmpFunction: (a: HTMLTableCellElement, b: HTMLTableCellElement) => number, header: Element, rows: HTMLTableRowElement[], index: number, descending: boolean) {
    let cmpDirectionalFunction: (a: HTMLTableRowElement, b: HTMLTableRowElement) => number;
    if (descending) {
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

function sortTableByColumn(table: HTMLTableElement, index: number, descending: boolean) {
    let header = table.tHead.children[0].children[index];
    let rows = Array.from(table.tBodies[0].rows);
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
        sortRows(cmpFunc, header, rows, index, descending);
    } catch (e) {
        console.error(e);
        if (cmpFunc !== cmpAlpha)
            sortRows(cmpAlpha, header, rows, index, descending);
    }

    rows.forEach(row => table.tBodies[0].appendChild(row));
}

function copyFullTable(table: HTMLTableElement) {
    let headerCells = table.tHead.children[0].children as HTMLCollectionOf<HTMLTableCellElement>;
    let headers = [...headerCells].filter(cell => cell.style.display !== "none").map(cell => cell.innerText);
    let rows = table.tBodies[0].children as HTMLCollectionOf<HTMLTableRowElement>;
    let cells = [...rows].map(row => [...row.cells].filter(cell => cell.style.display !== "none").map(cell => cell.innerText));
    createAndCopyTable(headers, cells);
}

function copyOneColumn(table: HTMLTableElement, index: number) {
    createAndCopyTable(
        [(table.tHead.children[0].children[index] as HTMLTableCellElement).innerText],
        [...table.tBodies[0].rows].map(row => [row.cells[index].innerText])
    );
}

function createAndCopyTable(headers: Iterable<string>, cols: Iterable<Iterable<string>>) {
    navigator.clipboard.writeText(createTable(headers, cols).outerHTML).then(r => {});
}

function reSortTableByColumn(ev: MouseEvent, table: HTMLTableElement) {
    let header = table.tHead.children[0].children[getColumnIndex(ev)];
    let wasAscending = header.classList.contains("sortAscending");
    forTableColumnDo(ev, (fetchedTable, index) => sortTableByColumn(table, index, wasAscending));
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
            colHeader.onclick = (ev) => {
                reSortTableByColumn(ev, table);
            };
            if(!table.classList.contains(CAN_HAVE_MENU))
                return;
            let {first: span, last: idiom} = emmet.appendChild(colHeader, 'span>button.miniButton.naked>i.fas.fa-list');
            let shiftLeft = (index+1) >= table.tHead.children[0].children.length;
            let menu = setupMenu(span as HTMLElement, idiom.parentElement, shiftLeft);
            addMenuItem(menu, "Toon unieke waarden", 0, (ev) => { forTableColumnDo(ev, showDistinctColumn); });
            addMenuItem(menu, "Verberg kolom", 0, (ev) => { console.log("verberg kolom"); forTableColumnDo(ev, hideColumn)});
            addMenuItem(menu, "Toon alle kolommen", 0, (ev) => { console.log("verberg kolom"); forTableColumnDo(ev, showColumns)});
            addMenuSeparator(menu, "Sorteer", 0);
            addMenuItem(menu, "Laag naar hoog (a > z)", 1, (ev) => { forTableColumnDo(ev, (fetchedTable, index) => sortTableByColumn(table, index, false))});
            addMenuItem(menu, "Hoog naar laag (z > a)", 1, (ev) => { forTableColumnDo(ev, (fetchedTable, index) => sortTableByColumn(table, index, true))});
            addMenuSeparator(menu, "Sorteer als", 1);
            addMenuItem(menu, "Tekst", 2, (ev) => { });
            addMenuItem(menu, "Getallen", 2, (ev) => { });
            addMenuSeparator(menu, "Kopieer nr klipbord", 0);
            addMenuItem(menu, "Kolom", 1, (ev) => { forTableColumnDo(ev, (fetchedTable, index) => copyOneColumn(table, index))});
            addMenuItem(menu, "Hele tabel", 1, (ev) => { forTableColumnDo(ev, (fetchedTable, index) => copyFullTable(table))});
            addMenuSeparator(menu, "<= Samenvoegen", 0);
            addMenuItem(menu, "met spatie", 1, (ev) => { forTableColumnDo(ev, mergeColumnWithSpace)});
            addMenuItem(menu, "met comma", 1, (ev) => { forTableColumnDo(ev, mergeColumnWithComma)});
            addMenuSeparator(menu, "Verplaatsen", 0);
            addMenuItem(menu, "<=", 1, (ev) => { forTableColumnDo(ev, swapColumnsToLeft)});
            addMenuItem(menu, "=>", 1, (ev) => { });
        });
}

function getDistinctColumn(tableContainer: HTMLElement, index: number) {
    let rows = Array.from(tableContainer.querySelector("tbody").rows);

    return distinct(rows.map(row => row.children[index].textContent)).sort();
}

type TableColumnDo = (fetchedTable: FetchedTable, index: number) => void;

class TableHandlerForHeaders implements TableHandler {
    onReset(tableDef: TableFetcher){
        let headerRows = Array.from(tableDef.tableRef.getOrgTableContainer().querySelector("thead").rows);
        for(let row of headerRows) {
            for(let cell of row.cells) {
                cell.style.display = "";
            }
        }
    }
}

function getColumnIndex(ev: MouseEvent) {
    let td = ev.target as HTMLElement;
    if (td.tagName !== "TD") {
        td = td.closest("TH");
    }
    return Array.prototype.indexOf.call(td.parentElement.children, td);
}

function forTableColumnDo(ev: MouseEvent, doIt: TableColumnDo) {
    ev.preventDefault();
    ev.stopPropagation();
    downloadTable()
        .then(fetchedTable => {
            let index = getColumnIndex(ev);
            doIt(fetchedTable, index);
        });
}

let showDistinctColumn: TableColumnDo = function (fetchedTable, index) {
    let cols = getDistinctColumn(fetchedTable.tableFetchere.tableRef.getOrgTableContainer(), index);
    let tmpDiv = document.createElement("div");
    let tbody = emmet.appendChild(tmpDiv, "table>tbody").last as HTMLTableSectionElement;
    for(let col of cols) {
        emmet.appendChild(tbody, `tr>td>{${col}}`);
    }
    let headerRow = fetchedTable.tableFetchere.tableRef.getOrgTableContainer().querySelector("thead>tr");
    let headerNodes = [...headerRow.querySelectorAll("th")[index].childNodes];
    let headerText = headerNodes.filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ");
    openTab(tmpDiv.innerHTML, headerText + " (uniek)");
}

let hideColumn: TableColumnDo = function (fetchedTable, index) {
    let headerRows = Array.from(fetchedTable.tableFetchere.tableRef.getOrgTableContainer().querySelector("thead").rows);
    let rows = Array.from(fetchedTable.tableFetchere.tableRef.getOrgTableContainer().querySelector("tbody").rows);
    for(let row of rows) {
        row.cells[index].style.display = "none";
    }
    for(let row of headerRows) {
        row.cells[index].style.display = "none";
    }
}

let showColumns: TableColumnDo = function (fetchedTable, index) {
    let rows = fetchedTable.tableFetchere.tableRef.getOrgTableContainer().querySelectorAll("tr");
    for(let row of rows) {
        for(let cell of row.cells)
            cell.style.display = "";
    }
}

let mergeColumnWithComma: TableColumnDo = function (fetchedTable, index) {
    mergeColumnToLeft(fetchedTable, index, ", ");
}
let mergeColumnWithSpace: TableColumnDo = function (fetchedTable, index) {
    mergeColumnToLeft(fetchedTable, index, " ");
}

function mergeColumnToLeft(fetchedTable: FetchedTable, index: number, separator: string) {
    if(index === 0)
        return; //just to be sure.
    let headerRows = Array.from(fetchedTable.tableFetchere.tableRef.getOrgTableContainer().querySelector("thead").rows);
    let rows = Array.from(fetchedTable.tableFetchere.tableRef.getOrgTableContainer().querySelector("tbody").rows);
    for(let row of rows) {
        row.cells[index].style.display = "none";
        row.cells[index-1].innerText += separator + row.cells[index].innerText;
    }
    for(let row of headerRows) {
        row.cells[index].style.display = "none";
        let firstTextNode = [...row.cells[index-1].childNodes].filter(node => node.nodeType === Node.TEXT_NODE)[0];
        let secondTextNode = [...row.cells[index].childNodes].filter(node => node.nodeType === Node.TEXT_NODE)[0];
        if(firstTextNode && secondTextNode) {
            firstTextNode.textContent += separator + secondTextNode.textContent;
        }
    }
}

let swapColumnsToLeft: TableColumnDo = function (fetchedTable, index) {
    if(index ===  0)
        return; //just to be sure.
    //look for previous VISIBLE column
    let headerRow = fetchedTable.tableFetchere.tableRef.getOrgTableContainer().querySelector("thead>tr") as HTMLTableRowElement;
    let prevIndex: number = undefined;
    for(let i = index-1; i >=0 ; i--) {
        if((headerRow.children[i] as HTMLElement).style.display !== "none") {
            prevIndex = i;
            break;
        }
    }
    if(prevIndex !== undefined) {
        swapColumns(fetchedTable, prevIndex, index);
    }
}

function swapColumns(fetchedTable:  FetchedTable, index1: number,  index2: number) {
    let rows = Array.from(fetchedTable.tableFetchere.tableRef.getOrgTableContainer().querySelectorAll("tr"));
    for(let row of rows) {
        row.children[index1].parentElement.insertBefore(row.children[index2], row.children[index1]);
    }
}
