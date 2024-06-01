(async () => {
    const src = chrome.runtime.getURL('scripts/main.js');
    const mainScript = await import(src);

    // noinspection JSUnresolvedReference
    mainScript.init();

})();






