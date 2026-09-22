import * as def from "./def";
import {emmet} from "../libs/Emmeter";

export class InfoBar{
    parent: HTMLElement;
    container: HTMLDivElement;
    divInfoLine: HTMLDivElement;
    divTempLine: HTMLParagraphElement;
    divExtraLine: HTMLDivElement;
    divErrorLine: HTMLDivElement;
    private tempMessage: string;
    private divCacheInfo: HTMLDivElement;
    private static readonly ID =  "dp3p_infoContainer";
    private static readonly EXTRA_ID =  "dp3_extraInfo";
    private static readonly ERROR_ID =  "dp3_errorInfo";
    private static readonly TEMP_ID =  "dp3_tempInfo";
    private static readonly CACHE_ID =  "dp3p_cacheInfo";

    constructor(parent: HTMLElement) {
        this.parent = parent;
        this.tempMessage = "";
        let container = parent.querySelector(`div#${InfoBar.ID}`) as HTMLDivElement | null;
        if(!container) {
            container = emmet.appendChild(parent, `div#${InfoBar.ID}`).first as HTMLDivElement;
            this.divExtraLine = emmet.appendChild(container, `div#${InfoBar.EXTRA_ID}.infoMessage`).last as HTMLDivElement;
            this.divErrorLine = emmet.appendChild(container, `div#${InfoBar.ERROR_ID}.infoError`).last as HTMLDivElement;
            this.divInfoLine = emmet.appendChild(container, "div.infoLine").last as HTMLDivElement;
            this.divTempLine = emmet.appendChild(container, `div#${InfoBar.TEMP_ID}.infoMessage.tempLine`).last as HTMLDivElement;
            this.divCacheInfo = emmet.appendChild(container, `div#${InfoBar.CACHE_ID}.cacheInfo`).last as HTMLDivElement;
        } else {
            this.divExtraLine = container.querySelector(`#${InfoBar.EXTRA_ID}`) as HTMLDivElement;
            this.divErrorLine = container.querySelector(`#${InfoBar.ERROR_ID}`) as HTMLDivElement;
            this.divInfoLine = container.querySelector("div.infoLine") as HTMLDivElement;
            this.divTempLine = container.querySelector(`#${InfoBar.TEMP_ID}`) as HTMLDivElement;
            this.divCacheInfo = container.querySelector(`#${InfoBar.CACHE_ID}`) as HTMLDivElement;
        }
        this.container = container;
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