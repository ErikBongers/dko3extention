import {PageHandler} from "../pageHandlers";
import {findFirstNavigation, TableNavigation} from "./tableNavigation";
import {insertProgressBar, ProgressBar} from "../progressBar";
import * as def from "../def";
import {db3, millisToString} from "../globals";
import {InfoBar} from "../infoBar";
import Tab = chrome.tabs.Tab;

export class TableRef {
    htmlTableId: string;
    buildFetchUrl: (offset: number) => string;
    navigationData: TableNavigation;

    constructor(htmlTableId: string, navigationData: TableNavigation, buildFetchUrl: (offset: number) => string) {
        this.htmlTableId = htmlTableId;
        this.buildFetchUrl = buildFetchUrl;
        this.navigationData = navigationData;
    }

    getOrgTableContainer() {
        return document.getElementById(this.htmlTableId) as HTMLElement;
    }

    createElementAboveTable(element: string): HTMLElement {
        let el = document.createElement(element);
        this.getOrgTableContainer().insertAdjacentElement("beforebegin", el);
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

export type CheckSumBuilder = (tableDef: TableFetcher) => string;

export interface TableHandler {
    onReset: (tableDef: TableFetcher) => void;
}

export interface TableFetchListener {
    onStart: (tableFetcher: TableFetcher) => void,
    onLoaded: (tableFetcher: TableFetcher) => void,
    onBeforeLoadingPage: (tableFetcher: TableFetcher) => boolean,
    onFinished: (tableFetcher: TableFetcher) => void,
    onPageLoaded: (tableFetcher: TableFetcher, pageCnt: number, text: string) => void
}

export class TableFetcher {
    tableRef: TableRef;
    calculateTableCheckSum: CheckSumBuilder;
    isUsingCached = false;
    shadowTableDate: Date;
    fetchedTable?: FetchedTable;
    tableHandler?: TableHandler;
    listeners: TableFetchListener[];

    constructor(tableRef: TableRef, calculateTableCheckSum: CheckSumBuilder, tableHandler?: TableHandler) {
        this.tableRef = tableRef;
        if(!calculateTableCheckSum)
            throw ("Tablechecksum required.");
        this.calculateTableCheckSum = calculateTableCheckSum;
        this.fetchedTable = undefined;
        this.tableHandler = tableHandler;
        this.listeners = [];
    }

    reset() {
        this.clearCache();
        this.tableHandler?.onReset?.(this);
    }

    clearCache() {
        db3(`Clear cache for ${this.tableRef.htmlTableId}.`);
        window.sessionStorage.removeItem(this.getCacheId());
        window.sessionStorage.removeItem(this.getCacheId()+ def.CACHE_DATE_SUFFIX);
        this.fetchedTable = undefined;
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

    async fetch() {
        this.onStart();
        if(this.fetchedTable) {
            this.onFinished();
            return this.fetchedTable;
        }
        let cachedData = this.loadFromCache();

        this.fetchedTable = new FetchedTable(this);
        if(cachedData) {
            this.fetchedTable.addPage(cachedData.text);
            this.shadowTableDate = cachedData.date;
            this.isUsingCached = true;
            this.onPageLoaded(1, cachedData.text); //fake one page load.
            this.onLoaded();
        } else {
            this.isUsingCached = false;
            let success = await this.#fetchPages(this.fetchedTable);
            if(!success)
                return this.fetchedTable;
            this.fetchedTable.saveToCache();
            this.onLoaded();
        }
        this.onFinished();
        return this.fetchedTable;
    }

    onStart() {
        for(let lst of this.listeners)
            lst.onStart?.(this);
    }
    onFinished() {
        for(let lst of this.listeners)
            lst.onFinished?.(this);
    }
    onPageLoaded(pageCnt: number, text: string) {
        for(let lst of this.listeners)
            lst.onPageLoaded?.(this, pageCnt, text);
    }
    onLoaded() {
        for(let lst of this.listeners)
            lst.onLoaded?.(this);
    }
    onBeforeLoadingPage() {
        for(let lst of this.listeners){
            if (lst.onBeforeLoadingPage) {
                if(!lst.onBeforeLoadingPage(this))
                    return false;
            }
        }
        return true;
    }

    async #fetchPages(fetchedTable: FetchedTable) {
        if(!this.onBeforeLoadingPage())
            return false;
        await this.#doFetchAllPages(fetchedTable);
        return true;
    }

    async #doFetchAllPages(fetchedTable: FetchedTable) {
        try {
            let pageCnt = 0;
            while (true) {
                console.log("fetching page " + fetchedTable.getNextPageNumber());
                let response = await fetch(this.tableRef.buildFetchUrl(fetchedTable.getNextOffset()));
                let text = await response.text();
                fetchedTable.addPage(text);
                pageCnt++;
                this.onPageLoaded(pageCnt, text);
                if(pageCnt >= this.tableRef.navigationData.steps())
                    break;
            }
        } finally {
        }
    }

    addListener(listener: TableFetchListener) {
        this.listeners.push(listener);
    }

}

export class FetchedTable {
    private readonly shadowTableTemplate: HTMLTemplateElement;
    tableFetchere: TableFetcher;
    lastPageNumber: number;
    lastPageStartRow: number;

    constructor(tableDef: TableFetcher) {
        this.tableFetchere = tableDef;
        this.lastPageNumber = -1;
        this.lastPageStartRow = 0;
        this.shadowTableTemplate = document.createElement("template");
    }

    getRows() {
        let template = this.shadowTableTemplate;
        return template.content.querySelectorAll("tbody tr:not(:has(i.fa-meh))") as NodeListOf<HTMLTableRowElement>;
    }

    getRowsAsArray = () => Array.from(this.getRows());
    getLastPageRows = () => this.getRowsAsArray().slice(this.lastPageStartRow);
    getLastPageNumber = () => this.lastPageNumber;
    getNextPageNumber = () => this.lastPageNumber+1;
    getNextOffset = () => this.getNextPageNumber()*this.tableFetchere.tableRef.navigationData.step;
    getTemplate = () => this.shadowTableTemplate;

    saveToCache() {
        db3(`Caching ${this.tableFetchere.getCacheId()}.`);
        window.sessionStorage.setItem(this.tableFetchere.getCacheId(), this.shadowTableTemplate.innerHTML);
        window.sessionStorage.setItem(this.tableFetchere.getCacheId()+ def.CACHE_DATE_SUFFIX, (new Date()).toJSON());
    }

    addPage(text: string) {
        let pageTemplate: HTMLTemplateElement;
        pageTemplate = document.createElement('template');
        pageTemplate.innerHTML = text;
        let rows = pageTemplate.content.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>;

        this.lastPageStartRow = this.getRows().length;
        if(this.lastPageNumber === -1)
            this.shadowTableTemplate.innerHTML = text; //to create the <table> and <tbody> and such.
        else
            this.shadowTableTemplate.content.querySelector("tbody").append(...rows);
        this.lastPageNumber++;
    }

}


