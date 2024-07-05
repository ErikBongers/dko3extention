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

    getCacheId() {
        let checksum = "";
        if (this.calculateTableCheckSum)
            checksum = "__" + this.calculateTableCheckSum(this);
        let id = this.newTableId + checksum;
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
        console.log(`TODO: save cache with key: ${this.getCacheId()}`);
    }

    async #doFetchAllPages(results: any, progressBar: ProgressBar) {
        let offset = 0;
        try {
            while (true) {
                console.log("fetching page " + offset);
                let response = await fetch(this.tableRef.buildFetchUrl(offset));
                let text = await response.text();
                let template: HTMLTemplateElement;
                if(offset === 0) {
                    this.shadowTableTemplate = document.createElement('template');
                    this.shadowTableTemplate.innerHTML = text;
                    template = this.shadowTableTemplate;
                } else {
                    template = document.createElement('template');
                    template.innerHTML = text;
                }
                let rows = template.content.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>;
                if (this.pageHandler.onPage)
                    this.pageHandler.onPage(this, text, results, offset, template, rows);
                if(offset !== 0) {
                    this.shadowTableTemplate.content.querySelector("tbody").append(...rows);
                }
                offset += this.tableRef.navigationData.step;
                if (!progressBar.next())
                    break;
            }
        } finally {
            progressBar.stop();
        }
        return results;
    }
}


