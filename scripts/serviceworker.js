let defaultOptions = {
    showDebug: true,
    test: "yes"
};

chrome.runtime.onInstalled.addListener(() => {
    console.log("installed.");
    chrome.storage.sync.get(
        defaultOptions,
        (items) => {
            chrome.storage.sync.set(
                items,
                () => {
                    console.log("Options initialized");
                }
            );
        }
    );

})