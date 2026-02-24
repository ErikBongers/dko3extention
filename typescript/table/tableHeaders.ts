import {createTable, DataCacheId, distinct, HtmlData, openHtmlTab, range, rangeGenerator} from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {checkAndDownloadTableRows} from "./loadAnyTable";
import {addMenuItem, addMenuSeparator, setupMenu} from "../menus";
import {TableFetcher, TableHandler, TableRef} from "./tableFetcher";
import * as def from "../def";
import {options} from "../plugin_options/options";
import {pageState} from "../pageState";
import {Actions, HtmlDataRequestParams, sendRequest, ServiceRequest, TabType} from "../messaging";
import MessageSender = chrome.runtime.MessageSender;

let _otherTabsDataCache = new Map<string, string>();

export function addToOtherTabsDataCache(data: string) {
    let id = Date.now().toString();
    _otherTabsDataCache.set(id, data);
    return id as DataCacheId;
}

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

interface StudentRowDef {
    studentIndexes: number[];
    inschrijvingenIndexes: number[];
    lesIndexes: number[];
}
interface StudentRow {
    seq: number;
    cells: string[];
    inschrijvingen: string[][];
}
async function copyForMailMerge(table: HTMLTableElement) {
    let headerCells = table.tHead.children[0].children as HTMLCollectionOf<HTMLTableCellElement>;
    let headers = [...headerCells].filter(cell => cell.style.display !== "none").map(cell => cell.innerText);
    let rows = table.tBodies[0].children as HTMLCollectionOf<HTMLTableRowElement>;
    let cells: string[][] = [...rows].map(row => [...row.cells].filter(cell => cell.style.display !== "none").map(cell => cell.innerText));
    let emailIndex = headers.findIndex(header => header.toLowerCase().includes("e-mailadressen"));
    if(emailIndex === -1) {
        alert("Geen e-mailadressen gevonden'. Voed dit veld toe aan de lijst.");
        return;
    }

    // // -- add seq to rows.
    // let seqIndex = headers.length; //we'll be adding a seq column to each row later.
    // cells.forEach((row: (string | number)[], seq) => {
    //     row.push(seq);
    // });
    //
    // -- aggregate at student level.
    let studentRowDef: StudentRowDef = { studentIndexes: [], inschrijvingenIndexes: [], lesIndexes: []};
    headers.forEach((header, index) => {
        if(WerklijstFieldsStudent.includes(header)) {
            studentRowDef.studentIndexes.push(index);
        } else if(WerklijstFieldsInschrijving.includes(header)) {
            studentRowDef.inschrijvingenIndexes.push(index);
        } else if(WerklijstFieldsLes.includes(header)) {
            studentRowDef.lesIndexes.push(index);
        }
    });

    let groupedPerStudent: number[][] = []; //rowIndexes per student
    cells.forEach((row, rowIndex) => {
        if(groupedPerStudent.length == 0) {
            groupedPerStudent.push([rowIndex]);
            return;
        }
        // -- check if row is a new student.
        let currentStudentRow = cells[groupedPerStudent[groupedPerStudent.length - 1][0]];
        let isNewStudent = studentRowDef.studentIndexes.some(index => row[index] != currentStudentRow[index]);
        if(isNewStudent) {
            groupedPerStudent.push([rowIndex]);
            return;
        }
        groupedPerStudent[groupedPerStudent.length - 1].push(rowIndex);
    });
    console.log(groupedPerStudent);

    //
    // // -- split rows per email
    // let extraRows: (string | number)[][] = [];
    // cells.forEach((row: (string | number)[], seq) => {
    //     row.push(seq);
    //     let emails = (row[emailIndex] as string).split(/[,;]/);
    //     emails = emails.filter((email: string) => !email.includes("academiestudent.be"));
    //     if(emails.length == 0)
    //         return;
    //     row[emailIndex] = emails.pop();
    //     emails.forEach((email: string) => {
    //         let copiedRow = [...row];
    //         copiedRow[emailIndex] = email;
    //         extraRows.push(copiedRow);
    //     });
    // });
    // cells = cells.concat(extraRows);
    //
    // // -- sort rows per seq and remove seq.
    // cells.sort((a, b) => (a[seqIndex] as number) - (b[seqIndex] as number));
    // cells.forEach(row => row.pop());
    // createAndCopyTable(headers, cells as string[][]);
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
            addMenuItem(menu, "Voor mailmerge (1 email/rij)", 1, (ev) => { forTableDo(ev, (_fetchedTable, _index) => copyForMailMerge(table))});
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
    let cmds =  pageState.transient.getValue(def.GLOBAL_COMMAND_BUFFER_KEY, []) as TableColumnCmd[];
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
            let cmds =  pageState.transient.getValue(def.GLOBAL_COMMAND_BUFFER_KEY, []) as TableColumnCmd[];
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
    let headerText = getColumnHeaderText(headerRow.querySelectorAll("th")[index]);
    let htmlData: HtmlData = {
        title: headerText + " (uniek)",
        html: tmpDiv.innerHTML,
    }
    let id = addToOtherTabsDataCache(JSON.stringify(htmlData)); //todo: add this to openHtmlTab.
    openHtmlTab(id, headerText + " (uniek)").then(_ => {});
}

