import {createTable, distinct, getPageTransientStateValue, openHtmlTab, range, rangeGenerator} from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {checkAndDownloadTableRows} from "./loadAnyTable";
import {addMenuItem, addMenuSeparator, setupMenu} from "../menus";
import {TableFetcher, TableHandler, TableRef} from "./tableFetcher";
import * as def from "../def";
import {options} from "../plugin_options/options";
import {Actions} from "../messaging";


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
    navigator.clipboard.writeText(createTable(headers, cols).outerHTML).then(_r => {});
}

function reSortTableByColumn(ev: MouseEvent, table: HTMLTableElement) {
    let header = table.tHead.children[0].children[getColumnIndex(ev)];
    let wasAscending = header.classList.contains("sortAscending");
    forTableDo(ev, (_fetchedTable, index) => sortTableByColumn(table, index, wasAscending));
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
    if(!options.showTableHeaders)
        return;

    Array.from(table.tHead.children[0].children)
        .forEach((colHeader: HTMLElement) => {
            colHeader.onclick = (ev) => {
                reSortTableByColumn(ev, table);
            };
            if(table.classList.contains(def.NO_MENU))
                return;
            let {first: span, last: idiom} = emmet.appendChild(colHeader, 'span>button.miniButton.naked>i.fas.fa-list');
            let menu = setupMenu(span as HTMLElement, idiom.parentElement);
            addMenuItem(menu, "Toon unieke waarden", 0, (ev) => { forTableDo(ev, showDistinctColumn); });
            addMenuItem(menu, "Verberg kolom", 0, (ev) => { console.log("verberg kolom"); forTableColumnDo(ev, hideColumn)});
            addMenuItem(menu, "Toon alle kolommen", 0, (ev) => { console.log("verberg kolom"); forTableColumnDo(ev, showColumns)});
            addMenuSeparator(menu, "Sorteer", 0);
            addMenuItem(menu, "Laag naar hoog (a > z)", 1, (ev) => { forTableDo(ev, (_fetchedTable, index) => sortTableByColumn(table, index, false))});
            addMenuItem(menu, "Hoog naar laag (z > a)", 1, (ev) => { forTableDo(ev, (_fetchedTable, index) => sortTableByColumn(table, index, true))});
            addMenuSeparator(menu, "Sorteer als:", 1);
            addMenuItem(menu, "Tekst", 2, (_ev) => { });
            addMenuItem(menu, "Getallen", 2, (_ev) => { });
            addMenuSeparator(menu, "Kopieer nr klipbord", 0);
            addMenuItem(menu, "Kolom", 1, (ev) => { forTableDo(ev, (_fetchedTable, index) => copyOneColumn(table, index))});
            addMenuItem(menu, "Hele tabel", 1, (ev) => { forTableDo(ev, (_fetchedTable, _index) => copyFullTable(table))});
            addMenuSeparator(menu, "<= Samenvoegen", 0);
            addMenuItem(menu, "met spatie", 1, (ev) => { forTableColumnDo(ev, createTwoColumnsCmd(Direction.LEFT, mergeColumnWithSpace))});
            addMenuItem(menu, "met comma", 1, (ev) => { forTableColumnDo(ev, createTwoColumnsCmd(Direction.LEFT, mergeColumnWithComma))});
            addMenuSeparator(menu, "Verplaatsen", 0);
            addMenuItem(menu, "<=", 1, (ev) => { forTableColumnDo(ev, createTwoColumnsCmd(Direction.LEFT, swapColumns))});
            addMenuItem(menu, "=>", 1, (ev) => { forTableColumnDo(ev, createTwoColumnsCmd(Direction.RIGHT, swapColumns))});
        });
    relabelHeaders(table.tHead.children[0] as HTMLTableRowElement);
}

function getDistinctColumn(tableContainer: HTMLElement, index: number) {
    let rows = Array.from(tableContainer.querySelector("tbody").rows);

    return distinct(rows.map(row => row.children[index].textContent)).sort();
}

export class TableHandlerForHeaders implements TableHandler {
    onReset(_tableDef: TableFetcher){
        console.log("RESET");
    }
}

function getColumnIndex(ev: MouseEvent) {
    let td = ev.target as HTMLElement;
    if (td.tagName !== "TD") {
        td = td.closest("TH");
    }
    return Array.prototype.indexOf.call(td.parentElement.children, td);
}

type DoForRow = (row: HTMLTableRowElement, index: number, context: unknown) => void;
type GetContext = (tableRef: TableRef, index: number) => unknown;

type TableColumnCmdDef = {
    getContext?: GetContext
    doForRow: DoForRow,
}

type TableColumnCmd = {
    cmdDef: TableColumnCmdDef,
    index: number
}

export function executeTableCommands(tableRef: TableRef) {
    let cmds = getPageTransientStateValue(def.GLOBAL_COMMAND_BUFFER_KEY, []) as TableColumnCmd[];
    console.log("Executing:");
    console.log(cmds);
    for(let cmd of cmds) {
        executeCmd(cmd, tableRef, true);
    }
}

