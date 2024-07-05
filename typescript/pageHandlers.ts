import {TableDef} from "./table/tableDef.js";

/**
 * @returns `true` to continue, `false` to cancel further handling.
 */
type OnRowHandler = (tableDef: TableDef, rowObject: RowObject, collection: any) => boolean;

type OnBeforeLoadingHandler = (tableDef: TableDef) => void;
type OnLoadedHandler = (tableDef: TableDef) => void;
type OnPageHandler = (tableDef: TableDef, text: string, collection: any, offset: number, template: HTMLTemplateElement, rows: NodeListOf<HTMLTableRowElement>) => void;

export interface PageHandler {
    onPage: OnPageHandler;
    onLoaded: OnLoadedHandler;
    onBeforeLoading?: OnBeforeLoadingHandler;
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
    onLoaded: OnLoadedHandler;

    constructor(onRow: OnRowHandler, onLoaded: OnLoadedHandler, onBeforeLoading: OnBeforeLoadingHandler) {
        this.onRow = onRow;
        this.onBeforeLoading = onBeforeLoading;
        this.onLoaded = onLoaded;
    }

    onPage: OnPageHandler = (tableDef: TableDef, text: string, collection: any, offset: number, template, rows) => {
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
export class NamedCellPageHandler implements PageHandler {
    private requiredHeaderLabels: string[];
    onBeforeLoading?: OnBeforeLoadingHandler;
    private headerIndices: Map<string, number>;
    onLoaded: OnLoadedHandler;

    constructor(requiredHeaderLabels: string[], onLoaded: OnLoadedHandler) {
        this.requiredHeaderLabels = requiredHeaderLabels;
        this.onLoaded = onLoaded;
        this.headerIndices = undefined;
    }

    onPage: OnPageHandler = (_tableDef: TableDef, _text: string, _collection: any, offset: number, template, _rows)  => {
        if(offset === 0) {
            if (!this.setTemplateAndCheck(template))
                throw ("Cannot build table object - required columns missing");
        }
    }

    setTemplateAndCheck(template: HTMLTemplateElement) {
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

    getColumnText(tr: HTMLTableRowElement, label: string) : string {
        return tr.children[this.headerIndices.get(label)].textContent;
    }
}