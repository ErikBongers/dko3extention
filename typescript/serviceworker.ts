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

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, _tab) {
    console.log("service worker: tab updated: ", tabId, changeInfo.status);
});

chrome.tabs.onRemoved.addListener(function(tabId, _removeInfo) {
    console.log("service worker: tab removed: ", tabId);
});

chrome.runtime.onMessage.addListener( onMessage);

async function getTabId(tabType: TabType) {
    let data = await chrome.storage.session.get(tabType);
    console.log(data);
    let tabId = data[tabType];
    return parseInt(tabId);
}

async function setTabId(tabType: TabType, tabId: number) {
    let data = {};
    data[tabType] = tabId.toString();
    await chrome.storage.session.set(data);
}

function onMessage(message: ServiceRequest, sender: MessageSender, sendResponse: (response?: any) => void) {
    switch (message.action) {
        case Actions.OpenHtmlTab:
            let url = chrome.runtime.getURL(`resources/blank.html?cacheId=${message.data.cacheId}`);
            if(message.senderTabType === TabType.Main)
                setTabId(TabType.Main, sender.tab.id).then(() => {});
            chrome.tabs.create({url}).then(_tab => {
                sendResponse({tabId: _tab.id});
            });
            return true;
        case Actions.OpenHoursSettings:
            setTabId(TabType.Main, sender.tab.id).then(() => {});
            //todo: if already exists: activate?
            chrome.tabs.create({url: chrome.runtime.getURL(`resources/teacherHoursSetup.html?schoolyear=${message.data.schoolyear}`)}).then(tab => {
                sendResponse({tabId: tab.id}); //todo: make a Response type.
            });
            return true; //needed because sendResponse is called asynchronously.
        case Actions.RequestTabData:
            //forward the message.
            getTabId(TabType.Main).then(tabId => {
                chrome.tabs.sendMessage(tabId, message).then(() => {});
            });
            break;
        case Actions.TabData:
            // //forward the message.
            // console.log("service worker: forwardingg data: ", message);
            // chrome.tabs.sendMessage(message.targetTabId, message).then(() => {});
            break;
        case Actions.GetParentTabId:
            sendResponse(getTabId(TabType.Main));
            break;
        case Actions.GreetingsFromChild:
        default:
            console.log("service worker: received message: ", message);
            getTabId(message.targetTabType).then(id => {
                chrome.tabs.sendMessage(id, message).then(() => {});
            });
            break;
    }
}
