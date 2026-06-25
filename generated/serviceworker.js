(function() {
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
	chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, _tab) {
		console.log("service worker: tab updated: ", tabId, changeInfo.status);
	});
	chrome.tabs.onRemoved.addListener(function(tabId, _removeInfo) {
		console.log("service worker: tab removed: ", tabId);
	});
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
	async function fetchAndSendWww(message) {
		let promises = message.data.urlList.map((url) => {
			return {
				url,
				response: fetch(url)
			};
		});
		let responses = await Promise.all(promises);
		return await Promise.all(responses.map(async (res) => {
			return {
				url: res.url,
				text: await (await res.response).text()
			};
		}));
	}
	function onMessage(message, sender, sendResponse) {
		switch (message.action) {
			case "open_tab":
				let url = chrome.runtime.getURL(`resources/blank.html?cacheId=${message.data.cacheId}`);
				if (message.senderTabType === "Main") setTabId("Main", sender.tab.id).then(() => {});
				chrome.tabs.create({ url }).then((_tab) => {
					sendResponse({ tabId: _tab.id });
				});
				return true;
			case "open_hours_settings":
				setTabId("Main", sender.tab.id).then(() => {});
				chrome.tabs.create({ url: chrome.runtime.getURL(`resources/teacherHoursSetup.html?schoolyear=${message.data.schoolyear}`) }).then((tab) => {
					sendResponse({ tabId: tab.id });
				});
				return true;
			case "open_diff_settings":
				setTabId("Main", sender.tab.id).then(() => {});
				let params = new URLSearchParams({
					academie: message.data.academie,
					schoolyear: message.data.schoolyear
				});
				chrome.tabs.create({ url: chrome.runtime.getURL(`resources/diffSettings.html?${params.toString()}`) }).then((tab) => {
					sendResponse({ tabId: tab.id });
				});
				return true;
			case "request_tab_data":
				getTabId("Main").then((tabId) => {
					chrome.tabs.sendMessage(tabId, message).then(() => {});
				});
				break;
			case "tab_data": break;
			case "get_parent_tab_id":
				sendResponse(getTabId("Main"));
				break;
			case "Www":
				fetchAndSendWww(message).then((www) => {
					message.data = www;
					sendResponse(message);
				});
				return true;
			default:
				console.log("service worker: received message: ", message);
				getTabId(message.targetTabType).then((id) => {
					chrome.tabs.sendMessage(id, message).then(() => {});
				});
				break;
		}
		return false;
	}
	//#endregion
})();

//# sourceMappingURL=serviceworker.js.map