import * as def from "../lessen/def.js";
import {ProgressBar} from "../globals.js";
import {findFirstNavigation} from "../tableDef.js";

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
    let progressBar = insertProgressBar(tableDef.orgTable, tableDef.navigationData.steps(), "loading pages... ");

    if(parallelAsyncFunction) {
        return Promise.all([
            fetchAllPages(progressBar, tableDef.navigationData, results, tableDef),
            parallelAsyncFunction()
        ]);
    } else {
        return fetchAllPages(progressBar, tableDef.navigationData, results, tableDef);
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
            let count = tableDef.onPage(text, results, offset);
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