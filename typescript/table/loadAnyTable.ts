import {findFirstNavigation} from "./tableNavigation";
import {findTableRefInCode, TableFetcher, TableFetchListener, TableRef} from "./tableFetcher";
import {createDownloadTableWithExtraAction, getChecksumBuilder} from "./observer";
import {millisToString, Result, setViewFromCurrentUrl} from "../globals";
import {InfoBar} from "../infoBar";
import {insertProgressBar, ProgressBar} from "../progressBar";
import * as def from "../def";
import {executeTableCommands, TableHandlerForHeaders} from "./tableHeaders";
import {FetchChain} from "./fetchChain";

export async function  getWerklijstTableRef() {
    let chain = new FetchChain();
    await fetch("views/leerlingen/werklijst/werklijst.maken.php", {method: "POST"}); //todo: create a chain.post()
    await chain.fetch("view.php?args=leerlingen-werklijst$werklijst");
    await chain.fetch("views/leerlingen/werklijst/werklijst.view.php");
    await chain.fetch("views/ui/datatable.php?id=leerlingen_werklijst");
    return parseDataTablePhp(chain, "leerlingen_werklijst");
}

async function parseDataTablePhp(chain: FetchChain, htmlTableId: string) {
    chain.find("var", "datatable_id", "=");
    let datatable_id = chain.getQuotedString();
    chain.clipTo("</script>");
    chain.find(".", "load", "(");
    let tableNavUrl = chain.getQuotedString() + datatable_id + '&pos=top';
    await chain.fetch(tableNavUrl);
    let tableNav = findFirstNavigation(chain.div());
    console.log(tableNav);
    let buildFetchUrl = (offset: number) => `/views/ui/datatable.php?id=${datatable_id}&start=${offset}&aantal=0`;

    return new TableRef(htmlTableId, tableNav, buildFetchUrl);
}

async function getTableRefFromHash(hash: string) {
    let chain = new FetchChain();

    await chain.fetch(def.DKO3_BASE_URL+"#" + hash);
    await chain.fetch("view.php?args=" + hash); // call to changeView() - assuming this is always the same, so no parsing here.
    chain.findDocReadyLoadUrl();
    let index_view = await chain.fetch();
    chain.findDocReadyLoadScript();
    chain.find("$", "(");
    let htmlTableId = chain.getQuotedString().substring(1); //remove "#" from table id.;

    chain.set(index_view);
    chain.findDocReadyLoadUrl();
    if (!chain.includes("ui/datatable.php")) {
        await chain.fetch(); //Try again
        chain.findDocReadyLoadUrl();
    }
    await chain.fetch();
    return parseDataTablePhp(chain, htmlTableId);
}

export async function getTable(tableRef: TableRef, infoBarListener: InfoBarTableFetchListener, clearCache: boolean) {
    let tableFetcher = new TableFetcher(
        tableRef,
        getChecksumBuilder(tableRef.htmlTableId)
    );

    if(infoBarListener)
        tableFetcher.addListener(infoBarListener);

    if (clearCache)
        tableFetcher.clearCache();

    let fetchedTable = await tableFetcher.fetch();
    await setViewFromCurrentUrl();
    return fetchedTable;
}

export async function getTableFromHash(hash: string, clearCache: boolean, infoBarListener: InfoBarTableFetchListener) {
    let tableRef = await getTableRefFromHash(hash);
    console.log(tableRef);
    return await getTable(tableRef, infoBarListener, clearCache);
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
