let defaultOptions = {
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
                {...defaultOptions, ...items},
                () => {
                    console.log("Options initialized");
                }
            );
        }
    );

});

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("received ");
        console.log(request);
        switch (request.action) { //todo: make a shared type with content generated.
            case "hello":
                sendResponse({farewell: "goodbye"});
                break;
            case "open_tab":
                let url = chrome.runtime.getURL("resources/blank.html");
                chrome.storage.session.set({ blank_html: request.data})
                    .then(() => {
                        console.log("Opening " + url);
                        chrome.tabs.create({url}).then(tab => {
                            console.log("tab created.");
                        });
                    });
                break;
            case "getTabData":
                console.log("Sending tab data to tab " + request.tabId);
                chrome.tabs.sendMessage(request.tabId, {data: "Some data!!!", action: "setBackground"}).then(r => {});
                break;
        }
    }
);