chrome.runtime.onMessage.addListener(onMessage)

async function onMessage(request: ServiceRequest, _sender: MessageSender, sendResponse: (response?: any) => void) {
    if (request.senderTabType != TabType.Html)
        return;

    if(request.action == Actions.RequestTabData) {
        let params = request.data.params as HtmlDataRequestParams; //todo: do this cast in teacherHoursSetup.ts as well. Perhaps make onMessage generic.
        let data = _otherTabsDataCache.get(params.cacheId as string);
        await sendRequest(Actions.TabData, TabType.Main, TabType.Html, request.targetTabId, data);
        return;
    }
}

//Get the undecorated column header text.
export function getColumnHeaderText(cell: HTMLTableCellElement) {
    return [...cell.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join(" ");
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


let WerklijstFieldsInschrijving = [
    "domein",
    "vakken (binnen de criteria)",
    "alle vakken",
    "instrumenten (binnen de criteria)",
    "alle instrumenten",
    "vak: naam",
    "vak: officiële naam",
    "vak: code",
    "graad",
    "leerjaar",
    "graad + leerjaar",
    "graad + leerjaar + sectie",
    "optie",
    "sectie",
    "administratieve groep: naam",
    "administratieve groep: officiële naam",
    "administratieve groep: code",
    "volledig vrije leerling",
    "volledig eigen leerling",
    "volledig vrije en/of eigen leerling",
    "inschrijving: datum",
    "uitschrijving: datum",
    "uitschrijving: reden",
    "financierbaarheid",
    "inschrijving: einde graad",
    "leertraject",
    "studierichting",
    "geslaagd (vak)",
    "resultaat (vak)",
    "geslaagd (globaal)",
    "resultaat (globaal)",
    "alternatieve leercontext",
    "akkoord en meer: ingevuld?",
    "akkoord en meer:  toestemming beeldmateriaal?",
    "akkoord en meer: ingevuld op",
    "akkoord en meer: ingevuld door",
    "status Discimus",
    "cursussen",
];

let WerklijstFieldsLes = [
    "les: id",
    "vestigingsplaats",
    "benaming les",
    "lesmomenten",
    "lokaal",
    "klasleerkracht",
    "alle leerkrachten (zonder interims)",
    "alle leerkrachten (met interims)",
];

let WerklijstFieldsStudent = [
    "stamnummer",
    "naam",
    "voornaam",
    "roepnaam",
    "persoon: id",
    "geboortedatum",
    "geboorteplaats",
    "geslacht",
    "gender",
    "rijksregisternummer",
    "nationaliteit",
    "opmerking personalia",
    "leeftijd op 31 december",
    "leeftijd op vandaag",
    "token",
    "is zorgleerling?",
    "huisnummer",
    "busnummer",
    "postcode",
    "gemeente",
    "land",
    "leefeenheid: alle leden",
    "leefeenheid: alle actieve leden in [schooljaar]",
    "leefeenheid: te betalen",
    "leefeenheid: betaald",
    "leefeenheid: saldo",
    "e-mailadressen (gescheiden door puntkomma)",
    "e-mailadressen marketing (gescheiden door komma)",
    "e-mailadressen marketing (gescheiden door puntkomma)",
    "e-mailadres van de school",
    "telefoonnummers",
    "mobiele nummers voor verwittiging",
];