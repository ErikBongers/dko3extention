export class TableDef {
    constructor(orgTable, buildFetchUrl, pageHandler, navigationData) {
        this.orgTable = orgTable;
        this.buildFetchUrl = buildFetchUrl;
        this.pageHandler = pageHandler;
        this.navigationData = navigationData;
    }

    onPage(text, collection, offset) {
        return this.pageHandler.onPage(text, collection, offset);
    }
}

export class TableNavigation {
    constructor(step, maxCount, div, navigationData) {
        this.step = step;
        this.maxCount = maxCount;
        this.div = div;
        this.navigationData = navigationData;
    }

    steps() {
        return Math.ceil(this.maxCount / this.step)
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
    console.log(matches);
    let buttons = element.querySelectorAll("button.btn-secondary");
    let numbers = Array.from(buttons)
        .filter((btn) => btn.attributes["onclick"]?.value.includes("goto("))
        .map((btn) => btn.attributes["onclick"].value)
        .map((txt) => getGotoNumber(txt));
    numbers.push(...matches.slice(1).map((txt) => parseInt(txt)));
    numbers.sort();
    console.log(numbers);
    if (numbers[0] === 1) {
        return new TableNavigation(numbers[1], numbers.pop());
    } else {
        return new TableNavigation(numbers[2] - numbers[1] - 1, numbers.pop());
    }
}

function getGotoNumber(functionCall) {
    return parseInt(functionCall.substring(functionCall.indexOf("goto(") + 5));
}