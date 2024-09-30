import {PageContinue, PageLoader, PageLoadHandler} from "../werklijst/PageLoader";


/*

* pageLoader should trigger 2 things:
   - inform a tableBuilder
   - inform a progressBar
   > create a PageLoadHandler that does those 2 things
     OR
     create 2 PageLoadHadler wrappers for this
       > A PageLoadHandler that calls another PageLoadHandler.
         > the inner handler is the table builder
         > the outer one is the progress handler.
           > Allow for different kinds of progress handlers.

 */


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
        let pageLoader = new PageLoader("leerlingen_werklijst", buildFetchUrl, this);
        pageLoader.justGetTheData().then(() => {
            console.log("Table loader DONE!");
        });
    }

}