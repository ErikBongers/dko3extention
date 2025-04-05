import {Actions, ExtensionRequest} from "./globals";

let defaultOptions = {
    showDebug: true,
    showNotAssignedClasses: true,
    markOtherAcademies: true,
    otherAcademies: ""
};

chrome.runtime.onInstalled.addListener(() => {
    console.log("installed.");
    chrome.storage.sync.get(
        defaultOptions,
        (items) => {
            chrome.storage.sync.set(
                {...defaultOptions, ...items},
                () => {
                    console.log("Options initialized");
                }
            );
        }
    );

});

let global_request = {};

chrome.runtime.onMessage.addListener(
    function(request: ExtensionRequest, sender, sendResponse) {
        console.log("received ");
        console.log(request);
        switch (request.action) { //todo: make a shared type with content generated.
            case Actions.OpenTab:
                let url = chrome.runtime.getURL("resources/blank.html");
                // chrome.storage.session.set({ blank_html: request})
                //     .then(() => {
                //         console.log("Opening " + url);
                //     });
                global_request = request;
                chrome.tabs.create({url}).then(tab => {
                    console.log("tab created.");
                });
                break;
            case Actions.GetTabData:
                console.log("getTabData:")
                // chrome.storage.session.get(["blank_html"]).then(result => {
                // });
                sendResponse(global_request);
                break;
        }
    }
);
