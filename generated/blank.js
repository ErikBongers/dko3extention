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
    let handler2 = {
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
      onData: function(callback) {
        this._onData = callback;
        return this;
      },
      _onMessageForMyTabType: void 0,
      _onMessageForMe: void 0,
      _onData: void 0
    };
    document.addEventListener("DOMContentLoaded", async () => {
      let res = await sendGetDataRequest(tabType);
      handler2._onData?.(res);
    });
    return handler2;
  }

  // typescript/blank.ts
  var handler = createMessageHandler(3 /* Html */);
  chrome.runtime.onMessage.addListener(handler.getListener());
  handler.onMessageForMyTabType((msg) => {
    console.log("message for my tab type: ", msg);
    document.getElementById("container").innerHTML = "Message was for my tab type" + msg.data;
  }).onMessageForMe((msg) => {
    console.log("message for me: ", msg);
    document.getElementById("container").innerHTML = "DATA:" + msg.data;
  }).onData((data) => {
    document.querySelector("button").addEventListener("click", async () => {
      await sendRequest("greetingsFromChild" /* GreetingsFromChild */, 0 /* Undefined */, 1 /* Main */, void 0, "Hullo! Fly safe!");
    });
    console.log("tab opened: request data message sent and received: ");
    console.log(data);
    document.getElementById("container").innerHTML = "Dataxxxx:" + data.data;
    document.title = data.pageTitle;
  });
})();
//# sourceMappingURL=blank.js.map
