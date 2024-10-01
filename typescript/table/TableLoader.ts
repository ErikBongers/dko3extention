import {PageContinue, PaginatedLoader, PageLoadHandler} from "../werklijst/PaginatedLoader";

export class TableLoader implements PageLoadHandler {
    shadowTableTemplate: HTMLTemplateElement;
    externalPageLoadHandler: PageLoadHandler;

    constructor(externalPageLoader: PageLoadHandler) {
        this.externalPageLoadHandler = externalPageLoader;
    }

    onPage (text: string, offset: number) : PageContinue {
        console.log(`Loaded table page ${offset}:`);
        let template: HTMLTemplateElement;
        if(offset === 0) {
            this.shadowTableTemplate = document.createElement('template');
            this.shadowTableTemplate.innerHTML = text;
            template = this.shadowTableTemplate;
        } else {
            template = document.createElement('template');
            template.innerHTML = text;
        }
        let rows = template.content.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>;
        if(offset !== 0) {
            this.shadowTableTemplate.content.querySelector("tbody").append(...rows);
        }
        return this.externalPageLoadHandler.onPage(text, offset);
    }
    onLoaded() {
        console.log("Table loading complete!");
        this.externalPageLoadHandler.onLoaded();
    }
    onAbort(e: any) {
        console.error(e);
        this.externalPageLoadHandler.onAbort(e);
    }

    loadTheTable() {
        let buildFetchUrl = (offset: number) => `/views/ui/datatable.php?id=leerlingen_werklijst&start=${offset}&aantal=0`;
        let pageLoader = new PaginatedLoader("leerlingen_werklijst", buildFetchUrl, this);
        pageLoader.justGetTheData().then(() => {
            console.log("Table loader DONE!");
        });
    }

    getTable(): HTMLTableElement {
        return this.shadowTableTemplate.content.querySelector("table");
    }
}
