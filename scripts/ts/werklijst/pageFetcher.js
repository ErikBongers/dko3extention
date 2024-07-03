import { insertProgressBar } from "../progressBar.js";
export async function fetchFullTable(tableDef, results, parallelAsyncFunction) {
    let progressBar = insertProgressBar(tableDef.tableRef.getOrgTable(), tableDef.tableRef.navigationData.steps(), "loading pages... ");
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
            offset += tableDef.tableRef.navigationData.step;
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
