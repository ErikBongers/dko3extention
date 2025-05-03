import {findFirstNavigation} from "./tableNavigation";
import {findTableRefInCode, TableFetcher, TableFetchListener, TableRef} from "./tableFetcher";
import {createDownloadTableWithExtraAction, getChecksumBuilder} from "./observer";
import {millisToString, Result, setViewFromCurrentUrl} from "../globals";
import {InfoBar} from "../infoBar";
import {insertProgressBar, ProgressBar} from "../progressBar";
import * as def from "../def";
import {executeTableCommands, TableHandlerForHeaders} from "./tableHeaders";
import {TokenScanner} from "../tokenScanner";

async function fetchText(url: string) {
    let res = await fetch(url);
    return res.text();
}

async function getDocReadyLoadUrlFrom(url: string) {
    let text = await fetchText(url);
    return getDocReadyLoadUrl(text);
}

async function getTableRefFromHash(hash: string) {
    await fetchText("https://administratie.dko3.cloud/#" + hash);

    // call to changeView() - assuming this is always the same, so no parsing here.
    let index_viewUrl = await getDocReadyLoadUrlFrom("view.php?args=" + hash);

    //get the htmlTableId (from index.view.php
    let index_view = await fetchText(index_viewUrl);
    let htmlTableId = getDocReadyLoadScript(index_view)
        .find("$", "(", "'#")
        //todo: find("$", "(") then .getString() then check and strip the "#".
        .clipTo("'")
        .result();
    if (!htmlTableId) {
        htmlTableId = getDocReadyLoadScript(index_view)
            .find("$", "(", "\"#")
            .clipTo("\"")
            .result();
    }
    let datatableUrl = getDocReadyLoadUrl(index_view); //NOT SURE THIS IS datatable.php !!!
    if (!datatableUrl.includes("ui/datatable.php")) {
        //fetch again. Don't loop to avoid dead loop.
        datatableUrl = await getDocReadyLoadUrlFrom(datatableUrl); //NOT SURE THIS IS datatable.php !!!
    }
    //get datatable id an url from datatable.php
    let datatable = await fetchText(datatableUrl);
    let scanner = new TokenScanner(datatable);
    let datatable_id = "";
    let tableNavUrl = "";
    scanner
        .find("var", "datatable_id", "=")
        .getString(res => {
            datatable_id = res;
        })
        .clipTo("</script>")
        .find(".", "load", "(")
        .getString(res => tableNavUrl = res)
        .result();//todo  result() call needed?
    tableNavUrl += datatable_id + '&pos=top';
    let tableNavText = await fetchText(tableNavUrl);

    let div = document.createElement("div");
    div.innerHTML = tableNavText;
    let tableNav = findFirstNavigation(div);
    console.log(tableNav);
    let buildFetchUrl = (offset: number) => `/views/ui/datatable.php?id=${datatable_id}&start=${offset}&aantal=0`;

    return new TableRef(htmlTableId, tableNav, buildFetchUrl);
}

export async function getTableFromHash(hash: string, clearCache: boolean, infoBarListener: InfoBarTableFetchListener) {
    let tableRef = await getTableRefFromHash(hash);
    console.log(tableRef);

    let tableFetcher = new TableFetcher(
        tableRef,
        getChecksumBuilder(tableRef.htmlTableId)
    );

    tableFetcher.addListener(infoBarListener);

    if(clearCache)
        tableFetcher.clearCache();

    let fetchedTable = await tableFetcher.fetch();
    await setViewFromCurrentUrl();
    return fetchedTable;
}

function findDocReady(scanner: TokenScanner) {
    return scanner.find("$", "(", "document", ")", ".", "ready", "(");
}

function getDocReadyLoadUrl(text: string) {
    let scanner = new TokenScanner(text);
    while(true) {
        let docReady = findDocReady(scanner);
        if(!docReady.valid)
            return undefined;
        let url = docReady
            .clone()
            .clipTo("</script>")
            .find(".", "load", "(")
            .clipString()
            .result();
        if(url)
            return url;
        scanner = docReady;
    }
}

