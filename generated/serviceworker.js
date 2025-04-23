(() => {
  // typescript/serviceworker.ts
  var defaultOptions = {
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
  var hoursSetupTabId = -1;
  function onMessage(message, sender, sendResponse) {
    console.log("serviceWorker received message from tab:", sender.tab?.id ?? "<no tab>");
    console.log(message);
    switch (message.action) {
      case "open_tab" /* OpenTab */:
        let url = chrome.runtime.getURL("resources/blank.html");
        global_request = message;
        if (message.senderTab === 1 /* Main */)
          mainTabId = sender.tab.id;
        chrome.tabs.create({ url }).then((_tab) => {
          sendResponse({ tabId: _tab.id });
        });
        return true;
      case "open_hours_settings" /* OpenHoursSettings */:
        global_request = message;
        mainTabId = sender.tab.id;
        chrome.tabs.create({ url: chrome.runtime.getURL("resources/blank.html") }).then((tab) => {
          hoursSetupTabId = tab.id;
          sendResponse({ tabId: tab.id });
        });
        return true;
      //needed because sendResponse is called asynchronously.
      case "get_tab_data" /* GetTabData */:
        console.log("getTabData:");
        sendResponse(global_request);
        break;
      case "get_parent_tab_id" /* GetParentTabId */:
        sendResponse(mainTabId);
        break;
      case "greetings" /* GreetingsFromParent */:
        console.log("passing greetings from parent to tab");
        let targetTabId;
        if (message.targetTab === 2 /* HoursSettings */)
          targetTabId = hoursSetupTabId;
        chrome.tabs.sendMessage(hoursSetupTabId, message).then((r) => {
        });
        break;
    }
  }
})();
//# sourceMappingURL=serviceworker.js.map
