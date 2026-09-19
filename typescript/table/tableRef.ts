import {TableNavigation} from "./tableNavigation";

export interface TableRef {
    htmlTableId: string;
    getOrgTableContainer(): HTMLElement;
    getOrgTableRows(): NodeListOf<HTMLTableRowElement>;
    createElementAboveTable(element: string): HTMLElement;
    isFullyFetched(): boolean;
}

export class PlainTableRef implements TableRef {
    htmlTableId: string;

    constructor(htmlTableId: string) {
        this.htmlTableId = htmlTableId;
    }

    getOrgTableContainer(): HTMLElement {
        return document.getElementById(this.htmlTableId)!.parentElement!;
    }

    getOrgTableRows(): NodeListOf<HTMLTableRowElement> {
        return document.getElementById(this.htmlTableId)!.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>;
    }

    createElementAboveTable(element: string): HTMLElement {
        let el = document.createElement(element);
        document.getElementById(this.htmlTableId)!.insertAdjacentElement("beforebegin", el);
        return el;
    }

    isFullyFetched(): boolean {
        return true;
    }
}

export class DkoTableRef implements TableRef {
    htmlTableId: string;
    buildFetchPageUrl: (offset: number) => string;
    navigationData: TableNavigation;

    constructor(htmlTableId: string, navigationData: TableNavigation, buildFetchUrl: (offset: number) => string) {
        this.htmlTableId = htmlTableId;
        this.buildFetchPageUrl = buildFetchUrl;
        this.navigationData = navigationData;
    }

    getOrgTableContainer() {
        return document.getElementById(this.htmlTableId) as HTMLElement;
    }

    getOrgTableRows() {
        return this.getOrgTableContainer().querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>;
    }

    createElementAboveTable(element: string): HTMLElement {
        let el = document.createElement(element);
        this.getOrgTableContainer().insertAdjacentElement("beforebegin", el);
        return el;
    }

    isFullyFetched(): boolean {
        return this.getOrgTableContainer().querySelector("table")!.classList.contains("fullyFetched");
    }
}