import {Actions, createMessageHandler, DataRequestTypes, HourSettingsDataRequestParams, HtmlDataRequestParams, sendDataRequest, sendRequest, TabType} from "./messaging";
import {DataCacheId, HtmlData} from "./globals";

let handler  = createMessageHandler(TabType.Html);

chrome.runtime.onMessage.addListener(handler.getListener());

handler
    .onMessageForMyTabType(msg => {
        let data: HtmlData = JSON.parse(msg.data);
        console.log("message for my tab type: ", msg);
        document.getElementById("container").innerHTML = data.html;
        document.title = data.title;
    })
    .onMessageForMe(msg => {
        console.log("message for me: ", msg);
        document.getElementById("container").innerHTML = "DATA:" + msg.data;
    })
    .onData((data: HtmlData) => {
        console.log("requested data received: ");
        console.log(data);
        document.getElementById("container").innerHTML = data.html;
        document.title = data.title;
    });

//todo: the data request is never received by the calling tab. So, a window refresh will fail. Add an onMessage listener to the calling tab.
async function onDocumentLoaded(this: Document, _: Event) {
    let params = new URLSearchParams(document.location.search);
    let cacheId = params.get("cacheId") as DataCacheId;
    console.log("requesting data for cacheId: ", cacheId);
    await sendDataRequest<HtmlDataRequestParams>(TabType.Html, DataRequestTypes.Html, {cacheId});
}

document.addEventListener("DOMContentLoaded", onDocumentLoaded);
