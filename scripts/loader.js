(async () => {
    const src = chrome.runtime.getURL('scripts/ts/main.js');
    const mainScript = await import(src);

    // noinspection JSUnresolvedReference
    mainScript.init();

})();






