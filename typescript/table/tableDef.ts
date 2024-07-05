import {PageHandler} from "../pageHandlers.js";
import {findFirstNavigation, TableNavigation} from "./tableNavigation.js";
import {insertProgressBar, ProgressBar} from "../progressBar.js";
import * as def from "../lessen/def.js";
import {db3, millisToString} from "../globals.js";

export class TableRef {
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

let tableRefs = new Map([
    ["werklijst", new TableRef("table_leerlingen_werklijst_table", findFirstNavigation(),(offset) => "/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0")]
]);








export type CalculateTableCheckSumHandler = (tableDef: TableDef) => string;

export class TableDef {
    tableRef: TableRef;
    pageHandler: PageHandler;
    parallelData = undefined;
    calculateTableCheckSum: CalculateTableCheckSumHandler;
    shadowTableTemplate: HTMLTemplateElement;
    isUsingChached = false;
    divInfoContainer: HTMLDivElement;
    shadowTableDate: Date;

    constructor(tableRef: TableRef, pageHandler: PageHandler, calculateTableCheckSum: CalculateTableCheckSumHandler) {
        this.tableRef = tableRef;
        this.pageHandler = pageHandler;
        this.calculateTableCheckSum = calculateTableCheckSum;
        this.setupInfoBar();
    }

    saveToCache() {
        db3(`Caching ${this.tableRef.tableId}.`);
        window.sessionStorage.setItem(this.getCacheId(), this.shadowTableTemplate.innerHTML);
        window.sessionStorage.setItem(this.getCacheId()+ def.CACHE_DATE_SUFFIX, (new Date()).toJSON());
    }

    clearCache() {
        db3(`Clear cache for ${this.tableRef.tableId}.`);
        window.sessionStorage.removeItem(this.getCacheId());
        window.sessionStorage.removeItem(this.getCacheId()+ def.CACHE_DATE_SUFFIX);
    }

    loadFromCache() {
        let text =  window.sessionStorage.getItem(this.getCacheId());
        let dateString = window.sessionStorage.getItem(this.getCacheId() + def.CACHE_DATE_SUFFIX);
        if(!text)
            return undefined;
        return {
            text,
            date: new Date(dateString)
        };
    }

    getCacheId() {
        let checksum = "";
        if (this.calculateTableCheckSum)
            checksum = "__" + this.calculateTableCheckSum(this);
        let id = this.tableRef.tableId + checksum;
        return id.replaceAll(/\s/g, "");
    }

    setupInfoBar() {
        this.divInfoContainer = document.createElement("div");
        this.tableRef.getOrgTable().insertAdjacentElement("beforebegin", this.divInfoContainer);
        this.divInfoContainer.classList.add("infoLine");
    }

    clearInfoBar() {
        this.divInfoContainer.innerHTML = "";
    }

    updateInfoBar() {
        if(this.isUsingChached) {
            let p = document.createElement("p");
            this.divInfoContainer.appendChild(p);
            p.classList.add("cacheInfo");
            p.innerHTML = `Gegevens uit cache, ${millisToString((new Date()).getTime()-this.shadowTableDate.getTime())} oud. `;
            let a = document.createElement("a");
            p.appendChild(a);
            a.innerHTML = "refresh";
            a.href="#";
            a.onclick = (e ) => {
                e.preventDefault();
                this.clearCache();
                // noinspection JSIgnoredPromiseFromCall
                this.getTableData();
                return true;
            }
        }
    }
    async getTableData(rawData?: any, parallelAsyncFunction?: (() => Promise<any>)) {
        this.clearInfoBar();
        let cachedData = this.loadFromCache();

        if(cachedData) {
            if(parallelAsyncFunction) {
                this.parallelData = await parallelAsyncFunction();
            }
            this.shadowTableTemplate = document.createElement("template");
            this.shadowTableTemplate.innerHTML = cachedData.text;
            this.shadowTableDate = cachedData.date;
            this.isUsingChached = true;
            db3(`${this.tableRef.tableId}: using cached data.`);
            let rows = this.shadowTableTemplate.content.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>;
            //TODO: collection is set to undefined. This call to onPage(), should be EXACTLY the same as with a real fetch.
            if (this.pageHandler.onPage)
                this.pageHandler.onPage(this, this.shadowTableTemplate.innerHTML, undefined, 0, this.shadowTableTemplate, rows);
            if (this.pageHandler.onLoaded)
                this.pageHandler.onLoaded(this);
        } else {
            this.isUsingChached = false;
            await this.#fetchPages(parallelAsyncFunction, rawData);
            this.saveToCache();
            if (this.pageHandler.onLoaded)
                this.pageHandler.onLoaded(this);
        }
        this.updateInfoBar();
    }

    async #fetchPages(parallelAsyncFunction: () => Promise<any>, collection: any) {
        let progressBar = insertProgressBar(this.divInfoContainer, this.tableRef.navigationData.steps(), "loading pages... ");
        progressBar.start();
        if (this.pageHandler.onBeforeLoading)
            this.pageHandler.onBeforeLoading(this);

        if (parallelAsyncFunction) {
            let doubleResults = await Promise.all([
                this.#doFetchAllPages(collection, progressBar),
                parallelAsyncFunction()
            ]);
            this.parallelData = doubleResults[1];
        } else {
            await this.#doFetchAllPages(collection, progressBar);
        }
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


