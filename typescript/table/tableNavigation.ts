export class TableNavigation {
    readonly step: number;
    private readonly maxCount: number;
    private div: HTMLDivElement;

    constructor(step: number, maxCount: number, div: HTMLDivElement/*, navigationData: any*/) {
        this.step = step;
        this.maxCount = maxCount;
        this.div = div;
    }

    steps() {
        return Math.ceil(this.maxCount / this.step)
    }

    isOnePage() {
        return this.step >= this.maxCount;
    }
}

/* possible ranges of numbers found:
[1, 100, 100, 500, 580] -> interval is [1] = 100
[0, 400, 501, 580, 580]  -> interval is [1] -> [2]-1 = 100
[0, 200, 301, 400, 400, 500, 580] -> interval is [1] -> [2]
*/
export function findFirstNavigation(element?: HTMLElement) {
    element = element?? document.body;
    //get all possible numbers from the navigation bar and sort them to get the result above.
    let buttonPagination = element.querySelector("button.datatable-paging-numbers") as HTMLButtonElement;
    if(!buttonPagination)
        return undefined;
    let buttonContainer = buttonPagination.closest("div") as HTMLDivElement;
    if(!buttonContainer) {
        return undefined;
    }
    let rx = /(\d*) tot (\d*) van (\d*)/;
    let matches = buttonPagination.innerText.match(rx);
    let step = parseInt(matches[2]) - parseInt(matches[1]) + 1;
    let buttons = buttonContainer.querySelectorAll("button.btn-secondary");
    let numbers = Array.from(buttons)
        .filter((btn) => btn.attributes["onclick"]?.value.includes("goto("))
        .map((btn) => btn.attributes["onclick"].value)
        .map((txt) => getGotoNumber(txt))
        .filter(num => num > 0);
    matches.slice(1).forEach((txt) => numbers.push(parseInt(txt)));
    numbers.sort((a, b) => a - b);
    return new TableNavigation(step, numbers.pop(), buttonContainer);
}

function getGotoNumber(functionCall: string) {
    return parseInt(functionCall.substring(functionCall.indexOf("goto(") + 5));
}