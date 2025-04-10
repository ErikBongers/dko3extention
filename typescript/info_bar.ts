import * as def from "./def";

export class InfoBar{
    divInfoContainer: HTMLDivElement;
    private isUsingCached: boolean;
    private tempMessage: string;

    constructor(divInfoContainer: HTMLDivElement) {
        this.divInfoContainer = divInfoContainer;
        this.divInfoContainer.classList.add("infoLine");
    }

    clearInfoBar() {
        this.divInfoContainer.innerHTML = "";
    }

    updateInfoBar(cacheInfo: string, reset_onclick: (ev: MouseEvent) => any) {
        this.updateCacheInfo(cacheInfo, reset_onclick);
        this.#updateTempMessage();
        //...update other info...
    }

    setTempMessage(msg : string ) {
        this.tempMessage = msg;
        this.#updateTempMessage();
        setTimeout(this.clearTempMessage.bind(this), 4000);
    }

    clearTempMessage() {
        this.tempMessage = "";
        this.#updateTempMessage();
    }

    #updateTempMessage() {
        let p = document.getElementById(def.TEMP_MSG_ID);
        if (this.tempMessage === "") {
            if (p) p.remove();
            return;
        }
        if (!p) {
            p = document.createElement("p");
            this.divInfoContainer.appendChild(p);
            p.classList.add("tempMessage");
            p.id = def.TEMP_MSG_ID;
        }
        p.innerHTML = this.tempMessage;
    }

    clearCacheInfo() {
        document.getElementById(def.CACHE_INFO_ID)?.remove();
    }

    updateCacheInfo(info: string, reset_onclick: (ev: MouseEvent) => any) {
        let p = document.getElementById(def.CACHE_INFO_ID);
        if(!this.isUsingCached) {
            if(p) p.remove();
            return;
        }

        if(!p) {
            p = document.createElement("p");
            this.divInfoContainer.appendChild(p);
            p.classList.add("cacheInfo");
            p.id = def.CACHE_INFO_ID;
        }
        p.innerHTML = info;
        let a = document.createElement("a");
        p.appendChild(a);
        a.innerHTML = "refresh";
        a.href="#";
        a.onclick = reset_onclick;
    }
}