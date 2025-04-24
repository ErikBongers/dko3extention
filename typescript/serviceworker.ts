import MessageSender = chrome.runtime.MessageSender;
import {Actions, ServiceRequest, TabType} from "./messaging";

let defaultOptions = { //todo: integrate in options.ts.
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

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    console.log("service worker: tab updated: ", tabId, changeInfo.status);
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    console.log("service worker: tab removed: ", tabId);
});

let global_request = {};

chrome.runtime.onMessage.addListener( onMessage);

let mainTabId = -1;

function onMessage(message: ServiceRequest, sender: MessageSender, sendResponse: (response?: any) => void) {
    switch (message.action) {
        case Actions.OpenHtmlTab:
            let url = chrome.runtime.getURL("resources/blank.html");
            global_request = message;
            if(message.senderTabType === TabType.Main)
                mainTabId = sender.tab.id;
            chrome.tabs.create({url}).then(_tab => {
                //TODO: store tab id?
                sendResponse({tabId: _tab.id});
            });
            return true;
        case Actions.OpenHoursSettings:
            global_request = message;
            mainTabId = sender.tab.id;
            //todo: if already exists: activate?
            chrome.tabs.create({url: chrome.runtime.getURL("resources/teacherHoursSetup.html")}).then(tab => {
                sendResponse({tabId: tab.id}); //todo: make a Response type.
            });
            return true; //needed because sendResponse is called asynchronously.
        case Actions.GetTabData: //todo: move to sender instead of worker?
            sendResponse(global_request);
            break;
        case Actions.GetParentTabId:
            sendResponse(mainTabId);
            break;
        case Actions.GreetingsFromChild: {
            let targetTabId: number;
            if (message.targetTabType === TabType.Main)
                targetTabId = mainTabId;
            //todo: else?
            chrome.tabs.sendMessage(targetTabId, message).then(r => {
            });
            break;
        }
    }
}
