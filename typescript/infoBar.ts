import * as def from "./def";
import {emmet} from "../libs/Emmeter/html";

export class InfoBar{
    divInfoContainer: HTMLDivElement;
    divInfoLine: HTMLDivElement;
    divTempLine: HTMLParagraphElement;
    divExtraLine: HTMLDivElement;
    divErrorLine: HTMLDivElement;
    private tempMessage: string;
    private divCacheInfo: HTMLDivElement;

    constructor(divInfoContainer: HTMLDivElement, divExtraLine: HTMLDivElement, divErrorLine: HTMLDivElement, divInfoLine: HTMLDivElement, divTempLine: HTMLParagraphElement, divCacheInfo: HTMLDivElement) {
        this.divInfoContainer = divInfoContainer;
        this.divExtraLine = divExtraLine;
        this.divErrorLine = divErrorLine;
        this.divInfoLine = divInfoLine;
        this.divTempLine = divTempLine;
        this.divCacheInfo = divCacheInfo;
        this.tempMessage = "";
    }

    static create(divInfoContainer: HTMLDivElement) {
        divInfoContainer.id = def.INFO_CONTAINER_ID;
        divInfoContainer.innerHTML = "";
        let divExtraLine = emmet.appendChild(divInfoContainer, `div#${def.INFO_EXTRA_ID}.infoMessage`).last as HTMLDivElement;
        let divErrorLine = emmet.appendChild(divInfoContainer, `div#${def.INFO_EXTRA_ID}.infoError`).last as HTMLDivElement;
        let divInfoLine = emmet.appendChild(divInfoContainer, "div.infoLine").last as HTMLDivElement;
        let divTempLine = emmet.appendChild(divInfoContainer, `div#${def.INFO_TEMP_ID}.infoMessage.tempLine`).last as HTMLDivElement;
        let divCacheInfo = emmet.appendChild(divInfoContainer, `div#${def.INFO_CACHE_ID}.cacheInfo`).last as HTMLDivElement;
        return new InfoBar(divInfoContainer, divExtraLine, divErrorLine, divInfoLine, divTempLine, divCacheInfo);
    }

    static find(): InfoBar {
        let container = document.getElementById(def.INFO_CONTAINER_ID) as HTMLDivElement;
        let divExtraLine = container.querySelector(`#${def.INFO_EXTRA_ID}`) as HTMLDivElement;
        let divErrorLine = container.querySelector(`#${def.INFO_EXTRA_ID}`) as HTMLDivElement;
        let divInfoLine = container.querySelector("div.infoLine") as HTMLDivElement;
        let divTempLine = container.querySelector(`#${def.INFO_TEMP_ID}`) as HTMLDivElement;
        let divCacheInfo = container.querySelector(`#${def.INFO_CACHE_ID}`) as HTMLDivElement;
        return new InfoBar(container, divExtraLine, divErrorLine, divInfoLine, divTempLine, divCacheInfo);
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
        this.divTempLine.innerHTML = this.tempMessage;
    }

    setInfoLine(message: string) {
        this.divInfoLine.innerHTML = message;
    }

    setErrorLine(message: string) {
        this.divErrorLine.innerHTML = message;
    }

    clearCacheInfo() {
        this.divCacheInfo.innerHTML = "";
    }

    setCacheInfo(info: string, reset_onclick: (ev: MouseEvent) => any) {
        this.divCacheInfo.innerHTML = info;
        let button = emmet.appendChild(this.divCacheInfo, "button.likeLink").first as HTMLButtonElement;
        button.innerHTML = "refresh";
        button.onclick = reset_onclick;
    }

    setExtraInfo(message: string, click_element_id?: string, callback?: () => void) {
        this.divExtraLine.innerHTML = message;
        if(click_element_id) {
            if(callback)
                document.getElementById(click_element_id)!.onclick = callback;
        }
    }

}