var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _TableDef_instances, _TableDef_fetchPages, _TableDef_doFetchAllPages;
import { insertProgressBar } from "../progressBar.js";
import * as def from "../lessen/def.js";
import { db3 } from "../globals.js";
export class TableRef {
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
    constructor(tableRef, pageHandler, calculateTableCheckSum) {
        _TableDef_instances.add(this);
        this.parallelData = undefined;
        this.isUsingChached = true;
        this.tableRef = tableRef;
        this.pageHandler = pageHandler;
        this.calculateTableCheckSum = calculateTableCheckSum;
    }
    saveToCache() {
        db3(`Caching ${this.tableRef.tableId}.`);
        window.sessionStorage.setItem(this.getCacheId(), this.shadowTableTemplate.innerHTML);
        window.sessionStorage.setItem(this.getCacheId() + def.CACHE_DATE_SUFFIX, JSON.stringify(new Date()));
    }
    loadFromCache() {
        let text = window.sessionStorage.getItem(this.getCacheId());
        if (!text)
            return undefined;
        return {
            text,
            date: window.sessionStorage.getItem(this.getCacheId() + def.CACHE_DATE_SUFFIX)
        };
    }
    getCacheId() {
        let checksum = "";
        if (this.calculateTableCheckSum)
            checksum = "__" + this.calculateTableCheckSum(this);
        let id = this.tableRef.tableId + checksum;
        return id.replaceAll(/\s/g, "");
    }
    async getTableData(rawData, parallelAsyncFunction) {
        let cachedData = this.loadFromCache();
        if (cachedData) {
            if (parallelAsyncFunction) {
                this.parallelData = await parallelAsyncFunction();
            }
            this.shadowTableTemplate = document.createElement("template");
            this.shadowTableTemplate.innerHTML = cachedData.text;
            this.isUsingChached = true;
            db3(`${this.tableRef.tableId}: using cached data.`);
            let rows = this.shadowTableTemplate.content.querySelectorAll("tbody > tr");
            //TODO: collection is set to undefined. This call to onPage(), should be EXACTLY the same as with a real fetch.
            if (this.pageHandler.onPage)
                this.pageHandler.onPage(this, this.shadowTableTemplate.innerHTML, undefined, 0, this.shadowTableTemplate, rows);
            if (this.pageHandler.onLoaded)
                this.pageHandler.onLoaded(this);
        }
        else {
            await __classPrivateFieldGet(this, _TableDef_instances, "m", _TableDef_fetchPages).call(this, parallelAsyncFunction, rawData);
            this.saveToCache();
            if (this.pageHandler.onLoaded)
                this.pageHandler.onLoaded(this);
        }
    }
}
_TableDef_instances = new WeakSet(), _TableDef_fetchPages = async function _TableDef_fetchPages(parallelAsyncFunction, collection) {
    let progressBar = insertProgressBar(this.tableRef.getOrgTable(), this.tableRef.navigationData.steps(), "loading pages... ");
    progressBar.start();
    if (this.pageHandler.onBeforeLoading)
        this.pageHandler.onBeforeLoading(this);
    if (parallelAsyncFunction) {
        let doubleResults = await Promise.all([
            __classPrivateFieldGet(this, _TableDef_instances, "m", _TableDef_doFetchAllPages).call(this, collection, progressBar),
            parallelAsyncFunction()
        ]);
        this.parallelData = doubleResults[1];
    }
    else {
        await __classPrivateFieldGet(this, _TableDef_instances, "m", _TableDef_doFetchAllPages).call(this, collection, progressBar);
    }
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