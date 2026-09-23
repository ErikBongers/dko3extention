const DP3_CHECK_DELAY = 350; // Milliseconds to wait for another script to drop in
let dp3_cascadeTimeout = null;

function dp3_hookJqueryReady() {
    if (!window.jQuery) {
        setTimeout(dp3_hookJqueryReady, 10);
        return;
    }

    const $ = window.jQuery;
    const originalReady = $.fn.ready;

    $.fn.ready = function (fn) {
        if (dp3_cascadeTimeout)
            clearTimeout(dp3_cascadeTimeout);
        const result = originalReady.apply(this, arguments);
        dp3_cascadeTimeout = setTimeout(() => {
            window.dispatchEvent(new CustomEvent("SPA_JQUERY_CASCADE_DONE"));
        }, DP3_CHECK_DELAY);

        return result;
    };
    sessionStorage.setItem("dp3_jQueryReadyHookInstalled", "true");
    console.log("hook installed");
}

dp3_hookJqueryReady();

