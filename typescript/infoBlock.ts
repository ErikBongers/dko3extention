import {InfoBar} from "./infoBar";
import {ProgressBar} from "./progressBar";
import * as def from "./def";
import {TableRef} from "./table/tableRef";
import {InfoBarTableFetchListener} from "./table/loadAnyTable";

export interface InfoBlock {
    infoBar: InfoBar,
    progressBar: ProgressBar
}

export function createInfoBlockForTable(tableRef: TableRef): InfoBlock {
    let divInfoContainer = tableRef.createElementAboveTable("div");
    return getInfoBlock(divInfoContainer);
}

export function getInfoBlock(parent: HTMLElement): InfoBlock {
    let infoBar = new InfoBar(parent);
    let progressBar = new ProgressBar(parent);
    return {infoBar, progressBar};
}

export function getInfoBlockForPage() {
    let infoBlockDiv = document.getElementById(def.INFO_CONTAINER_FOR_PAGE_ID) as HTMLDivElement | null;
    if(!infoBlockDiv) {
        let snel_zoeken = document.querySelector("#snel_zoeken") as HTMLDivElement;
        infoBlockDiv = document.createElement("div");
        infoBlockDiv.id = def.INFO_CONTAINER_FOR_PAGE_ID;
        snel_zoeken.parentNode!.insertBefore(infoBlockDiv, snel_zoeken);
    }
    let infoBlock = getInfoBlock(infoBlockDiv);
    return new InfoBarTableFetchListener(infoBlock);
}