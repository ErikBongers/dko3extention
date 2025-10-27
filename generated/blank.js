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
	console.log("message for my tab type: ", msg);
	document.getElementById("container").innerHTML = "Message was for my tab type" + msg.data;
}).onMessageForMe((msg) => {
	console.log("message for me: ", msg);
	document.getElementById("container").innerHTML = "DATA:" + msg.data;
}).onData((data) => {
	document.querySelector("button").addEventListener("click", async () => {
		await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, void 0, "Hullo! Fly safe!");
	});
	console.log("tab opened: request data message sent and received: ");
	console.log(data);
	document.getElementById("container").innerHTML = data.data;
	document.title = data.pageTitle;
});

//#endregion
})();
//# sourceMappingURL=blank.js.map