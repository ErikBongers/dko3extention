import {PageHandler} from "../pageHandlers.js";
import {TableNavigation} from "./tableNavigation.js";
import {insertProgressBar, ProgressBar} from "../progressBar.js";

export interface TableRef {
    buildFetchUrl: (offset: number) => string;
    getOrgTable: () => HTMLTableElement;
    navigationData: TableNavigation;
}

export class IdTableRef implements TableRef {
    tableId: string;
    buildFetchUrl: (offset: number) => string;
    navigationData: TableNavigation;

    constructor(tableId: string, navigationData: TableNavigation, buildFetchUrl: (offset: number) => string) {
        this.tableId = tableId;
        this.buildFetchUrl = buildFetchUrl;
        this.navigationData = navigationData;
    }

    getOrgTable() {
        return document.getElementById(this.tableId) as HTMLTableElement;
    }
}

export type CalculateTableCheckSumHandler = (tableDef: TableDef) => string;

export class TableDef {
    tableRef: TableRef;
    pageHandler: PageHandler;
    newTableId: string;
    lastFetchResults: any;
    theData: string;
    calculateTableCheckSum: CalculateTableCheckSumHandler;
    shadowTableTemplate: HTMLTemplateElement;

    constructor(tableRef: TableRef, pageHandler: PageHandler, newTableId: string, calculateTableCheckSum: CalculateTableCheckSumHandler) {
        this.tableRef = tableRef;
        this.pageHandler = pageHandler;
        this.newTableId = newTableId;
        this.calculateTableCheckSum = calculateTableCheckSum;
    }

    cacheData() {
        console.log(`Caching ${this.newTableId}.`);
        window.sessionStorage.setItem(this.newTableId, this.tableRef.getOrgTable().querySelector("tbody").innerHTML);
    }

    getCached() {
        return window.sessionStorage.getItem(this.newTableId);
    }

    displayCached() {
        //TODO: also show "this is cached data" and a link to refresh.
        this.tableRef.getOrgTable().querySelector("tbody").innerHTML = this.getCached();
    }

    getCacheId() {
        let checksum = this.calculateTableCheckSum?.(this) ?? "";
        let id = this.newTableId + "__" + checksum;
        return id.replaceAll(/\s/g, "");
    }

    async getTableData(rawData: any, parallelAsyncFunction: (() => Promise<any>)) {
        console.log(`TODO: try to load cache with key: ${this.getCacheId()}`);
        let cachedData = this.getCached();

        if(cachedData) {
            if(parallelAsyncFunction) {
                this.lastFetchResults = await parallelAsyncFunction();
            }
        } else {
            await this.#fetchPages(parallelAsyncFunction, rawData);
        }
    }

    async #fetchPages(parallelAsyncFunction: () => Promise<any>, rawData: any) {
        let progressBar = insertProgressBar(this.tableRef.getOrgTable(), this.tableRef.navigationData.steps(), "loading pages... ");
        progressBar.start();
        if (this.pageHandler.onBeforeLoading)
            this.pageHandler.onBeforeLoading(this);

        if (parallelAsyncFunction) {
            this.lastFetchResults = await Promise.all([
                this.#doFetchAllPages(rawData, progressBar),
                parallelAsyncFunction()
            ]);
        } else {
            this.lastFetchResults = await this.#doFetchAllPages(rawData, progressBar);
        }
        if (this.pageHandler.onLoaded)
            this.pageHandler.onLoaded(this);
        this.theData = this.pageHandler.getData(this);
        //TODO: merge theData and lastFetchedData? Two types of data: the fetchedData is literally that. The cachedData may be the same or may be the html text of the table body! Only the tableDef knows this!
        // Make a handler that builds the table, based on the prepared data.
        // rawData and preparedData.
        // handlers:
        // - convertToSavableData()
        // - showTable() ? or not needed?
        console.log(`TODO: save cache with key: ${this.getCacheId()}`);
    }

    async #doFetchAllPages(results: any, progressBar: ProgressBar) {
        let offset = 0;
        try {
            while (true) {
                console.log("fetching page " + offset);
                let response = await fetch(this.tableRef.buildFetchUrl(offset));
                let text = await response.text();
                this.pageHandler.onPage?.(this, text, results, offset); //TODO: make optional call
                this.addPagetoShadowTable(text, offset);
                offset += this.tableRef.navigationData.step;
                if (!progressBar.next())
                    break;
            }
        } finally {
            progressBar.stop();
        }
        return results;
    }

    addPagetoShadowTable(text: string, offset: number) {
        if(offset === 0) {
            this.shadowTableTemplate = document.createElement('template');
            this.shadowTableTemplate.innerHTML = text;
            return this.shadowTableTemplate.content.querySelectorAll("tbody > tr").length;
        }
        let template = document.createElement('template');
        template.innerHTML = text;
        let rows = template.content.querySelectorAll("tbody > tr");
        this.shadowTableTemplate.content.querySelector("tbody").append(...rows);
        return rows.length;
    }
}


