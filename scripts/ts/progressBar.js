import * as def from "./lessen/def.js";
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
export function insertProgressBar(container, steps, text = "") {
    let divProgressLine = document.createElement("div");
    container.append(divProgressLine);
    divProgressLine.classList.add("infoLine");
    divProgressLine.id = def.PROGRESS_BAR_ID;
    let divProgressText = document.createElement("div");
    divProgressLine.appendChild(divProgressText);
    divProgressText.classList.add("progressText");
    divProgressText.innerText = text;
    let divProgressBar = document.createElement("div");
    divProgressLine.appendChild(divProgressBar);
    divProgressBar.classList.add("progressBar");
    return new ProgressBar(divProgressLine, divProgressBar, steps);
}
//# sourceMappingURL=progressBar.js.map