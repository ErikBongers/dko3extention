import * as def from "../lessen/def.js";
import { ProgressBar } from "../globals.js";
function insertProgressBar(elementAfter, steps, text = "") {
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
export async function fetchFullTable(tableDef, results, parallelAsyncFunction) {
    let progressBar = insertProgressBar(tableDef.tableRef.getOrgTable(), tableDef.navigationData.steps(), "loading pages... ");
    if (parallelAsyncFunction) {
        return Promise.all([
            fetchAllPages(tableDef, results, progressBar),
            parallelAsyncFunction()
        ]);
    }
    else {
        return fetchAllPages(tableDef, results, progressBar);
    }
}
async function fetchAllPages(tableDef, results, progressBar) {
    let offset = 0;
    progressBar.start();
    if (tableDef.pageHandler.onBeforeLoading)
        tableDef.pageHandler.onBeforeLoading(tableDef);
    try {
        while (true) {
            console.log("fetching page " + offset);
            let response = await fetch(tableDef.tableRef.buildFetchUrl(offset));
            let text = await response.text();
            let count = tableDef.pageHandler.onPage(tableDef, text, results, offset);
            if (!count)
                return undefined;
            offset += tableDef.navigationData.step;
            if (!progressBar.next())
                break;
        }
    }
    finally {
        progressBar.stop();
        if (tableDef.pageHandler.onLoaded)
            tableDef.pageHandler.onLoaded(tableDef);
    }
    return results;
}
