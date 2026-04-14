import {findFirstNavigation} from "./tableNavigation";
import {CheckSumBuilder, DkoTableRef, findTableRefInCode, PlainTableRef, TableFetcher, TableFetchListener, TableRef} from "./tableFetcher";
import {createDownloadTableWithExtraAction, getChecksumBuilder} from "./observer";
import {dateDiffToString, millisToString, Result, setViewFromCurrentUrl} from "../globals";
import {InfoBar} from "../infoBar";
import {ProgressBar} from "../progressBar";
import * as def from "../def";
import {executeTableCommands, TableHandlerForHeaders} from "./tableHeaders";
import {FetchChain} from "./fetchChain";
import {createInfoBlockForTable, InfoBlock} from "../infoBlock";

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

    return new DkoTableRef(htmlTableId, tableNav, buildFetchUrl);
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

export async function getTable(tableRef: DkoTableRef, infoBarListener: InfoBarTableFetchListener, clearCache: boolean, checksumBuilder: CheckSumBuilder | null = null) {
    let tableFetcher = new TableFetcher(
        tableRef,
        checksumBuilder ?? getChecksumBuilder(tableRef.htmlTableId)
    );

    if(infoBarListener)
        tableFetcher.addListener(infoBarListener);

    if (clearCache)
        tableFetcher.clearCache();

    let fetchedTable = await tableFetcher.fetch();
    await setViewFromCurrentUrl();
    return fetchedTable;
}

//don't include the pound sign "#"
export async function getTableFromHash(hash: string, clearCache: boolean, infoBarListener: InfoBarTableFetchListener) {
    let tableRef = await getTableRefFromHash(hash);
    console.log(tableRef);
    return await getTable(tableRef, infoBarListener, clearCache);
}

export function createDefaultTableRefAndInfoBlock() {
    let result = createDefaultTableRef();
    if("error" in result)
        return { error: result.error };

    let {tableRef} = result.result;

    let infoBlock = createInfoBlockForTable(tableRef);
    return {result: {tableRef, infoBlock}};
}

export async function downloadTableRows() {
    let result = createDefaultTableRefAndInfoBlock();
    if("error" in result) {
        console.error(result.error);
        return null;
    }
    let {tableRef, infoBlock} = result.result;

    let result2 = createDefaultTableFetcher(tableRef, infoBlock);
    if("error" in result2) {
        console.error(result2.error);
        return null;
    }
    let {tableFetcher} = result2.result;
    tableFetcher.tableHandler = new TableHandlerForHeaders();

    let fetchedTable = await tableFetcher.fetch();
    let fetchedRows = fetchedTable.getRows();
    let tableContainer = fetchedTable.tableFetcher.tableRef.getOrgTableContainer();
    tableContainer
        .querySelector("tbody")
        .replaceChildren(...fetchedRows);
    tableContainer.querySelector("table").classList.add("fullyFetched");
    executeTableCommands(fetchedTable.tableFetcher.tableRef);
    return {fetchedTable, infoBlock: infoBlock, listener: new InfoBarTableFetchListener(infoBlock)};
}

export async function checkAndDownloadTableRows(ev: UIEvent) {
    let tableRef: TableRef = findTableRefInCode();
    if(!tableRef) {
        let table = (ev.target as HTMLElement).closest("table");
        tableRef = new PlainTableRef(table.id);
    }
    if(tableRef.isFullyFetched()) {
        let infoBlock = createInfoBlockForTable(tableRef);
        return {tableRef, infoBlock, listener: new InfoBarTableFetchListener(infoBlock)};
    }
    let res = await downloadTableRows();
    return {tableRef, infoBlock: res.infoBlock, listener: res.listener};
}

export class InfoBarTableFetchListener implements TableFetchListener {
    infoBar: InfoBar;
    progressBar: ProgressBar;

    constructor(infoBlock: InfoBlock) {
        this.infoBar = infoBlock.infoBar;
        this.progressBar = infoBlock.progressBar;
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
            this.infoBar.setCacheInfo(`Gegevens uit cache, ${dateDiffToString(tableFetcher.shadowTableDate, new Date())} oud. `, resetAndLoadAction);
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
    tableRef: DkoTableRef
}

export function createDefaultTableRef(): Result<DefaultTableRef> {
    let tableRef = findTableRefInCode();
    if(!tableRef) {
        return { error: "Cannot find table." };
    }
    return { result: {tableRef} };
}

interface DefaultTableFetcher {
    tableFetcher: TableFetcher,
    infoBlock: InfoBlock,
    infoBarListener: InfoBarTableFetchListener
}
export function createDefaultTableFetcher(tableRef: DkoTableRef, infoBlock: InfoBlock): Result<DefaultTableFetcher> {
    let tableFetcher = new TableFetcher(
        tableRef,
        getChecksumBuilder(tableRef.htmlTableId)
    );
    let infoBarListener = new InfoBarTableFetchListener(infoBlock);
    tableFetcher.addListener(infoBarListener);
    return { result: {tableFetcher, infoBlock, infoBarListener} };
}