function forTableDo(ev: MouseEvent, doIt: (tableRef: TableRef, index: number) => void) {
    ev.preventDefault();
    ev.stopPropagation();
    checkAndDownloadTableRows()
        .then(tableRef => {
            doIt(tableRef, getColumnIndex(ev));
        });
}

function forTableColumnDo(ev: MouseEvent, cmdDef: TableColumnCmdDef) {
    ev.preventDefault();
    ev.stopPropagation();
    checkAndDownloadTableRows()
        .then(tableRef => {
            let index = getColumnIndex(ev);
            let cmd: TableColumnCmd = {
                cmdDef,
                index
            }
            executeCmd(cmd, tableRef, false);
            let cmds = getPageTransientStateValue(def.GLOBAL_COMMAND_BUFFER_KEY, []) as TableColumnCmd[];
            cmds.push(cmd);
            relabelHeaders(tableRef.getOrgTableContainer().querySelector("thead>tr"))
        });
}

function executeCmd(cmd: TableColumnCmd, tableRef: TableRef, onlyBody: boolean) {
    let context = cmd.cmdDef.getContext?.(tableRef, cmd.index);

    let rows: Iterable<HTMLTableRowElement>;
    if(onlyBody)
        rows = tableRef.getOrgTableContainer().querySelector("tbody").rows;
    else
        rows = tableRef.getOrgTableContainer().querySelectorAll("tr");

    for(let row of rows) {
        cmd.cmdDef.doForRow(row, cmd.index, context);
    }
}

function showDistinctColumn(tableRef: TableRef, index: number) {
    let cols = getDistinctColumn(tableRef.getOrgTableContainer(), index);
    let tmpDiv = document.createElement("div");
    let tbody = emmet.appendChild(tmpDiv, "table>tbody").last as HTMLTableSectionElement;
    for(let col of cols) {
        emmet.appendChild(tbody, `tr>td>{${col}}`);
    }
    let headerRow = tableRef.getOrgTableContainer().querySelector("thead>tr");
    let headerNodes = [...headerRow.querySelectorAll("th")[index].childNodes];
    let headerText = headerNodes.filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ");
    openHtmlTab(tmpDiv.innerHTML, headerText + " (uniek)");
}

let hideColumn: TableColumnCmdDef = {
    doForRow: function (row, index, _context) {
        row.cells[index].style.display = "none";
    }
}

let showColumns: TableColumnCmdDef = {
    doForRow: function (row, _index, _context) {
        for(let cell of row.cells)
            cell.style.display = "";
    }
}

function  mergeColumnWithSpace(row: HTMLTableRowElement, index: number, leftIndex: number) {
    mergeColumnToLeft(row, index, leftIndex, " ");
}

function  mergeColumnWithComma(row: HTMLTableRowElement, index: number, leftIndex: number) {
    mergeColumnToLeft(row, index, leftIndex, ", ");
}

function mergeColumnToLeft(row: HTMLTableRowElement, index: number, leftIndex: number, separator: string) {
    if(index === 0)
        return; //just to be sure.
    if(row.parentElement.tagName == "TBODY") {
        row.cells[index].style.display = "none";
        row.cells[leftIndex].innerText += separator + row.cells[index].innerText;
    } else { //THEAD
        row.cells[index].style.display = "none";
        let firstTextNode = [...row.cells[leftIndex].childNodes].filter(node => node.nodeType === Node.TEXT_NODE)[0];
        let secondTextNode = [...row.cells[index].childNodes].filter(node => node.nodeType === Node.TEXT_NODE)[0];
        if (firstTextNode && secondTextNode) {
            firstTextNode.textContent += separator + secondTextNode.textContent;
        }
    }
}

function relabelHeaders(headerRow: HTMLTableRowElement) {
    for(let cell of headerRow.cells) {
        cell.classList.remove("shiftMenuLeft");
    }
    headerRow.cells[headerRow.cells.length-1].classList.add("shiftMenuLeft");
}

function findNextVisibleCell(headerRow: HTMLTableRowElement, indexes: number[]) {
    let index = undefined;
    for (let i of indexes) {
        if ((headerRow.children[i] as HTMLElement).style.display !== "none") {
            index = i;
            break;
        }
    }
    return index;
}

enum Direction {  LEFT, RIGHT}
function createTwoColumnsCmd(direction: Direction, twoColumnFunc: (row: HTMLTableRowElement, index1: number, index2: number) => void) : TableColumnCmdDef  {
    return {
        getContext: function (tableRef, index: number): unknown {
            let row = tableRef.getOrgTableContainer().querySelector("thead>tr") as HTMLTableRowElement;
            let cellRange = direction === Direction.LEFT ? range(index-1, -1) :  range(index+1, row.cells.length);
            return findNextVisibleCell(row, cellRange);
        },
        doForRow: function (row, index, context) {
            twoColumnFunc(row, index, context as number);
        }
    }
}

function swapColumns(row: HTMLTableRowElement, index1: number,  index2: number) {
    if(index1 == undefined || index2 == undefined)
        return;
    if(index1 > index2) {
        [index1, index2] = [index2, index1];
    }
    row.children[index1].parentElement.insertBefore(row.children[index2], row.children[index1]);
}
