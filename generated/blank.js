(() => {
  // typescript/blank.ts
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("button").addEventListener("click", async () => {
      console.log("sending message to parent tab:");
      await chrome.tabs.sendMessage(parentTabId, { brol: "zever" });
    });
  });
  chrome.runtime.onMessage.addListener(
    function(request, _sender, _sendResponse) {
      console.log("blank received: ");
      console.log(request);
    }
  );
  var parentTabId = -1;
  chrome.tabs.getCurrent((tab) => {
    console.log("Getting current tab: ", tab.id);
    chrome.runtime.sendMessage({ action: "get_tab_data" /* GetTabData */, tabId: tab.id }).then((res) => {
      console.log("tab opened: request data message sent and received: ");
      console.log(res);
      document.getElementById("container").innerHTML = res.data;
      document.title = res.pageTitle;
    });
  });
  console.log("blank.ts initialized");
})();
//# sourceMappingURL=blank.js.map
