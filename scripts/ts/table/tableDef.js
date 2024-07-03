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
}
