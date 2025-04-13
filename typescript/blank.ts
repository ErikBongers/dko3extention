import {ExtensionRequest} from "./globals";

chrome.runtime.onMessage.addListener(
    function(request, _sender, _sendResponse) {
        console.log("blank received: ");
        console.log(request);
    });

chrome.tabs.getCurrent(tab => {
    chrome.runtime.sendMessage({ action: "get_tab_data", tabId: tab.id })
        .then((res: ExtensionRequest) => {
            console.log("tab opened: request data message sent and received: ");
            console.log(res);
            document.body.innerHTML = res.data;
            document.title = res.pageTitle;
        });
});