export const options = {};
export let observers = [];

export function db3(message) {
    if (options?.showDebug) {
        console.log(message);
    }
}

export function createValidId(id) {
    return id
        .replaceAll(" ", "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\W/g,'');
}


export function registerObserver(observer) {
    observers.push(observer);
    if(observers.length > 10) //just in case...
        console.error("Too many observers!");
}

export class PageObserver {
    constructor(onPageChangedCallback) {
        this.onPageChanged = onPageChangedCallback;
    }
}

export class HashObserver {
    constructor(urlHash, onMutationCallback) {
        this.urlHash = urlHash;
        this.onMutation = onMutationCallback;
        this.observer = new MutationObserver((mutationList, observer) => this.observerCallback(mutationList, observer));
    }
    observerCallback (mutationList /*, observer*/) {
        for (const mutation of mutationList) {
            if (mutation.type !== "childList") {
                continue;
            }
            if (this.onMutation(mutation)) {
                break;
            }
        }
    }

    onPageChanged() {
        if (window.location.hash.startsWith(this.urlHash)) {
            db3("In" + this.urlHash);
            this.observeElement(document.querySelector("main"));
        } else {
            db3("Niet in In" + this.urlHash);
            this.disconnect();
        }
    }

    observeElement(element) {
        if (!element) {
            console.error("Can't attach observer to element.");
            return;
        }

        const config = {
            attributes: false,
            childList: true,
            subtree: true
        };
        this.observer.observe(element, config);
    }

    disconnect() {
        this.observer.disconnect();
    }
}

// noinspection JSUnusedGlobalSymbols
export function searchText(text) {
    let input = document.querySelector("#snel_zoeken_veld_zoektermen");
    input.value = text;
    let evUp = new KeyboardEvent("keyup", {key: "Enter", keyCode: 13, bubbles: true});
    input.dispatchEvent(evUp);
}

export function setButtonHighlighted(buttonId, show) {
    if (show) {
        document.getElementById(buttonId).classList.add("toggled");
    } else {
        document.getElementById(buttonId).classList.remove("toggled");
    }
}

export function addButton(targetElement, buttonId, title, clickFunction, imageId, classList, text) {
    let button = document.getElementById(buttonId);
    if (button === null) {
        const button = document.createElement("button");
        button.classList.add("btn"/*, "btn-sm", "btn-outline-secondary", "w-100"*/, ...classList);
        button.id = buttonId;
        button.style.marginTop = "0";
        button.onclick = clickFunction;
        button.title = title;
        if(text) {
            let span = document.createElement("span");
            button.appendChild(span);
            span.innerText = text;
        }
        const buttonContent = document.createElement("i");
        button.appendChild(buttonContent);
        buttonContent.classList.add("fas", imageId);
        targetElement.insertAdjacentElement("beforebegin", button);
    }
}

export class ProgressBar {
    constructor(containerElement, barElement, maxCount) {
        this.barElement = barElement;
        this.containerElement = containerElement;
        this.maxCount = maxCount;
        this.count = 0;
        for (let i = 0; i < maxCount; i++) {
            let block = document.createElement("div");
            barElement.appendChild(block);
            block.classList.add("progressBlock");
        }
    }

    start() {
        this.containerElement.style.visibility = "visible";
        this.next();
    }

    stop() {
        this.containerElement.style.visibility = "hidden";
    }

    next() {
        if (this.count >= this.maxCount)
            return false;
        this.barElement.children[this.count].classList.remove("iddle", "loaded");
        this.barElement.children[this.count].classList.add("loading");
        for (let i = 0; i < this.count; i++) {
            this.barElement.children[i].classList.remove("iddle", "loading");
            this.barElement.children[i].classList.add("loaded");
        }
        for (let i = this.count + 1; i < this.maxCount; i++) {
            this.barElement.children[i].classList.remove("loaded", "loading");
            this.barElement.children[i].classList.add("iddle");
        }
        this.count++;
        return true;
    }
}

function getGotoNumber(functionCall) {
    return parseInt(functionCall.substring(functionCall.indexOf("goto(")+5));
}

/* possible ranges of numbers found:
[1, 100, 100, 500, 580] -> interval is [1] = 100
[0, 400, 501, 580, 580]  -> interval is [1] -> [2]-1 = 100
[0, 200, 301, 400, 400, 500, 580] -> interval is [1] -> [2]
*/
export function getNavigation(element) {
    //get all possible numbers from the navigation bar and sort them to get the result above.
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
        return {step: numbers[1], maxCount: numbers.pop()};
    } else {
        return {step: numbers[2] - numbers[1] - 1, maxCount: numbers.pop()};
    }
}