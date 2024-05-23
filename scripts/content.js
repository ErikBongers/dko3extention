const debugDko3 = true;

function db3(message) {
    if (debugDko3) {
        console.log(message);
    }
}


(async () => {
    db3("setting up controller");
    const src = chrome.runtime.getURL('scripts/main.js');
    const mainScript = await import(src);

    window.navigation.addEventListener("navigatesuccess", (event) => {
        db3("navigateSuccess");
        pageListener();
    });

    window.addEventListener("load", (event) => {
        db3("loaded");
        pageListener();
    });

    function pageListener() {
        mainScript.onPageChanged();
    }

    pageListener();

})();



