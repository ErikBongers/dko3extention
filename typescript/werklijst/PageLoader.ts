import {PageHandler} from "../pageHandlers";
import {findFirstNavigation, TableNavigation} from "../table/tableNavigation";

enum PageContinue { Cancel, Continue}
type OnPageLoadedHandler = (text: string, offset: number) => PageContinue;
type OnLoadedHandler = () => void;
type OnAbortHandler = () => void;

export interface PageLoadHandler {
    onPage: OnPageLoadedHandler;
    onLoaded: OnLoadedHandler;
    onAbort: OnAbortHandler;
}

export class PageLoader {
    readonly buildFetchUrl: (offset: number) => string;
    pageLoadHandler: PageLoadHandler;
    navigationData: TableNavigation;
    readonly pageId: string;

    constructor(pageId: string, buildFetchUrl: (offset: number) => string, pageLoadHandler: PageLoadHandler, navigationData?: TableNavigation) {
        this.pageId = pageId;
        this.buildFetchUrl = buildFetchUrl;
        this.pageLoadHandler = pageLoadHandler;
        this.navigationData = navigationData;
    }

    async justGetTheData() {
        let offset = 0;
        try {
            while (true) {
                console.log("fetching page " + offset);
                let response = await fetch(this.buildFetchUrl(offset)); //TODO: does this need to be generic? At least have a default?
                let text = await response.text();
                if (this.pageLoadHandler.onPage)
                    this.pageLoadHandler.onPage(text, offset);
                if(!this.navigationData) {
                    let navResponse = await fetch("https://administratie.dko3.cloud/views/ui/datatablenav.php?id="+this.pageId+"&pos=top"); //TODO: leave hard code are have buildNavUrl() callback?
                    let text = await navResponse.text();
                    let shadowTableTemplate = document.createElement("template");
                    shadowTableTemplate.innerHTML = text;
                    this.navigationData = findFirstNavigation(shadowTableTemplate.content);
                }
                if (offset > this.navigationData.maxCount) {
                    break;
                }
                offset += this.navigationData.step;
            }
            this.pageLoadHandler.onLoaded();
        } catch (e) {
            this.pageLoadHandler.onAbort();
        }
    }
}
