import {InfoBar} from "./infoBar";
import {insertProgressBar, ProgressBar} from "./progressBar";
import {TableRef} from "./table/tableFetcher";
import * as def from "./def";

export interface InfoBlock {
    infoBar: InfoBar,
    progressBar: ProgressBar
}

export function createInfoBlockForTable(tableRef: TableRef): InfoBlock {
    document.getElementById(def.INFO_CONTAINER_ID)?.remove();
    let divInfoContainer = tableRef.createElementAboveTable("div");
    return createInfoBlock(divInfoContainer, "loading pages... ");
}

export function createInfoBlock(infoContainer: HTMLElement, initialMessage: string): InfoBlock {
    let infoBar = new InfoBar(infoContainer.appendChild(document.createElement("div")));
    let progressBar = insertProgressBar(infoBar.divInfoLine, initialMessage);
    return {infoBar, progressBar};
}