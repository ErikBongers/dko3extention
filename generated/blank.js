(function() {

"use strict";

//#region typescript/messaging.ts
let Actions = /* @__PURE__ */ function(Actions$1) {
	Actions$1["OpenHtmlTab"] = "open_tab";
	Actions$1["RequestTabData"] = "request_tab_data";
	Actions$1["TabData"] = "tab_data";
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
function sendRequest(action, from, to, toId, data, pageTitle) {
	let req = {
		action,
		data,
		pageTitle,
		senderTabType: from,
		targetTabType: to,
		targetTabId: toId
	};
	return chrome.runtime.sendMessage(req);
}
let DataRequestTypes = /* @__PURE__ */ function(DataRequestTypes$1) {
	DataRequestTypes$1["HoursSettings"] = "HoursSettings";
	DataRequestTypes$1["Html"] = "Html";
	return DataRequestTypes$1;
}({});
async function sendDataRequest(sender, dataType, params) {
	let tab = await chrome.tabs.getCurrent();
	let dataRequestInfo = {
		tabId: tab.id,
		dataType,
		params
	};
	await sendRequest(Actions.RequestTabData, sender, TabType.Undefined, void 0, dataRequestInfo);
}
function createMessageHandler(tabType) {
	let handler$1 = {
		getListener: function() {
			let self = this;
			return async function onMessage(request, _sender, _sendResponse) {
				console.log(`tab received: `, request);
				if (request.targetTabType === tabType) {
					self._onMessageForMyTabType?.(request);
					let tab = await chrome.tabs.getCurrent();
					if (request.targetTabId === tab.id) if (request.action === Actions.TabData && self._onData) self._onData(request);
					else self._onMessageForMe?.(request);
				}
			};
		},
		onMessageForMyTabType: function(callback) {
			this._onMessageForMyTabType = callback;
			return this;
		},
		onMessageForMe: function(callback) {
			this._onMessageForMe = callback;
			return this;
		},
		onData: function(callback) {
			this._onData = callback;
			return this;
		},
		_onMessageForMyTabType: void 0,
		_onMessageForMe: void 0,
		_onData: void 0
	};
	return handler$1;
}

//#endregion
//#region typescript/blank.ts
let handler = createMessageHandler(TabType.Html);
chrome.runtime.onMessage.addListener(handler.getListener());
handler.onMessageForMyTabType((msg) => {
	let data = JSON.parse(msg.data);
	console.log("message for my tab type: ", msg);
	document.getElementById("container").innerHTML = data.html;
	document.title = data.title;
}).onMessageForMe((msg) => {
	console.log("message for me: ", msg);
	document.getElementById("container").innerHTML = "DATA:" + msg.data;
}).onData((data) => {
	console.log("requested data received: ");
	console.log(data);
	document.getElementById("container").innerHTML = data.html;
	document.title = data.title;
});
async function onDocumentLoaded(_) {
	let params = new URLSearchParams(document.location.search);
	let cacheId = params.get("cacheId");
	console.log("requesting data for cacheId: ", cacheId);
	await sendDataRequest(TabType.Html, DataRequestTypes.Html, { cacheId });
}
document.addEventListener("DOMContentLoaded", onDocumentLoaded);

//#endregion
})();
//# sourceMappingURL=blank.js.map