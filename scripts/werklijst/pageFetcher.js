import * as def from "../lessen/def.js";
import {getNavigation, ProgressBar} from "../globals.js";

function insertProgressBar(orgTable, navigationData) {
    let divProgressLine = document.createElement("div");
    orgTable.insertAdjacentElement("beforebegin", divProgressLine);
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

export async function fetchFullWerklijst(results, tableDef, parallelAsyncFunction) {
    let orgTable = document.getElementById("table_leerlingen_werklijst_table");
    let navigationData = getNavigation(document.querySelector("#tablenav_leerlingen_werklijst_top"));
    let progressBar = insertProgressBar(orgTable, navigationData);

    return Promise.all([
        fetchAllWerklijstPages(progressBar, navigationData, results, tableDef),
        parallelAsyncFunction()
    ]);
}

async function fetchAllWerklijstPages(progressBar, navigationData, results, tableDef) {
    let offset = 0;
    progressBar.start();
    try {
        while (true) {
            console.log("fetching page " + offset);
            let response = await fetch("/views/ui/datatable.php?id=leerlingen_werklijst&start=" + offset + "&aantal=0");
            let text = await response.text();
            let count = tableDef.readPage(text, results);
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