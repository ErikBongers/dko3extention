import {findFirstNavigation} from "./tableNavigation";
import * as def from "../def";
import {db3} from "../globals";
import {DkoTableRef, TableRef} from "./tableRef";

export function findTableRefInCode() {
    let foundTableRef = findTable();
    if(!foundTableRef)
        return undefined;

    let buildFetchUrl = (offset: number) => `/views/ui/datatable.php?id=${foundTableRef.viewId}&start=${offset}&aantal=0`;

    let navigation = findFirstNavigation();
    if(!navigation)
        return undefined;

    return new DkoTableRef( foundTableRef.tableId, navigation, buildFetchUrl)
}

function findTable() {
    let table = document.querySelector("div.table-responsive > table");
    if(!table)
        return null;
    let tableId = table.id
        .replace("table_", "")
        .replace("_table", "");

    let parentDiv = document.querySelector("div#"+"table_"+tableId)!;
    let scripts = Array.from(parentDiv.querySelectorAll("script")).map((script) => script.text).join("\n");
    let goto = scripts.split("_goto(")[1];
    let func = goto.split(/ function *\w/)[0];

    let viewId = / *datatable_id *= *'(.*)'/.exec(func)![1];
    let url = /_table'\).load\('(.*?)\?id='\s*\+\s*datatable_id\s*\+\s*'&start='\s*\+\s*start/.exec(func)![1];
    //if we got so far, we can be sure this table is a standard one.
    return {
        tableId: table.id,
        viewId,
        url
    };
}

export type CheckSumBuilder = (tableDef: TableFetcher) => string;

export interface TableHandler {
    onReset: (tableDef: NavigatableTableFetcher) => void;
}

export interface TableFetchListener {
    onStartFetching?: (tableFetcher: NavigatableTableFetcher) => void,
    onLoaded?: (tableFetcher: NavigatableTableFetcher) => void,
    onBeforeLoadingPage: (tableFetcher: NavigatableTableFetcher) => boolean,
    onFinished?: (tableFetcher: NavigatableTableFetcher, succes: boolean) => void,
    onPageLoaded: (tableFetcher: NavigatableTableFetcher, pageCnt: number, text: string) => void
}

export abstract class TableFetcher {
    calculateTableCheckSum: CheckSumBuilder;
    tableRef: TableRef;
    tableHandler?: TableHandler;
    listeners: TableFetchListener[];

    protected constructor(tableRef: TableRef, calculateTableCheckSum: CheckSumBuilder, tableHandler?: TableHandler) {
        this.calculateTableCheckSum = calculateTableCheckSum;
        this.tableRef = tableRef;
        this.tableHandler = tableHandler;
        this.listeners = [];
    }

    clearCache() {
        db3(`Clear cache for ${this.tableRef.htmlTableId}.`);
        window.sessionStorage.removeItem(this.getCacheId());
        window.sessionStorage.removeItem(this.getCacheId()+ def.CACHE_DATE_SUFFIX);
    }

    getCacheId() {
        let checksum = "";
        if (this.calculateTableCheckSum)
            checksum = "__" + this.calculateTableCheckSum(this);
        let id = this.tableRef.htmlTableId + checksum;
        return id.replaceAll(/\s/g, "");
    }

    addListener(listener: TableFetchListener) {
        this.listeners.push(listener);
    }

    abstract fetch(): Promise<FetchedTable>;
}

export class NavigatableTableFetcher extends TableFetcher {
    isUsingCached = false;
    shadowTableDate?: Date;
    fetchedTable?: NavigatableFetchedTable;
    private cancelRequested: boolean;
    private isFetchFinished: boolean;

    constructor(tableRef: DkoTableRef, calculateTableCheckSum: CheckSumBuilder, tableHandler?: TableHandler) {
        super(tableRef, calculateTableCheckSum, tableHandler);
        this.fetchedTable = undefined;
        this.cancelRequested = false;
        this.isFetchFinished = false;
    }

    reset() {
        this.clearCache();
        this.tableHandler?.onReset?.(this);
    }

    override clearCache() {
        super.clearCache();
        this.fetchedTable = undefined;
    }

    async cancel() {
        this.cancelRequested = true;
        while(!this.isFetchFinished) {
            await new Promise(resolve => setTimeout(resolve));
        }
        this.clearCache(); // only a partial table has been fetched.
    }

    getDkoTableRef() {
        return this.tableRef as DkoTableRef;
    }

    loadFromCache() {
        if(this.getDkoTableRef().navigationData.isOnePage())
            return null;

        db3(`Loading from cache: ${this.getCacheId()}.`);
        let text =  window.sessionStorage.getItem(this.getCacheId());
        let dateString = window.sessionStorage.getItem(this.getCacheId() + def.CACHE_DATE_SUFFIX);
        if(!text || !dateString)
            return undefined;
        return {
            text,
            date: new Date(dateString)
        };
    }

