import {TableFetcher, TableFetchListener} from "./table/tableFetcher";
type OnBeforeLoadingHandler = (tableDef: TableFetcher) => boolean;
type OnRequiredColumnsMissingHandler = (tableDef: TableFetcher) => void;
type NotHTMLTemplate = HTMLDivElement | DocumentFragment; //HTMLDiv element is arbitrarily chosen. Any subclass from HTMLElement will do.

/**
 * NamedCellTableFetchListener with named column labels.\
 * Params are:
 * @description
 *      * requiredHeaderLabels: array with labels of required columns.
 *      * onRequiredColumnsMissing: OnRequiredColumnsMissingHandler, which will be called when labels are missing.
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
        if(!this.headerIndices) {
            this.headerIndices = NamedCellTableFetchListener.getHeaderIndices(tableFetcher.fetchedTable.getTemplate().content as NotHTMLTemplate);
            if (!this.hasAllHeadersAndAlert()) {
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

    onBeforeLoadingPage(tableFetcher: TableFetcher): boolean {
        let orgTableContainer = tableFetcher.tableRef.getOrgTableContainer();
        if(!orgTableContainer)
            return true;//postpone field checks to first page load.
        this.headerIndices = NamedCellTableFetchListener.getHeaderIndices(orgTableContainer as NotHTMLTemplate);
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

    static getHeaderIndices(element: NotHTMLTemplate){
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