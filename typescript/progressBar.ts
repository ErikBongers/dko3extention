import * as def from "./def";
import {emmet} from "../libs/Emmeter/html";

export class ProgressBar {
    private barElement: HTMLElement;
    private containerElement: HTMLElement;
    private maxCount: number;
    private count: number;

    constructor(containerElement: HTMLElement, barElement: HTMLElement) {
        this.barElement = barElement;
        this.containerElement = containerElement;
        this.hide();
    }

    reset(maxCount: number) {
        this.maxCount = maxCount;
        this.count = 0;
        this.barElement.innerHTML = "";
        for (let i = 0; i < maxCount; i++) {
            let block = document.createElement("div");
            this.barElement.appendChild(block);
            block.classList.add("progressBlock");
        }
    }
    start(maxCount: number) {
        this.reset(maxCount);
        this.containerElement.style.display = "block";
        this.next();
    }

    hide() {
        this.containerElement.style.display = "none";
    }
    stop() {
        this.hide();
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

export function insertProgressBar(container: HTMLElement, steps: number, text: string = "") {
    container.innerHTML = "";
    let {first: divProgressLine, last: divProgressBar} = emmet.appendChild(container, `div.infoLine${def.PROGRESS_BAR_ID}>div.progressText{${text}}+div.progressBar`);
    return new ProgressBar(divProgressLine as HTMLDivElement, divProgressBar as HTMLDivElement);
}