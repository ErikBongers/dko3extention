(function() {
	//#region typescript/messaging.ts
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
	async function sendDataRequest(sender, dataType, params) {
		await sendRequest("request_tab_data", sender, "Undefined", void 0, {
			tabId: (await chrome.tabs.getCurrent()).id,
			dataType,
			params
		});
	}
	function createMessageHandler(tabType) {
		return {
			getListener: function() {
				let self = this;
				return async function onMessage(request, _sender, _sendResponse) {
					console.log(`tab received: `, request);
					if (request.targetTabType === tabType) {
						self._onMessageForMyTabType?.(request);
						let tab = await chrome.tabs.getCurrent();
						if (request.targetTabId === tab.id) if (request.action === "tab_data" && self._onData) self._onData(request);
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
	}
	//#endregion
	//#region typescript/blank.ts
	let handler = createMessageHandler("Html");
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
		let cacheId = new URLSearchParams(document.location.search).get("cacheId");
		console.log("requesting data for cacheId: ", cacheId);
		await sendDataRequest("Html", "Html", { cacheId });
	}
	document.addEventListener("DOMContentLoaded", onDocumentLoaded);
	//#endregion
})();

//# sourceMappingURL=blank.js.map