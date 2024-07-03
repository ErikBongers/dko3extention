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
export class TableNavigation {
    constructor(step, maxCount, div /*, navigationData: any*/) {
        this.step = step;
        this.maxCount = maxCount;
        this.div = div;
    }
    steps() {
        return Math.ceil(this.maxCount / this.step);
    }
}
/* possible ranges of numbers found:
[1, 100, 100, 500, 580] -> interval is [1] = 100
[0, 400, 501, 580, 580]  -> interval is [1] -> [2]-1 = 100
[0, 200, 301, 400, 400, 500, 580] -> interval is [1] -> [2]
*/
export function findFirstNavigation() {
    //get all possible numbers from the navigation bar and sort them to get the result above.
    let element = document.querySelector("div.datatable-navigation-toolbar");
    let button = element.querySelector("button.datatable-paging-numbers");
    let rx = /(\d*) tot (\d*) van (\d*)/;
    let matches = button.innerText.match(rx);
    let buttons = element.querySelectorAll("button.btn-secondary");
    let numbers = Array.from(buttons)
        .filter((btn) => btn.attributes["onclick"]?.value.includes("goto("))
        .map((btn) => btn.attributes["onclick"].value)
        .map((txt) => getGotoNumber(txt));
    matches.slice(1).forEach((txt) => numbers.push(parseInt(txt)));
    numbers.sort((a, b) => a - b);
    if (numbers[0] === 1) {
        return new TableNavigation(numbers[1], numbers.pop(), element);
    }
    else {
        return new TableNavigation(numbers[2] - numbers[1] - 1, numbers.pop(), element);
    }
}
function getGotoNumber(functionCall) {
    return parseInt(functionCall.substring(functionCall.indexOf("goto(") + 5));
}
