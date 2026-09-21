(function () {
    const CHECK_DELAY = 350; // Milliseconds to wait for another script to drop in
    let cascadeTimeout = null;

    function hookJqueryReady() {
        if (!window.jQuery) {
            setTimeout(hookJqueryReady, 10);
            return;
        }

        const $ = window.jQuery;
        const originalReady = $.fn.ready;

        $.fn.ready = function (fn) {
            if (cascadeTimeout)
                clearTimeout(cascadeTimeout);
            const result = originalReady.apply(this, arguments);
            cascadeTimeout = setTimeout(() => {
                window.dispatchEvent(new CustomEvent("SPA_JQUERY_CASCADE_DONE"));
            }, CHECK_DELAY);

            return result;
        };
    }

    hookJqueryReady();
})();
