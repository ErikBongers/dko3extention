window.onload = ev => {
    console.log("blank loaded");
    chrome.storage.session.get(["blank_html"]).then(result => {
        document.querySelector("body").innerHTML = result.blank_html
    });
}

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("blank received: ");
        console.log(request);
        if(request.action === "setBackground") document.body.style.background = "red";
        document.body.innerHTML = request.data;
    });

console.log("blank.js loaded in tab...");
chrome.tabs.getCurrent(tab => {
    console.log(tab.id);
    chrome.runtime.sendMessage({ action: "getTabData", tabId: tab.id })
        .then(() => console.log("tab opened: request data message sent."));
});