    async fetch(): Promise<FetchedTable> {
        if(this.fetchedTable) {
            this.onFinished(true);
            return this.fetchedTable;
        }
        this.isFetchFinished = false;
        let cachedData = this.loadFromCache();
        let succes: boolean;
        this.fetchedTable = new NavigatableFetchedTable(this);
        if(cachedData) {
            this.fetchedTable.addPage(cachedData.text);
            this.shadowTableDate = cachedData.date;
            this.isUsingCached = true;
            this.onPageLoaded(1, cachedData.text); //fake one page load.
            this.onLoaded();
            succes = true;
        } else {
            this.isUsingCached = false;
            succes = await this.#fetchPages(this.fetchedTable);
            if(!succes) {
                this.onFinished(succes);
                throw("Failed to fetch the pages."); //returns a reject Promise.
            }
            this.fetchedTable.saveToCache();
            this.onLoaded();
        }
        this.onFinished(succes);
        return this.fetchedTable;
    }

    onStartFetching() {
        for(let lst of this.listeners)
            lst.onStartFetching?.(this);
    }
    onFinished(succes: boolean) {
        this.isFetchFinished = true;
        for(let lst of this.listeners)
            lst.onFinished?.(this, succes);
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

    async #fetchPages(fetchedTable: NavigatableFetchedTable) {
        if(!this.onBeforeLoadingPage())
            return false;
        await this.#doFetchAllPages(fetchedTable);
        return true;
    }

    async #doFetchAllPages(fetchedTable: NavigatableFetchedTable) {
        try {
            this.onStartFetching();
            let pageCnt = 0;
            this.cancelRequested = false;
            while (true) {
                console.log("fetching page " + fetchedTable.getNextPageNumber());
                let response = await fetch(this.tableRef.buildFetchPageUrl(fetchedTable.getNextOffset()));
                let text = await response.text();
                fetchedTable.addPage(text);
                pageCnt++;
                this.onPageLoaded(pageCnt, text);
                if(pageCnt >= this.getDkoTableRef().navigationData.steps())
                    break;
                if(this.cancelRequested)
                    break;
            }
        } finally {
        }
    }
}

export interface FetchedTable {
    getRows(): NodeListOf<HTMLTableRowElement>;
    getRowsAsArray(): HTMLTableRowElement[];
    getTable(): HTMLTableElement;
    tableFetcher: TableFetcher;
}

export class NavigatableFetchedTable implements FetchedTable {
    private readonly shadowTableTemplate: HTMLTemplateElement;
    tableFetcher: NavigatableTableFetcher;
    lastPageNumber: number;
    lastPageStartRow: number;

    constructor(tableDef: NavigatableTableFetcher) {
        this.tableFetcher = tableDef;
        this.lastPageNumber = -1;
        this.lastPageStartRow = 0;
        this.shadowTableTemplate = document.createElement("template");
    }

    getRows() {
        let template = this.shadowTableTemplate;
        return template.content.querySelectorAll("tbody tr:not(:has(i.fa-meh))") as NodeListOf<HTMLTableRowElement>;
    }

    getTable() {
        return this.shadowTableTemplate.content.querySelector("table")!;
    }

    getRowsAsArray = () => Array.from(this.getRows());
    getLastPageRows = () => this.getRowsAsArray().slice(this.lastPageStartRow);
    getLastPageNumber = () => this.lastPageNumber;
    getNextPageNumber = () => this.lastPageNumber+1;
    getNextOffset = () => this.getNextPageNumber()*this.tableFetcher.getDkoTableRef().navigationData.step;
    getTemplate = () => this.shadowTableTemplate;

    saveToCache(retry: boolean = true) {
        db3(`Caching ${this.tableFetcher.getCacheId()}.`);
        try {
            window.sessionStorage.setItem(this.tableFetcher.getCacheId(), this.shadowTableTemplate.innerHTML);
            window.sessionStorage.setItem(this.tableFetcher.getCacheId() + def.CACHE_DATE_SUFFIX, (new Date()).toJSON());
        } catch (e) {
            console.error(e);
            if(!retry)
                return;
            console.log("Clearing session cache and trying again...");
            let sessionKeys = Object.keys(window.sessionStorage);
            for(let key of sessionKeys) {
                if(key.startsWith("table_leerlingen_werklijst")) {
                    window.sessionStorage.removeItem(key);
                }
            }
            this.saveToCache(false);
        }
    }

    addPage(text: string) {
        let pageTemplate: HTMLTemplateElement;
        pageTemplate = document.createElement('template');
        pageTemplate.innerHTML = text;
        //exclude fa-meh or textContent = "Geen resultaten gevonden."
        let rows = pageTemplate.content.querySelectorAll("tbody > tr:not(:has(i.fa-meh))") as NodeListOf<HTMLTableRowElement>;

        this.lastPageStartRow = this.getRows().length;
        if(this.lastPageNumber === -1) {
            this.shadowTableTemplate.innerHTML = text; //to create the <table> and <tbody> and such.
            this.shadowTableTemplate.content.querySelector("tbody")!.innerHTML = ""; //just keep the headers
        }
        this.shadowTableTemplate.content.querySelector("tbody")!.append(...rows);
        this.lastPageNumber++;
    }

}


