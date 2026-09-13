// src/import-wrapper.ts
(async () => {
    // Dynamically pull your true compiled content script into an ESM context!
    await import(chrome.runtime.getURL('generated/bundle.js'));
})();
