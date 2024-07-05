import {TableDef} from "./table/tableDef.js";

type OnRowHandler = (tableDef: TableDef, rowObject: RowObject, collection: any) => boolean;
type OnBeforeLoadingHandler = (tableDef: TableDef) => void;
type OnLoadedHandler = (tableDef: TableDef) => void;
type GetDataHandler = (tableDef: TableDef) => string;
type OnPageHandler = (tableDef: TableDef, text: string, collection: any, offset: number) => void;

export interface PageHandler {
    onPage: OnPageHandler;
    onLoaded: OnLoadedHandler;
    onBeforeLoading?: OnBeforeLoadingHandler;
    getData: (tableDef: TableDef) => string;
}

export class RowObject {
    tr: HTMLTableRowElement;
    getColumnText: (label: string) => string;
    offset: number;
    index: number;
}

export class RowPageHandler implements PageHandler {
    private readonly onRow: OnRowHandler;
    onBeforeLoading?: OnBeforeLoadingHandler;
    private rows?: NodeListOf<HTMLTableRowElement>;
    getData: GetDataHandler;
    onLoaded: OnLoadedHandler;

    constructor(onRow: OnRowHandler, onLoaded: OnLoadedHandler, onBeforeLoading: OnBeforeLoadingHandler, getData: GetDataHandler) {
        this.onRow = onRow;
        this.onBeforeLoading = onBeforeLoading;
        this.getData = getData;
        this.onLoaded = onLoaded;
        this.rows = undefined;
    }

    onPage(tableDef: TableDef, text: string, collection: any, offset: number) {
        const template = document.createElement('template');
        template.innerHTML = text;

        this.rows = template.content.querySelectorAll("tbody > tr");
        let index = 0;
        for (let row of this.rows) {
            let rowObject = new RowObject();
            rowObject.tr = row;
            rowObject.offset = offset;
            rowObject.index = index;
            if (!this.onRow(tableDef, rowObject, collection))
                return;
            index++;
        }
        return this.rows.length;
    }
}

export class SimpleTableHandler implements PageHandler {
    onBeforeLoading?: OnBeforeLoadingHandler;
    getData: GetDataHandler;
    onLoaded: OnLoadedHandler;
    onPage: OnPageHandler;

    constructor(onLoaded: OnLoadedHandler, onBeforeLoading: OnBeforeLoadingHandler, getData: GetDataHandler) {
        this.onBeforeLoading = onBeforeLoading;
        this.getData = getData;
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
export class NamedCellPageHandler implements PageHandler {
    private requiredHeaderLabels: string[];
    private readonly onRow: OnRowHandler;
    onBeforeLoading?: OnBeforeLoadingHandler;
    private rows?: NodeListOf<HTMLTableRowElement>;
    private headerIndices: Map<string, number>;
    private currentRow?: HTMLTableRowElement;
    getData: GetDataHandler;
    onLoaded: OnLoadedHandler;

    constructor(requiredHeaderLabels: string[], onRow: OnRowHandler, getData: GetDataHandler, onLoaded: OnLoadedHandler, onBeforeLoading?: OnBeforeLoadingHandler) {
        this.requiredHeaderLabels = requiredHeaderLabels;
        this.onRow = onRow;
        this.onBeforeLoading = onBeforeLoading;
        this.onLoaded = onLoaded;
        this.getData = getData;
        this.rows = undefined;
        this.headerIndices = undefined;
        this.currentRow = undefined;
    }

    onPage(tableDef: TableDef, text: string, collection: any, offset: number) {
        if(offset === 0) {
            const template = document.createElement('template');
            template.innerHTML = text;

            if (!this.setTemplateAndCheck(template))
                throw ("Cannot build table object - required columns missing");

            this.rows = template.content.querySelectorAll("tbody > tr");
            this.forEachRow(tableDef, collection);
        }
        return this.rows.length;
    }

    setTemplateAndCheck(template: HTMLTemplateElement) {
        this.rows = template.content.querySelectorAll("tbody > tr");
        this.headerIndices = NamedCellPageHandler.getHeaderIndices(template);
        if (!this.hasAllHeaders()) {
            let labelString = this.requiredHeaderLabels
                .map((label) => "\"" + label.toUpperCase() + "\"")
                .join(", ");
            alert(`Voeg velden ${labelString} toe.`);
            return false;
        }
        return true;
    }

    static getHeaderIndices(template: HTMLTemplateElement) {
        let headers = template.content.querySelectorAll("thead th") as NodeListOf<HTMLTableCellElement>;

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

    #getColumnText(label: string) {
        return this.currentRow.children[this.headerIndices.get(label)].textContent;
    }

    getColumnText2(tr: HTMLTableRowElement, label: string) : string {
        return tr.children[this.headerIndices.get(label)].textContent;
    }

    forEachRow(tableDef: TableDef, collection: any) {
        for (let row of this.rows) {
            this.currentRow = row;
            let rowObject = new RowObject();
            rowObject.tr =  row;
            rowObject.getColumnText =  (label: string) => this.#getColumnText(label);
            if (!this.onRow(tableDef, rowObject, collection))
                return;
        }
    }
}