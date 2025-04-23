import {Actions, ServiceRequest, TabId} from "./globals";
import MessageSender = chrome.runtime.MessageSender;

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

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    console.log("service worker: tab updated: ", tabId, changeInfo.status);
});

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
    console.log("service worker: tab removed: ", tabId);
});

let global_request = {};

chrome.runtime.onMessage.addListener( onMessage);

let mainTabId = -1;
let hoursSetupTabId = -1;

function onMessage(message: ServiceRequest, sender: MessageSender, sendResponse: (response?: any) => void) {
    console.log("serviceWorker received message from tab:", sender.tab?.id ?? "<no tab>");
    console.log(message);
    switch (message.action) {
        case Actions.OpenTab:
            let url = chrome.runtime.getURL("resources/blank.html");
            global_request = message;
            if(message.senderTab === TabId.Main)
                mainTabId = sender.tab.id;
            chrome.tabs.create({url}).then(_tab => {
                sendResponse({tabId: _tab.id});
            });
            return true;
        case Actions.OpenHoursSettings:
            global_request = message;
            mainTabId = sender.tab.id;
            //todo: if already exists: activate?
            chrome.tabs.create({url: chrome.runtime.getURL("resources/blank.html")}).then(tab => {
                hoursSetupTabId = tab.id;
                sendResponse({tabId: tab.id}); //todo: make a Response type.
            });
            return true; //needed because sendResponse is called asynchronously.
        case Actions.GetTabData:
            console.log("getTabData:")
            sendResponse(global_request);
            break;
        case Actions.GetParentTabId:
            sendResponse(mainTabId);
            break;
        case Actions.GreetingsFromParent:
            console.log("passing greetings from parent to tab");
            let targetTabId: number;
            if(message.targetTab === TabId.HoursSettings)
                targetTabId = hoursSetupTabId;
            //todo: else?
            chrome.tabs.sendMessage(hoursSetupTabId, message).then(r => {});
            break;
    }
}