function getDocReadyLoadScript(text: string) {
    let scanner = new TokenScanner(text);
    while(true) {
        let docReady = findDocReady(scanner);
        if(!docReady.valid)
            return undefined;
        let script = docReady
            .clone()
            .clipTo("</script>");
        let load = script
            .clone()
            .find(".", "load", "(");
        if(load.valid)
            return script;
        scanner = docReady;
    }
}


export async function downloadTableRows() {
    let result = createDefaultTableFetcher();
    if("error" in result) {
        console.error(result.error);
        return;
    }
    let {tableFetcher} = result.result;
    tableFetcher.tableHandler = new TableHandlerForHeaders();

    let fetchedTable = await tableFetcher.fetch();
    let fetchedRows = fetchedTable.getRows();
    let tableContainer = fetchedTable.tableFetcher.tableRef.getOrgTableContainer();
    tableContainer
        .querySelector("tbody")
        .replaceChildren(...fetchedRows);
    tableContainer.querySelector("table").classList.add("fullyFetched");
    executeTableCommands(fetchedTable.tableFetcher.tableRef);
    return fetchedTable;
}

export async function checkAndDownloadTableRows() {
    let tableRef = findTableRefInCode();
    if(tableRef.getOrgTableContainer().querySelector("table").classList.contains("fullyFetched"))
        return tableRef;
    await downloadTableRows();
    return tableRef;
}

export class InfoBarTableFetchListener implements TableFetchListener {
    infoBar: InfoBar;
    progressBar: ProgressBar;

    constructor(infoBar: InfoBar, progressBar: ProgressBar) {
        this.infoBar = infoBar;
        this.progressBar = progressBar;
    }

    onStartFetching(tableFetcher: TableFetcher): void {
        this.progressBar.start(tableFetcher.tableRef.navigationData.steps());
    }
    onLoaded (tableFetcher: TableFetcher): void {
        if(tableFetcher.isUsingCached) {
            let defaultAction = createDownloadTableWithExtraAction();
            let resetAndLoadAction = (ev: Event)=> {
                tableFetcher.reset();
                defaultAction(ev);
            };
            this.infoBar.setCacheInfo(`Gegevens uit cache, ${millisToString((new Date()).getTime()-tableFetcher.shadowTableDate.getTime())} oud. `, resetAndLoadAction);
        }
    }

    onBeforeLoadingPage(_tableFetcher: TableFetcher): boolean {
        return true;
    }

    onFinished(_tableFetcher: TableFetcher): void {
        this.progressBar.stop();
    }

    onPageLoaded(_tableFetcher: TableFetcher, _pageCnt: number, _text: string): void {
        this.progressBar.next();
    }
}

interface DefaultTableRef {
    tableRef: TableRef,
    infoBar: InfoBar,
    progressBar: ProgressBar
}
export function createDefaultTableRefAndInfoBar(): Result<DefaultTableRef> {
    let tableRef = findTableRefInCode();
    if(!tableRef) {
        return { error: "Cannot find table." };
    }
    document.getElementById(def.INFO_CONTAINER_ID)?.remove();
    let divInfoContainer = tableRef.createElementAboveTable("div");
    let infoBar = new InfoBar(divInfoContainer.appendChild(document.createElement("div")));
    let progressBar = insertProgressBar(infoBar.divInfoLine, "loading pages... ");
    return { result: {tableRef, infoBar, progressBar} };
}

interface DefaultTableFetcher {
    tableFetcher: TableFetcher,
    infoBar: InfoBar,
    progressBar: ProgressBar,
    infoBarListener: InfoBarTableFetchListener
}
export function createDefaultTableFetcher(): Result<DefaultTableFetcher> {
    let result = createDefaultTableRefAndInfoBar();
    if("error" in result)
        return { error: result.error };

    let {tableRef, infoBar, progressBar} = result.result;

    let tableFetcher = new TableFetcher(
        tableRef,
        getChecksumBuilder(tableRef.htmlTableId)
    );
    let infoBarListener = new InfoBarTableFetchListener(infoBar, progressBar);
    tableFetcher.addListener(infoBarListener);
    return { result: {tableFetcher, infoBar, progressBar, infoBarListener} };
}