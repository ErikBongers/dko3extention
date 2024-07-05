var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TableDef_instances, _TableDef_fetchPages, _TableDef_doFetchAllPages;
import { insertProgressBar } from "../progressBar.js";
export class IdTableRef {
    constructor(tableId, navigationData, buildFetchUrl) {
        this.tableId = tableId;
        this.buildFetchUrl = buildFetchUrl;
        this.navigationData = navigationData;
    }
    getOrgTable() {
        return document.getElementById(this.tableId);
    }
}
export class TableDef {
    constructor(tableRef, pageHandler, newTableId, calculateTableCheckSum) {
        _TableDef_instances.add(this);
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
        let checksum = "";
        if (this.calculateTableCheckSum)
            checksum = "__" + this.calculateTableCheckSum(this);
        let id = this.newTableId + checksum;
        return id.replaceAll(/\s/g, "");
    }
    async getTableData(rawData, parallelAsyncFunction) {
        console.log(`TODO: try to load cache with key: ${this.getCacheId()}`);
        let cachedData = this.getCached();
        if (cachedData) {
            if (parallelAsyncFunction) {
                this.lastFetchResults = await parallelAsyncFunction();
            }
        }
        else {
            await __classPrivateFieldGet(this, _TableDef_instances, "m", _TableDef_fetchPages).call(this, parallelAsyncFunction, rawData);
        }
    }
}
_TableDef_instances = new WeakSet(), _TableDef_fetchPages = async function _TableDef_fetchPages(parallelAsyncFunction, rawData) {
    let progressBar = insertProgressBar(this.tableRef.getOrgTable(), this.tableRef.navigationData.steps(), "loading pages... ");
    progressBar.start();
    if (this.pageHandler.onBeforeLoading)
        this.pageHandler.onBeforeLoading(this);
    if (parallelAsyncFunction) {
        this.lastFetchResults = await Promise.all([
            __classPrivateFieldGet(this, _TableDef_instances, "m", _TableDef_doFetchAllPages).call(this, rawData, progressBar),
            parallelAsyncFunction()
        ]);
    }
    else {
        this.lastFetchResults = await __classPrivateFieldGet(this, _TableDef_instances, "m", _TableDef_doFetchAllPages).call(this, rawData, progressBar);
    }
    if (this.pageHandler.onLoaded)
        this.pageHandler.onLoaded(this);
    console.log(`TODO: save cache with key: ${this.getCacheId()}`);
}, _TableDef_doFetchAllPages = async function _TableDef_doFetchAllPages(results, progressBar) {
    let offset = 0;
    try {
        while (true) {
            console.log("fetching page " + offset);
            let response = await fetch(this.tableRef.buildFetchUrl(offset));
            let text = await response.text();
            let template;
            if (offset === 0) {
                this.shadowTableTemplate = document.createElement('template');
                this.shadowTableTemplate.innerHTML = text;
                template = this.shadowTableTemplate;
            }
            else {
                template = document.createElement('template');
                template.innerHTML = text;
            }
            let rows = template.content.querySelectorAll("tbody > tr");
            if (this.pageHandler.onPage)
                this.pageHandler.onPage(this, text, results, offset, template, rows);
            if (offset !== 0) {
                this.shadowTableTemplate.content.querySelector("tbody").append(...rows);
            }
            offset += this.tableRef.navigationData.step;
            if (!progressBar.next())
                break;
        }
    }
    finally {
        progressBar.stop();
    }
    return results;
};
//# sourceMappingURL=tableDef.js.map