import {getTableFromHash, InfoBarTableFetchListener} from "../table/loadAnyTable";
import {getInfoBlock} from "../infoBlock";

export interface Asset {
    id: string;
    code: string;
}
export async function scrapeAssets(): Promise<Asset[]> {
    let snel_zoeken = document.querySelector("#snel_zoeken") as HTMLDivElement;
    //create div above snel_zoeken
    let infoBlockDiv = document.createElement("div");
    snel_zoeken.parentNode!.insertBefore(infoBlockDiv, snel_zoeken);
    let infoBlock = getInfoBlock(infoBlockDiv);
    let fetchListener = new InfoBarTableFetchListener(infoBlock);

    let table = await getTableFromHash("extra-aenp-assets-assets", true, fetchListener);
    console.log(table);
    return [...table.getRows()].map(row => {
        return {
            id: row.getAttribute("onclick")?.match(/(\d+)/)?.[1]??"",
            code: row.cells[0].innerText,
        };
    })
        .filter(asset => asset.code && asset.id);
}