import * as def from "../lessen/def.js";
import {ProgressBar} from "../globals.js";
import {TableDef} from "../table/tableDef.js";

function insertProgressBar(elementAfter: HTMLElement, steps: number, text: string = "") {
    let divProgressLine = document.createElement("div");
    elementAfter.insertAdjacentElement("beforebegin", divProgressLine);
    divProgressLine.classList.add("progressLine");
    divProgressLine.id = def.PROGRESS_BAR_ID;
    let divProgressText = document.createElement("div");
    divProgressLine.appendChild(divProgressText);
    divProgressText.classList.add("progressText");
    divProgressText.innerText = text;
    let divProgressBar = document.createElement("div");
    divProgressLine.appendChild(divProgressBar);
    divProgressBar.classList.add("progressBar");
    return new ProgressBar(divProgressLine, divProgressBar, steps);
}

export async function fetchFullTable(tableDef: TableDef, results: any, parallelAsyncFunction: (() => Promise<any>)) {
    let progressBar = insertProgressBar(tableDef.tableRef.getOrgTable(), tableDef.tableRef.navigationData.steps(), "loading pages... ");

    if(parallelAsyncFunction) {
        return Promise.all([
            fetchAllPages(tableDef, results, progressBar),
            parallelAsyncFunction()
        ]);
    } else {
        return fetchAllPages(tableDef, results, progressBar);
    }
}

async function fetchAllPages(tableDef: TableDef, results: any, progressBar: ProgressBar) {
    let offset = 0;
    progressBar.start();
    if(tableDef.pageHandler.onBeforeLoading)
        tableDef.pageHandler.onBeforeLoading(tableDef);
    try {
        while (true) {
            console.log("fetching page " + offset);
            let response = await fetch(tableDef.tableRef.buildFetchUrl(offset));
            let text = await response.text();
            let count = tableDef.pageHandler.onPage(tableDef, text, results, offset);
            if (!count)
                return undefined;
            offset += tableDef.tableRef.navigationData.step;
            if (!progressBar.next())
                break;
        }
    } finally {
        progressBar.stop();
        if(tableDef.pageHandler.onLoaded)
            tableDef.pageHandler.onLoaded(tableDef);
    }
    return results;
}