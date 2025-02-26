import {TableDef} from "./table/tableDef";

/**
 * @returns `true` to continue, `false` to cancel further handling.
 */
type OnRowHandler = (tableDef: TableDef, rowObject: RowObject, collection: any) => boolean;

type OnBeforeLoadingHandler = (tableDef: TableDef) => boolean;
type OnLoadedHandler = (tableDef: TableDef) => void;
type OnRequiredColumnsMissingHandler = (tableDef: TableDef) => void;
type OnPageHandler = (tableDef: TableDef, text: string, collection: any, offset: number, template: HTMLTemplateElement, rows: NodeListOf<HTMLTableRowElement>) => void;

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

    onPage: OnPageHandler = (tableDef: TableDef, _text: string, collection: any, offset: number, _template, rows) => {
        if(!this.onRow)
            return;
        let index = 0;
        for (let row of rows) {
            let rowObject = new RowObject();
            rowObject.tr = row;
            rowObject.offset = offset;
            rowObject.index = index;
            if (!this.onRow(tableDef, rowObject, collection))
                return;
            index++;
        }
    }
}

export class SimpleTableHandler implements PageHandler {
    onBeforeLoading?: OnBeforeLoadingHandler;
    onLoaded: OnLoadedHandler;
    onPage: OnPageHandler;

    constructor(onLoaded: OnLoadedHandler, onBeforeLoading: OnBeforeLoadingHandler) {
        this.onBeforeLoading = onBeforeLoading;
        this.onLoaded = onLoaded;
        this.onPage = undefined;
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
export class NamedCellTablePageHandler implements PageHandler {
    private requiredHeaderLabels: string[];
    onBeforeLoading?: OnBeforeLoadingHandler;
    private headerIndices: Map<string, number>;
    onLoaded: OnLoadedHandler;
    onLoadedExternal: OnLoadedHandler;
    onColumnsMissing: OnRequiredColumnsMissingHandler;
    isValidPage: boolean;

    constructor(requiredHeaderLabels: string[], onLoaded: OnLoadedHandler, onRequiredColumnsMissing: OnRequiredColumnsMissingHandler) {
        this.requiredHeaderLabels = requiredHeaderLabels;
        this.onLoaded = this.onLoadedAndCheck;
        this.onLoadedExternal = onLoaded;
        this.onColumnsMissing = onRequiredColumnsMissing;
        this.headerIndices = undefined;
        this.isValidPage = false;
        this.onBeforeLoading = this.onBeforeLoadingHandler;
    }

    onLoadedAndCheck: OnLoadedHandler =  (tableDef: TableDef) => {
        if(this.isValidPage)
            this.onLoadedExternal(tableDef);
        else
            console.log("NamedCellPageHandler: Not calling OnLoaded handler because page is not valid.")
    }

    onPage: OnPageHandler = (_tableDef: TableDef, _text: string, _collection: any, offset: number, template, _rows)  => {
        if(offset === 0) {
            if (!this.setTemplateAndCheck(template)) {
                this.isValidPage = false;
                if (this.onColumnsMissing) {
                    this.onColumnsMissing(_tableDef);
                } else {
                    throw ("Cannot build table object - required columns missing");
                }
            } else {
                this.isValidPage = true;
            }
        }
    }

    onBeforeLoadingHandler() {
        this.headerIndices = NamedCellTablePageHandler.getHeaderIndicesFromDocument(document.body); //TODO: it's up to the tableDef to determine if a table has the valid columns.
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
        this.headerIndices = NamedCellTablePageHandler.getHeaderIndicesFromTemplate(template);
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
                let label = header.textContent;
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