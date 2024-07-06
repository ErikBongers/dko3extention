//to avoid "unused function" errors in linters, this file is called as a module.
import { observers, options, registerObserver } from "./globals.js";
import leerlingObserver from "./leerling/observer.js";
import lessenObserver from "./lessen/observer.js";
import academieObserver from "./academie/observer.js";
import werklijstObserver from "./werklijst/observer.js";
import tableObserver from "./table/observer.js";
import { setupPowerQuery } from "./setupPowerQuery.js";
import { allLijstenObserver, extraInschrijvingenObserver, financialObserver } from "./pages/observer.js";
// noinspection JSUnusedGlobalSymbols
export function init() {
    getOptions(() => {
        // @ts-ignore
        chrome.storage.onChanged.addListener((_changes, area) => {
            if (area === 'sync') {
                getOptions();
            }
        });
        // @ts-ignore
        window.navigation.addEventListener("navigatesuccess", () => {
            onPageChanged();
        });
        window.addEventListener("load", () => {
            onPageChanged();
        });
        registerObserver(leerlingObserver);
        registerObserver(lessenObserver);
        registerObserver(academieObserver);
        registerObserver(werklijstObserver);
        registerObserver(tableObserver);
        registerObserver(extraInschrijvingenObserver);
        registerObserver(allLijstenObserver);
        registerObserver(financialObserver);
        onPageChanged();
        setupPowerQuery();
    });
}
export function onPageChanged() {
    for (let observer of observers) {
        observer.onPageChanged();
    }
}
function getOptions(callback) {
    // @ts-ignore
    chrome.storage.sync.get(null, //get all
    (items) => {
        // @ts-ignore
        Object.assign(options, items);
        callback();
    });
}
//# sourceMappingURL=main.js.map