import {emmet} from "../libs/Emmeter";

export class ProgressBar {
    private barElement: HTMLDivElement;
    private parent: HTMLElement;
    private container: HTMLDivElement;
    private maxCount: number;
    private count: number;
    static readonly ID = "progressBarContainer";

    constructor(parent: HTMLElement) {
        this.parent = parent;
        let container = this.parent.querySelector("#" + ProgressBar.ID) as HTMLDivElement | null;
        if(!container) {
            container = emmet.indent.appendChild(this.parent, `
                div#${ProgressBar.ID}
                    div.progressBar
            `).first as HTMLDivElement;
        }
        this.container = container;
        this.barElement = this.container.querySelector(".progressBar") as HTMLDivElement;
        this.hide();
        this.maxCount = 0;
        this.count = 0;
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
        this.container.style.display = "";
        this.next();
    }

    hide() {
        this.container.style.display = "none";
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
