(() => {
  // typescript/serviceworker.ts
  var defaultOptions = {
    //todo: integrate in options.ts.
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
          { ...defaultOptions, ...items },
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
  var global_request = {};
  chrome.runtime.onMessage.addListener(onMessage);
  var mainTabId = -1;
  function onMessage(message, sender, sendResponse) {
    switch (message.action) {
      case "open_tab" /* OpenHtmlTab */:
        let url = chrome.runtime.getURL("resources/blank.html");
        global_request = message;
        if (message.senderTabType === 1 /* Main */)
          mainTabId = sender.tab.id;
        chrome.tabs.create({ url }).then((_tab) => {
          sendResponse({ tabId: _tab.id });
        });
        return true;
      case "open_hours_settings" /* OpenHoursSettings */:
        global_request = message;
        mainTabId = sender.tab.id;
        chrome.tabs.create({ url: chrome.runtime.getURL("resources/teacherHoursSetup.html") }).then((tab) => {
          sendResponse({ tabId: tab.id });
        });
        return true;
      //needed because sendResponse is called asynchronously.
      case "get_tab_data" /* GetTabData */:
        sendResponse(global_request);
        break;
      case "get_parent_tab_id" /* GetParentTabId */:
        sendResponse(mainTabId);
        break;
      case "greetingsFromChild" /* GreetingsFromChild */: {
        let targetTabId;
        if (message.targetTabType === 1 /* Main */)
          targetTabId = mainTabId;
        chrome.tabs.sendMessage(targetTabId, message).then((r) => {
        });
        break;
      }
    }
  }
})();
//# sourceMappingURL=serviceworker.js.map
