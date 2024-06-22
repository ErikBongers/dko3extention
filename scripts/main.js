//to avoid "unused function" errors in linters, this file is called as a module.
import {options, db3, observers, registerObserver} from "./globals.js";
import leerlingObserver from "./leerling/observer.js";
import lessenObserver from "./lessen/observer.js";
import academieObserver from "./academie/observer.js";
import werklijstObserver from "./werklijst/observer.js";

// noinspection JSUnusedGlobalSymbols
export function init() {
    getOptions(() => {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync') {
                getOptions();
            }
        });

        // noinspection JSDeprecatedSymbols
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
        onPageChanged();
    });
}

export function onPageChanged() {
    for(let observer of observers) {
        observer.onPageChanged();
    }
}

function getOptions(callback) {
    chrome.storage.sync.get(
        null, //get all
        (items) => {
            Object.assign(options, items);
            callback();
        }
    );
}
