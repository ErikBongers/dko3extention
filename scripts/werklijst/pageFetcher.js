import * as def from "../lessen/def.js";
import {getNavigation, ProgressBar} from "../globals.js";

function insertProgressBar(elementAfter, navigationData) {
    let divProgressLine = document.createElement("div");
    elementAfter.insertAdjacentElement("beforebegin", divProgressLine);
    divProgressLine.classList.add("progressLine");
    divProgressLine.id = def.PROGRESS_BAR_ID;
    let divProgressText = document.createElement("div");
    divProgressLine.appendChild(divProgressText);
    divProgressText.classList.add("progressText");
    divProgressText.innerText = "loading pages... ";
    let divProgressBar = document.createElement("div");
    divProgressLine.appendChild(divProgressBar);
    divProgressBar.classList.add("progressBar");
    return new ProgressBar(divProgressLine, divProgressBar, Math.ceil(navigationData.maxCount / navigationData.step));
}

export async function fetchFullTable(tableDef, results, parallelAsyncFunction) {
    let navigationData = getNavigation();
    let progressBar = insertProgressBar(tableDef.orgTable, navigationData);

    if(parallelAsyncFunction) {
        return Promise.all([
            fetchAllPages(progressBar, navigationData, results, tableDef),
            parallelAsyncFunction()
        ]);
    } else {
        return fetchAllPages(progressBar, navigationData, results, tableDef);
    }
}

async function fetchAllPages(progressBar, navigationData, results, tableDef) {
    let offset = 0;
    progressBar.start();
    try {
        while (true) {
            console.log("fetching page " + offset);
            let response = await fetch(tableDef.buildFetchUrl(offset));
            let text = await response.text();
            let count = tableDef.readPage(text, results, offset);
            if (!count)
                return undefined;
            offset += navigationData.step;
            if (!progressBar.next())
                break;
        }
    } finally {
        progressBar.stop();
    }
    return results;
}