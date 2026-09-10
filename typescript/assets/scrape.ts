import {getTableFromHash, InfoBarTableFetchListener} from "../table/loadAnyTable";
import {createInfoBlock} from "../infoBlock";

export interface Asset {
    id: string;
    code: string;
}
export async function scrapeAssets(): Promise<Asset[]> {
    let snel_zoeken = document.querySelector("#snel_zoeken") as HTMLDivElement;
    //create div above snel_zoeken
    let infoBlockDiv = document.createElement("div");
    snel_zoeken.parentNode!.insertBefore(infoBlockDiv, snel_zoeken);
    let infoBlock = createInfoBlock(infoBlockDiv, "");
    let fetchListener = new InfoBarTableFetchListener(infoBlock);

    let table = await getTableFromHash("extra-assets-assets", true, fetchListener);
    return [...table.getRows()].map(row => {

        return {
            id: row.cells[0].innerText,
            code: row.cells[1].innerText.split("\n").shift()??"",
        };
    })
        .filter(asset => asset.code);
}