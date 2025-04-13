export class TableNavigation {
    readonly step: number;
    private readonly maxCount: number;

    constructor(step: number, maxCount: number) {
        this.step = step;
        this.maxCount = maxCount;
    }

    steps() {
        return Math.ceil(this.maxCount / this.step)
    }

    isOnePage() {
        return this.step >= this.maxCount;
    }
}

/* possible ranges of numbers found:
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
    let buttons = buttonContainer.querySelectorAll("button.btn-secondary");
    let offsets = Array.from(buttons)
        .filter((btn) => btn.attributes["onclick"]?.value.includes("goto("))
        .filter((btn: HTMLElement) => !btn.querySelector("i.fa-fast-backward")) //ignore the value of the fast backward button, which is always 0
        .map((btn: HTMLElement) => getGotoNumber(btn.attributes["onclick"].value));
    let numbers = matches.slice(1).map((txt) => parseInt(txt));
    numbers[0] = numbers[0]-1;//convert 1-based user index to 0-based offset.
    numbers = numbers.concat(offsets);
    numbers.sort((a, b) => a - b);
    numbers = [...new Set(numbers)];
    return new TableNavigation(numbers[1] - numbers[0], numbers.pop());
}

function getGotoNumber(functionCall: string) {
    return parseInt(functionCall.substring(functionCall.indexOf("goto(") + 5));
}