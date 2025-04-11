import * as def from "./def";
import {emmet} from "../libs/Emmeter/html";

export class InfoBar{
    divInfoContainer: HTMLDivElement;
    divInfoLine: HTMLDivElement;
    divTempLine: HTMLParagraphElement;
    divExtraLine: HTMLDivElement;
    private tempMessage: string;
    private divCacheInfo: HTMLDivElement;

    constructor(divInfoContainer: HTMLDivElement) {
        this.divInfoContainer = divInfoContainer;
        this.divInfoContainer.id = def.INFO_CONTAINER_ID;
        this.divInfoContainer.innerHTML = "";
        this.divExtraLine = emmet.appendChild(divInfoContainer, `div#${def.INFO_EXTRA_ID}.infoMessage`).last as HTMLDivElement;
        this.divInfoLine = emmet.appendChild(divInfoContainer, "div.infoLine").last as HTMLDivElement;
        this.divTempLine = emmet.appendChild(divInfoContainer, `div#${def.INFO_TEMP_ID}.infoMessage.tempLine`).last as HTMLDivElement;
        this.divCacheInfo = emmet.appendChild(this.divInfoContainer, `div#${def.INFO_CACHE_ID}.cacheInfo`).last as HTMLDivElement;
        this.tempMessage = "";
    }

    setCacheInfo(cacheInfo: string, reset_onclick: (ev: MouseEvent) => any) {
        this.updateCacheInfo(cacheInfo, reset_onclick);
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

    clearCacheInfo() {
        this.divCacheInfo.innerHTML = "";
    }

    updateCacheInfo(info: string, reset_onclick: (ev: MouseEvent) => any) {
        this.divCacheInfo.innerHTML = info;
        let button = emmet.appendChild(this.divCacheInfo, "button.likeLink").first as HTMLButtonElement;
        button.innerHTML = "refresh";
        button.onclick = reset_onclick;
    }

    setExtraInfo(message: string, click_element_id?: string, callback?: () => void) {
        this.divExtraLine.innerHTML = message;
        if(click_element_id) {
            document.getElementById(click_element_id).onclick = callback;
        }
    }

}