(function() {

"use strict";

//#region typescript/messaging.ts
let Actions = /* @__PURE__ */ function(Actions$1) {
	Actions$1["OpenHtmlTab"] = "open_tab";
	Actions$1["GetTabData"] = "get_tab_data";
	Actions$1["GetParentTabId"] = "get_parent_tab_id";
	Actions$1["OpenHoursSettings"] = "open_hours_settings";
	Actions$1["HoursSettingsChanged"] = "open_hours_settings_changed";
	Actions$1["GreetingsFromParent"] = "greetingsFromParent";
	Actions$1["GreetingsFromChild"] = "greetingsFromChild";
	return Actions$1;
}({});
let TabType = /* @__PURE__ */ function(TabType$1) {
	TabType$1["Undefined"] = "Undefined";
	TabType$1["Main"] = "Main";
	TabType$1["HoursSettings"] = "HoursSettings";
	TabType$1["Html"] = "Html";
	return TabType$1;
}({});

//#endregion
//#region typescript/serviceworker.ts
let defaultOptions = {
	showDebug: true,
	showNotAssignedClasses: true,
	markOtherAcademies: true,
	otherAcademies: ""
};
chrome.runtime.onInstalled.addListener(() => {
	console.log("installed.");
	chrome.storage.sync.get(defaultOptions, (items) => {
		chrome.storage.sync.set({
			...defaultOptions,
			...items
		}, () => {
			console.log("Options initialized");
		});
	});
});
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	console.log("service worker: tab updated: ", tabId, changeInfo.status);
});
chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	console.log("service worker: tab removed: ", tabId);
});
let global_request = {};
chrome.runtime.onMessage.addListener(onMessage);
async function getTabId(tabType) {
	let data = await chrome.storage.session.get(tabType);
	console.log(data);
	let tabId = data[tabType];
	return parseInt(tabId);
}
async function setTabId(tabType, tabId) {
	let data = {};
	data[tabType] = tabId.toString();
	await chrome.storage.session.set(data);
}
function onMessage(message, sender, sendResponse) {
	switch (message.action) {
		case Actions.OpenHtmlTab:
			let url = chrome.runtime.getURL("resources/blank.html");
			global_request = message;
			if (message.senderTabType === TabType.Main) setTabId(TabType.Main, sender.tab.id);
			chrome.tabs.create({ url }).then((_tab) => {
				sendResponse({ tabId: _tab.id });
			});
			return true;
		case Actions.OpenHoursSettings:
			global_request = message;
			setTabId(TabType.Main, sender.tab.id);
			chrome.tabs.create({ url: chrome.runtime.getURL("resources/teacherHoursSetup.html") }).then((tab) => {
				sendResponse({ tabId: tab.id });
			});
			return true;
		case Actions.GetTabData:
			sendResponse(global_request);
			break;
		case Actions.GetParentTabId:
			sendResponse(getTabId(TabType.Main));
			break;
		case Actions.GreetingsFromChild:
		default:
			getTabId(message.targetTabType).then((id) => {
				chrome.tabs.sendMessage(id, message).then((r) => {});
			});
			break;
	}
}

//#endregion
})();
//# sourceMappingURL=serviceworker.js.map