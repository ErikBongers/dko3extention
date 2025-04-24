(() => {
  // typescript/messaging.ts
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
  async function sendGetDataRequest(sender) {
    let tab = await chrome.tabs.getCurrent();
    return await sendRequest("get_tab_data" /* GetTabData */, sender, 0 /* Undefined */, void 0, { tabId: tab.id });
  }
  function createMessageHandler(tabType) {
    return {
      getListener: function() {
        let self = this;
        return async function onMessage(request, _sender, _sendResponse) {
          console.log(`blank received: `, request);
          if (request.targetTabType === tabType) {
            self._onMessageForMyTabType?.(request);
            let tab = await chrome.tabs.getCurrent();
            if (request.targetTabId === tab.id) {
              self._onMessageForMe?.(request);
            }
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
      _onMessageForMyTabType: void 0,
      _onMessageForMe: void 0
    };
  }

  // typescript/blank.ts
  var handler = createMessageHandler(2 /* HoursSettings */);
  chrome.runtime.onMessage.addListener(handler.getListener());
  handler.onMessageForMyTabType((msg) => {
    console.log("message for my tab type: ", msg);
    document.getElementById("container").innerHTML = "Message was for my tab type" + msg.data;
  }).onMessageForMe((msg) => {
    console.log("message for me: ", msg);
    document.getElementById("container").innerHTML = "DATA:" + msg.data;
  });
  document.addEventListener("DOMContentLoaded", async () => {
    document.querySelector("button").addEventListener("click", async () => {
      await sendRequest("greetingsFromChild" /* GreetingsFromChild */, 0 /* Undefined */, 1 /* Main */, void 0, "Hullo! Fly safe!");
    });
    let res = await sendGetDataRequest(2 /* HoursSettings */);
    console.log("tab opened: request data message sent and received: ");
    console.log(res);
    document.getElementById("container").innerHTML = "Data:" + res.data;
    document.title = res.pageTitle;
  });
})();
//# sourceMappingURL=blank.js.map
