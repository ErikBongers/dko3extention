import {FetchedTable, TableFetcher, TableFetchListener} from "./table/tableFetcher";

/**
 * @returns `true` to continue, `false` to cancel further handling.
 */
type OnRowHandler = (tableDef: TableFetcher, rowObject: RowObject) => boolean;

type OnBeforeLoadingHandler = (tableDef: TableFetcher) => boolean;
type OnLoadedHandler = (fetchedTable: FetchedTable) => void;
type OnRequiredColumnsMissingHandler = (tableDef: TableFetcher) => void;
type OnPageHandler = (tableDef: TableFetcher, text: string, fetchedTable: FetchedTable) => void;

export interface PageHandler {
    onPage: OnPageHandler;
    onLoaded: OnLoadedHandler;
    onBeforeLoading?: OnBeforeLoadingHandler; //if defined, must return TRUE for loading to proceed.
}

export class RowObject {
    tr: HTMLTableRowElement;
    offset: number;
    index: number;
}

export class RowPageHandler implements PageHandler {
    private readonly onRow: OnRowHandler;
    onBeforeLoading?: OnBeforeLoadingHandler;
    onLoaded: OnLoadedHandler;

    constructor(onRow: OnRowHandler, onLoaded: OnLoadedHandler, onBeforeLoading: OnBeforeLoadingHandler) {
        this.onRow = onRow;
        this.onBeforeLoading = onBeforeLoading;
        this.onLoaded = onLoaded;
    }

    onPage: OnPageHandler = (tableDef: TableFetcher, _text: string, fetchedTable) => {
        if(!this.onRow)
            return;
        let index = 0;
        let rows = fetchedTable.getLastPageRows();
        for (let row of rows) {
            let rowObject = new RowObject();
            rowObject.tr = row;
            rowObject.offset = fetchedTable.getLastPageNumber();
            rowObject.index = index;
            if (!this.onRow(tableDef, rowObject))
                return;
            index++;
        }
    }
}

export class SimpleTableHandler implements TableFetchListener {
    onStartFetching: (tableFetcher: TableFetcher) => void;
    onLoaded: (tableFetcher: TableFetcher) => void;
    onBeforeLoadingPage: (tableFetcher: TableFetcher) => boolean;
    onFinished: (tableFetcher: TableFetcher) => void;
    onPageLoaded: (tableFetcher: TableFetcher, pageCnt: number, text: string) => void;

    constructor(onLoaded: (tableFetcher: TableFetcher) => void, onBeforeLoading: (tableFetcher: TableFetcher) => boolean) {
        this.onBeforeLoadingPage = onBeforeLoading;
        this.onLoaded = onLoaded;
        this.onPageLoaded = undefined;
        this.onFinished = undefined;
    }
}

/**
 * PageHandler with named column labels.\
 * Params are:
 * @description
 *      * requiredHeaderLabels: array with labels of required columns.
 *      * onRow: function(rowObject, collection): a row handler that mainly provides a param `rowObject`, which has a member getColumnText(columnLabel)
 * @implements PageHandler: which requires member `onPage()`
 */
export class NamedCellTableFetchListener implements TableFetchListener {
    onStartFetching: (tableFetcher: TableFetcher) => void;
    onLoaded: (tableFetcher: TableFetcher) => void;
    onFinished: (tableFetcher: TableFetcher) => void;

    private requiredHeaderLabels: string[];
    onBeforeLoading?: OnBeforeLoadingHandler;
    private headerIndices: Map<string, number>;
    onColumnsMissing: OnRequiredColumnsMissingHandler;
    isValidPage: boolean;

    constructor(requiredHeaderLabels: string[], onRequiredColumnsMissing: OnRequiredColumnsMissingHandler) {
        this.requiredHeaderLabels = requiredHeaderLabels;
        this.onColumnsMissing = onRequiredColumnsMissing;
        this.headerIndices = undefined;
        this.isValidPage = false;
    }

    onPageLoaded(tableFetcher: TableFetcher, _pageCnt: number, _text: string) {
        if(tableFetcher.fetchedTable.getLastPageNumber() === 0) {
            if (!this.setTemplateAndCheck(tableFetcher.fetchedTable.getTemplate())) {
                this.isValidPage = false;
                if (this.onColumnsMissing) {
                    this.onColumnsMissing(tableFetcher);
                } else {
                    throw ("Cannot build table object - required columns missing");
                }
            } else {
                this.isValidPage = true;
            }
        }
    }

    onBeforeLoadingPage(_tableFetcher: TableFetcher): boolean {
        this.headerIndices = NamedCellTableFetchListener.getHeaderIndicesFromDocument(document.body); //TODO: it's up to the tableDef to determine if a table has the valid columns.
        return this.hasAllHeadersAndAlert();
    }

    hasAllHeadersAndAlert() {
        if (!this.hasAllHeaders()) {
            let labelString = this.requiredHeaderLabels
                .map((label) => "\"" + label.toUpperCase() + "\"")
                .join(", ");
            alert(`Voeg velden ${labelString} toe.`);
            return false;
        }
        return true;
    }

    setTemplateAndCheck(template: HTMLTemplateElement) {
        this.headerIndices = NamedCellTableFetchListener.getHeaderIndicesFromTemplate(template);
        return this.hasAllHeadersAndAlert();
    }

    static getHeaderIndicesFromTemplate(template: HTMLTemplateElement){
        let headers = template.content.querySelectorAll("thead th") as NodeListOf<HTMLTableCellElement>;
        return this.getHeaderIndicesFromHeaderCells(headers);
    }

    static getHeaderIndicesFromDocument(element: HTMLElement){
        let headers = element.querySelectorAll("thead th") as NodeListOf<HTMLTableCellElement>;
        return this.getHeaderIndicesFromHeaderCells(headers);
    }

    static getHeaderIndicesFromHeaderCells(headers: NodeListOf<HTMLTableCellElement>) {
        let headerIndices: Map<string, number> = new Map();
        Array.from(headers)
            .forEach((header, index) => {
                let label = header.innerText;
                if (label.startsWith("e-mailadressen")) {
                    headerIndices.set("e-mailadressen", index);
                } else {
                    headerIndices.set(label, index);
                }
            });
        return headerIndices;
    }

    hasAllHeaders() {
        return this.requiredHeaderLabels.every((label) => this.hasHeader(label))
    }

    hasHeader(label: string) {
        return this.headerIndices.has(label);
    }

    getColumnText(tr: HTMLTableRowElement, label: string) : string {
        return tr.children[this.headerIndices.get(label)].textContent;
    }
}