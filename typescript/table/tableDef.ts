import {PageHandler} from "../pageHandlers";
import {findFirstNavigation, TableNavigation} from "./tableNavigation";
import {insertProgressBar, ProgressBar} from "../progressBar";
import * as def from "../def";
import {db3, millisToString} from "../globals";

export class TableRef {
    htmlTableId: string;
    buildFetchUrl: (offset: number) => string;
    navigationData: TableNavigation;

    constructor(htmlTableId: string, navigationData: TableNavigation, buildFetchUrl: (offset: number) => string) {
        this.htmlTableId = htmlTableId;
        this.buildFetchUrl = buildFetchUrl;
        this.navigationData = navigationData;
    }

    getOrgTable() {
        return document.getElementById(this.htmlTableId) as HTMLTableElement;
    }

    createElementAboveTable(element: string): HTMLElement {
        let el = document.createElement(element);
        this.getOrgTable().insertAdjacentElement("beforebegin", el);
        return el;
    }
}

export function findTableRefInCode() {
    let foundTableRef = findTable();
    if(!foundTableRef)
        return undefined;

    let buildFetchUrl = (offset: number) => `/views/ui/datatable.php?id=${foundTableRef.viewId}&start=${offset}&aantal=0`;

    let navigation = findFirstNavigation();
    if(!navigation)
        return undefined;

    return new TableRef( foundTableRef.tableId, navigation, buildFetchUrl)
}

function findTable() {
    let table = document.querySelector("div.table-responsive > table");
    let tableId = table.id
        .replace("table_", "")
        .replace("_table", "");

    let parentDiv = document.querySelector("div#"+"table_"+tableId);
    let scripts = Array.from(parentDiv.querySelectorAll("script")).map((script) => script.text).join("\n");
    let goto = scripts.split("_goto(")[1];
    let func = goto.split(/ function *\w/)[0];

    let viewId = / *datatable_id *= *'(.*)'/.exec(func)[1];
    let url = /_table'\).load\('(.*?)\?id='\s*\+\s*datatable_id\s*\+\s*'&start='\s*\+\s*start/.exec(func)[1];
    //if we got so far, we can be sure this table is a standard one.
    return {
        tableId: table.id,
        viewId,
        url
    };
}

export type CalculateTableCheckSumHandler = (tableDef: TableDef) => string;

export class TableDef {
    tableRef: TableRef;
    pageHandler: PageHandler;
    parallelData = undefined;
    calculateTableCheckSum: CalculateTableCheckSumHandler;
    private shadowTableTemplate: HTMLTemplateElement;
    isUsingCached = false;
    divInfoContainer: HTMLDivElement;
    shadowTableDate: Date;
    private tempMessage = "";

    constructor(tableRef: TableRef, pageHandler: PageHandler, calculateTableCheckSum: CalculateTableCheckSumHandler) {
        this.tableRef = tableRef;
        this.pageHandler = pageHandler;
        if(!calculateTableCheckSum)
            throw ("Tablechecksum required.");
        this.calculateTableCheckSum = calculateTableCheckSum;
    }

    saveToCache() {
        db3(`Caching ${this.getCacheId()}.`);
        window.sessionStorage.setItem(this.getCacheId(), this.shadowTableTemplate.innerHTML);
        window.sessionStorage.setItem(this.getCacheId()+ def.CACHE_DATE_SUFFIX, (new Date()).toJSON());
    }

    clearCache() {
        db3(`Clear cache for ${this.tableRef.htmlTableId}.`);
        window.sessionStorage.removeItem(this.getCacheId());
        window.sessionStorage.removeItem(this.getCacheId()+ def.CACHE_DATE_SUFFIX);
    }

    loadFromCache() {
        if(this.tableRef.navigationData.isOnePage())
            return null;

        db3(`Loading from cache: ${this.getCacheId()}.`);
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
        let id = this.tableRef.htmlTableId + checksum;
        return id.replaceAll(/\s/g, "");
    }


