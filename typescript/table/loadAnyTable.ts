import {findFirstNavigation} from "./tableNavigation";
import {findTableRefInCode, TableFetcher, TableFetchListener, TableRef} from "./tableFetcher";
import {getChecksumBuilder} from "./observer";
import {millisToString, Result, ResultFail, ResultOk, setViewFromCurrentUrl} from "../globals";
import {InfoBar} from "../infoBar";
import {insertProgressBar, ProgressBar} from "../progressBar";
import * as def from "../def";

async function getTableRefFromHash(hash: string) {
    let page = await fetch("https://administratie.dko3.cloud/#" + hash).then(res => res.text());

    // call to changeView() - assuming this is always the same, so no parsing here.
    let view = await fetch("view.php?args=" + hash).then(res => res.text());
    let index_viewUrl = getDocReadyLoadUrl(view);

    //get the htmlTableId (from index.view.php
    let index_view = await fetch(index_viewUrl).then(res => res.text());
    let scanner = new TokenScanner(index_view);
    let htmlTableId = getDocReadyLoadScript(index_view)
        .find("$", "(", "'#")
        .clipTo("'")
        .result();
    if (!htmlTableId) {
        htmlTableId = getDocReadyLoadScript(index_view)
            .find("$", "(", "\"#")
            .clipTo("\"")
            .result();
    }
    let someUrl = getDocReadyLoadUrl(index_view); //NOT SURE THIS IS datatable.php !!!
    //>> keep going unti we get to datatable.php...
    if (!someUrl.includes("ui/datatable.php")) {
        //fetch again. Don't loop to avoid dead loop.
        let someCode = await fetch(someUrl).then(res => res.text());
        someUrl = getDocReadyLoadUrl(someCode); //NOT SURE THIS IS datatable.php !!!
    }
    let datatableUrl = someUrl; //hope and pray...
    //get datatable id an url from datatable.php
    let datatable = await fetch(datatableUrl).then(result => result.text());
    scanner = new TokenScanner(datatable);
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
        .result();
    tableNavUrl += datatable_id + '&pos=top';
    let tableNavText = await fetch(tableNavUrl).then(res => res.text().then());

    let div = document.createElement("div");
    div.innerHTML = tableNavText;
    let tableNav = findFirstNavigation(div);
    console.log(tableNav);
    let buildFetchUrl = (offset: number) => `/views/ui/datatable.php?id=${datatable_id}&start=${offset}&aantal=0`;

    return new TableRef(htmlTableId, tableNav, buildFetchUrl);
}

export async function getTableFromHash(hash: string, clearCache: boolean, infoBar: InfoBar) {
    let tableRef = await getTableRefFromHash(hash);
    console.log(tableRef);

    let progressBar = insertProgressBar(this.infoBar.divInfoLine, this.tableRef.navigationData.steps(), "loading pages... ");

    let infoBarListener = new InfoBarTableFetchListener(infoBar, progressBar);

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

function getLoadUrl(text: string) {
    let scanner = new TokenScanner(text);
    return scanner
        .find(".", "load", "(")
        .clipString()
        .result();
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


function escapeRegexChars(text: string): string {
    return text
        .replaceAll("\\", "\\\\")
        .replaceAll("^", "\\^")
        .replaceAll("$", "\\$")
        .replaceAll(".", "\\.")
        .replaceAll("|", "\\|")
        .replaceAll("?", "\\?")
        .replaceAll("*", "\\*")
        .replaceAll("+", "\\+")
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)")
        .replaceAll("[", "\\[")
        .replaceAll("]", "\\]")
        .replaceAll("{", "\\{")
        .replaceAll("}", "\\}")
}

class ScannerElse {
    scannerIf: ScannerIf;

    constructor(scannerIf: ScannerIf) {
        this.scannerIf = scannerIf;
    }

    not(callback?: (scanner: TokenScanner) => TokenScanner) {
        if(!this.scannerIf.yes) {
            callback?.(this.scannerIf.scanner);
        }
        return this.scannerIf.scanner;
    }
}

class ScannerIf {
    yes: boolean;
    scanner: TokenScanner;

    constructor(yes: boolean, scanner: TokenScanner) {
        this.yes = yes;
        this.scanner = scanner;
    }

    then(callback: (scanner: TokenScanner) => TokenScanner) : ScannerElse {
        if(this.yes) {
            callback(this.scanner);
        }
        return new ScannerElse(this);
    }
}

class TokenScanner {
    valid: boolean;
    source: string;
    cursor: string;
    constructor(text: string) {
        this.valid = true;
        this.source = text;
        this.cursor = text;
    }

    result(): string | undefined {
        if(this.valid)
            return this.cursor;
        return undefined;
    }

    find(...tokens: string[]) {
        return this.#find("", tokens);
    }

    match(...tokens: string[]) {
        return this.#find("^\\s*", tokens);
    }

    #find(prefix: string, tokens: string[]) {
        if(!this.valid)
            return this;
        let rxString = prefix + tokens
            .map(token => escapeRegexChars(token) + "\\s*")
            .join("");
        let match = RegExp(rxString).exec(this.cursor);
        if (match) {
            this.cursor = this.cursor.substring(match.index + match[0].length);
            return this;
        }
        this.valid = false;
        return this;
    }

    ifMatch(...tokens: string[]) : ScannerIf {
        if(!this.valid)
            return new ScannerIf(true, this); //never mind the yes: the scanner is invalid.

        this.match(...tokens);
        if(this.valid) {
            return new ScannerIf(true, this);
        } else {
            this.valid = true;
            return new ScannerIf(false, this);
        }
    }

    clip(len: number) {
        if(!this.valid)
            return this;
        this.cursor = this.cursor.substring(0, len);
        return this;
    }

    clipTo(end: string) {
        if(!this.valid)
            return this;
        let found = this.cursor.indexOf(end);
        if(found < 0) {
            this.valid = false;
            return this;
        }
        this.cursor = this.cursor.substring(0, found);
        return this;
    }

    clone() : TokenScanner {
        let newScanner = new TokenScanner(this.cursor);
        newScanner.valid = this.valid;
        return newScanner;
    }

    clipString() {
        let isString = false;
        this.ifMatch("'")
            .then(result => {
                isString = true;
                return result.clipTo("'");
            })
            .not()
        .ifMatch("\"")
            .then(result => {
                isString = true;
                return result.clipTo("\"")
            })
            .not();
        this.valid = this.valid && isString;
        return this;
    }

    getString(callback: (res: string) => void) {
        let subScanner = this.clone();
        let result = subScanner
            .clipString()
            .result();
        if(result) {
            callback(result);
            //now skip the string in <this>.
            this
                .ifMatch("'")
                .then(result => result.find("'"))
                .not()
                .ifMatch("\"")
                .then(result => result.find("\""))
                .not();
        }
        return this;
    }
}


