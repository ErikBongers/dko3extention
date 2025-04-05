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
  var global_request = {};
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log("received ");
      console.log(request);
      switch (request.action) {
        //todo: make a shared type with content generated.
        case "open_tab" /* OpenTab */:
          let url = chrome.runtime.getURL("resources/blank.html");
          global_request = request;
          chrome.tabs.create({ url }).then((tab) => {
            console.log("tab created.");
          });
          break;
        case "get_tab_data" /* GetTabData */:
          console.log("getTabData:");
          sendResponse(global_request);
          break;
      }
    }
  );
})();
//# sourceMappingURL=serviceworker.js.map