    setupInfoBar() {
        if(!this.divInfoContainer) {
            this.divInfoContainer = this.tableRef.createElementAboveTable("div") as HTMLDivElement;
        }
        this.divInfoContainer.classList.add("infoLine");
    }

    clearInfoBar() {
        this.divInfoContainer.innerHTML = "";
    }

    updateInfoBar() {
        this.updateCacheInfo();
        this.#updateTempMessage();
        //...update other info...
    }

    setTempMessage(msg: string) {
        this.tempMessage = msg;
        this.#updateTempMessage();
        setTimeout(this.clearTempMessage.bind(this), 4000);
    }

    clearTempMessage() {
        this.tempMessage = "";
        this.#updateTempMessage();
    }

    #updateTempMessage() {
        let p = document.getElementById(def.TEMP_MSG_ID);
        if(this.tempMessage === "") {
            if(p) p.remove();
            return;
        }
        if(!p) {
            p = document.createElement("p");
            this.divInfoContainer.appendChild(p);
            p.classList.add("tempMessage");
            p.id = def.TEMP_MSG_ID;
        }
        p.innerHTML = this.tempMessage;
    }

    clearCacheInfo() {
        document.getElementById(def.CACHE_INFO_ID)?.remove();
    }

    updateCacheInfo() {
        let p = document.getElementById(def.CACHE_INFO_ID);
        if(!this.isUsingCached) {
            if(p) p.remove();
            return;
        }

        if(!p) {
            p = document.createElement("p");
            this.divInfoContainer.appendChild(p);
            p.classList.add("cacheInfo");
            p.id = def.CACHE_INFO_ID;
        }
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
    async getTableData(parallelAsyncFunction?: (() => Promise<any>)) {
        this.setupInfoBar();
        this.clearCacheInfo();
        let cachedData = this.loadFromCache();

        if(cachedData) {
            if(parallelAsyncFunction) {
                this.parallelData = await parallelAsyncFunction();
            }
            this.shadowTableTemplate = document.createElement("template");
            this.shadowTableTemplate.innerHTML = cachedData.text;
            this.shadowTableDate = cachedData.date;
            this.isUsingCached = true;
            db3(`${this.tableRef.htmlTableId}: using cached data.`);
            let rows = this.shadowTableTemplate.content.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>;
            if (this.pageHandler.onPage)
                this.pageHandler.onPage(this, this.shadowTableTemplate.innerHTML, 0, this.shadowTableTemplate, rows);
            if (this.pageHandler.onLoaded)
                this.pageHandler.onLoaded(this);
        } else {
            this.isUsingCached = false;
            let success = await this.#fetchPages(parallelAsyncFunction);
            if(!success)
                return;
            this.saveToCache();
            if (this.pageHandler.onLoaded)
                this.pageHandler.onLoaded(this);
        }
        this.updateInfoBar();
    }

    async #fetchPages(parallelAsyncFunction: () => Promise<any>) {
        if (this.pageHandler.onBeforeLoading) {
            if(!this.pageHandler.onBeforeLoading(this))
                return false;
        }
        let progressBar = insertProgressBar(this.divInfoContainer, this.tableRef.navigationData.steps(), "loading pages... ");
        progressBar.start();
        if (parallelAsyncFunction) {
            let doubleResults = await Promise.all([
                this.#doFetchAllPages(progressBar),
                parallelAsyncFunction()
            ]);
            this.parallelData = doubleResults[1];
        } else {
            await this.#doFetchAllPages(progressBar);
        }
        return true;
    }

    async #doFetchAllPages(progressBar: ProgressBar) {
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
                    this.pageHandler.onPage(this, text, offset, template, rows);
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
    }

    getRows() {
        //TODO: this function should be only accessible after a fetch of the table. Perhaps the fetch should return a promise<FetchedTable> where FetchedTable is a proxy/wrap of TableDef?
        let template = this.shadowTableTemplate;
        return template.content.querySelectorAll("tbody tr") as NodeListOf<HTMLTableRowElement>;
    }
    getRowsAsArray() {
        return Array.from(this.getRows());
    }
}


