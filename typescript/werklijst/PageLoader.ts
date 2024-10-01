import {PageHandler} from "../pageHandlers";
import {findFirstNavigation, TableNavigation} from "../table/tableNavigation";

export enum PageContinue { Cancel, Continue}
export type OnPageLoadedHandler = (text: string, offset: number) => PageContinue;
export type OnLoadedHandler = () => void;
export type OnAbortHandler = (e: any) => void;

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
        await fetch("https://administratie.dko3.cloud/view.php?args=leerlingen-werklijst$werklijst");
        await fetch ("https://administratie.dko3.cloud/views/leerlingen/werklijst/werklijst.view.php");
        await fetch ("https://administratie.dko3.cloud/views/leerlingen/werklijst/werklijst.table.php");
        let offset = 0;
        try {
            while (true) {
                console.log("fetching page " + offset);
                let response = await fetch(this.buildFetchUrl(offset)); //TODO: does this need to be generic? At least have a default?
                let text = await response.text();
                if (this.pageLoadHandler.onPage?.(text, offset) === PageContinue.Cancel) {
                    // noinspection ExceptionCaughtLocallyJS
                    throw "Cancelled";
                }

                if(!this.navigationData) {
                    let navResponse = await fetch("https://administratie.dko3.cloud/views/ui/datatablenav.php?id="+this.pageId+"&pos=top"); //TODO: leave hard code are have buildNavUrl() callback?
                    let text = await navResponse.text();
                    let shadowTableTemplate = document.createElement("template");
                    shadowTableTemplate.innerHTML = text;
                    this.navigationData = findFirstNavigation(shadowTableTemplate.content);
                    if(!this.navigationData) {
                        // noinspection ExceptionCaughtLocallyJS
                        throw "Can't find navigation data.";
                    }
                    console.log(this.navigationData);
                }
                offset += this.navigationData.step;
                if (offset > this.navigationData.maxCount) {
                    break;
                }
            }
            this.pageLoadHandler.onLoaded();
        } catch (e) {
            this.pageLoadHandler.onAbort(e);
        }
    }
}
