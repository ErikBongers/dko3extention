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
    constructor(tableRef, pageHandler, cacheKey, calculateChecksum = undefined, newTableId) {
        this.tableRef = tableRef;
        this.pageHandler = pageHandler;
        this.cacheKey = cacheKey;
        this.calculateChecksum = calculateChecksum;
        this.newTableId = newTableId;
    }
    /**
     * Save rows in sessionStarage with a checksum to determine if the cache is outDated.
     * @param checksum
     */
    cacheRows(checksum) {
        console.log(`Caching ${this.cacheKey}.`);
        window.sessionStorage.setItem(this.cacheKey, this.tableRef.getOrgTable().querySelector("tbody").innerHTML);
        window.sessionStorage.setItem(this.cacheKey + "_checksum", checksum);
    }
    isCacheValid(checksum) {
        return window.sessionStorage.getItem(this.cacheKey + "_checksum") === checksum;
    }
    getCached() {
        return window.sessionStorage.getItem(this.cacheKey);
    }
    displayCached() {
        //TODO: also show "this is cached data" and a link to refresh.
        this.tableRef.getOrgTable().querySelector("tbody").innerHTML = this.getCached();
    }
    async fetchFullTable(results, parallelAsyncFunction) {
        let progressBar = insertProgressBar(this.tableRef.getOrgTable(), this.tableRef.navigationData.steps(), "loading pages... ");
        progressBar.start();
        if (this.pageHandler.onBeforeLoading)
            this.pageHandler.onBeforeLoading(this);
        if (parallelAsyncFunction) {
            this.lastFetchResults = await Promise.all([
                this.fetchAllPages(results, progressBar),
                parallelAsyncFunction()
            ]);
        }
        else {
            this.lastFetchResults = await this.fetchAllPages(results, progressBar);
        }
        if (this.pageHandler.onLoaded)
            this.pageHandler.onLoaded(this);
        this.theData = this.pageHandler.getData(this);
        console.log(this.theData);
    }
    async fetchAllPages(results, progressBar) {
        let offset = 0;
        try {
            while (true) {
                console.log("fetching page " + offset);
                let response = await fetch(this.tableRef.buildFetchUrl(offset));
                let text = await response.text();
                let count = this.pageHandler.onPage(this, text, results, offset);
                if (!count)
                    return undefined;
                offset += this.tableRef.navigationData.step;
                if (!progressBar.next())
                    break;
            }
        }
        finally {
            progressBar.stop();
        }
        return results;
    }
}