let x = "<script type=\"text/javascript\">\n" +
    "    $(document).ready(function() {\n" +
    "\n" +
    "        load_datatable_lijst_awi_leerlingen_inschrijvingen_3weken();\n" +
    "    });\n" +
    "\n" +
    "    function load_datatable_lijst_awi_leerlingen_inschrijvingen_3weken() {\n" +
    "        $('#table_lijst_awi_leerlingen_inschrijvingen_3weken_table').load('views/ui/datatable.php?id=lijst_awi_leerlingen_inschrijvingen_3weken');\n" +
    "    }\n" +
    "</script>";

export function testScanner() {

    let text = "$(document).ready(function() {\n" +
        "        $('[data-toggle=\"tooltip\"]').tooltip();\n" +
        "\n" +
        "        var datatable_id = 'lijst_awi_leerlingen_inschrijvingen_3weken';\n" +
        "\n" +
        "        var nanobar = new Nanobar({\n" +
        "            target: document.getElementById('table_' + datatable_id + '_nanobar')\n" +
        "        });\n" +
        "\n" +
        "        nanobar.go(50);\n" +
        "\n" +
        "        $('#tablenav_' + datatable_id + '_top').load('views/ui/datatablenav.php?id=' + datatable_id + '&pos=top');\n" +
        "        $('#tablenav_' + datatable_id + '_bottom').load('views/ui/datatablenav.php?id=' + datatable_id + '&pos=bottom');\n" +
        "\n" +
        "        nanobar.go(100);\n" +
        "\n" +
        "        $(\"input[data-type='date']\").off('blur').on('change', function() {\n" +
        "            datatable_lijst_awi_leerlingen_inschrijvingen_3weken_settablefilter($(this).data('col_id'), $(this).val())\n" +
        "        });\n" +
        "        jQuery(function($) {\n" +
        "            $(\"input[data-type='date']\").datepicker({\n" +
        "                altFormat: \"yy-mm-dd\",\n" +
        "                dateFormat: \"yy-mm-dd\"\n" +
        "            });\n" +
        "        });\n" +
        "\n" +
        "    });\n" +
        "    ...\n" +
        "    </script>";

    let scanner = new TokenScanner(text);
    let datatable_id = "";
    let tableNavUrl =  scanner
        .find("var", "datatable_id", "=")
        .getString(res => { datatable_id = res; })
        .clipTo("</script>")
        .find(".", "load", "(")
        .clipString()
        .result();
}

export async function downloadTable() {
    let result = createDefaultTableFetcher();
    if("error" in result) {
        console.error(result.error);
        return;
    }
    let {tableFetcher} = result.result;

    let fetchedTable = await tableFetcher.fetch();
    let fetchedRows = fetchedTable.getRows();
    fetchedTable.tableFetchere.tableRef.getOrgTableContainer()
        .querySelector("tbody")
        .replaceChildren(...fetchedRows);
    return fetchedTable;
}

export class InfoBarTableFetchListener implements TableFetchListener {
    infoBar: InfoBar;
    progressBar: ProgressBar;

    constructor(infoBar: InfoBar, progressBar: ProgressBar) {
        this.infoBar = infoBar;
        this.progressBar = progressBar;
    }

    onStart(_tableFetcher: TableFetcher): void {
        this.progressBar.start();
    }
    onLoaded (tableFetcher: TableFetcher): void {
        if(tableFetcher.isUsingCached) {
            let reset_onclick = (e: MouseEvent ) => {
                e.preventDefault();
                tableFetcher.reset();
                downloadTable();
                return true;
            }
            this.infoBar.setCacheInfo(`Gegevens uit cache, ${millisToString((new Date()).getTime()-tableFetcher.shadowTableDate.getTime())} oud. `, reset_onclick);
        }
    }

    onBeforeLoadingPage(_tableFetcher: TableFetcher): boolean {
        return true;
    }

    onFinished(_tableFetcher: TableFetcher): void {
        this.infoBar.setInfoLine("");//implicitely removes the progressBar.
        this.progressBar = undefined;
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
    let progressBar = insertProgressBar(infoBar.divInfoLine, tableRef.navigationData.steps(), "loading pages... ");
    return { result: {tableRef, infoBar, progressBar} };
}

interface DefaultTableFetcher {
    tableFetcher: TableFetcher,
    infoBar: InfoBar,
    progressBar: ProgressBar
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
    tableFetcher.addListener(new InfoBarTableFetchListener(infoBar, progressBar))
    return { result: {tableFetcher, infoBar, progressBar} };
}