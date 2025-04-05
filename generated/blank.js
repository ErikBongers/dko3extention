(() => {
  // typescript/blank.ts
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      console.log("blank received: ");
      console.log(request);
    }
  );
  chrome.tabs.getCurrent((tab) => {
    chrome.runtime.sendMessage({ action: "get_tab_data", tabId: tab.id }).then((res) => {
      console.log("tab opened: request data message sent and received: ");
      console.log(res);
      document.body.innerHTML = res.data;
      document.title = res.pageTitle;
    });
  });
})();
//# sourceMappingURL=blank.js.map
