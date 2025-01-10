//to avoid "unused function" errors in linters, this file is called as a module.
import {observers, options, registerObserver} from "./globals.js";
import leerlingObserver from "./leerling/observer.js";
import lessenObserver from "./lessen/observer.js";
import lesObserver from "./les/observer.js";
import academieObserver from "./academie/observer.js";
import werklijstObserver from "./werklijst/observer.js";
import tableObserver from "./table/observer.js";
import vakgroepObserver from "./vakgroep/observer.js";
import smsObserver from "./verwittigen/observer.js";
import aanwezighedenObserver from "./aanwezigheden/observer.js";
import {setupPowerQuery} from "./setupPowerQuery.js";
import {allLijstenObserver, assetsObserver, extraInschrijvingenObserver, financialObserver, academieMenuObserver} from "./pages/observer.js";

init();

// noinspection JSUnusedGlobalSymbols
function init() {
    getOptions(() => {
        // @ts-ignore
        chrome.storage.onChanged.addListener((_changes: any, area: string) => {
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
        registerObserver(lesObserver);
        registerObserver(academieObserver);
        registerObserver(werklijstObserver);
        registerObserver(tableObserver);
        registerObserver(extraInschrijvingenObserver);
        registerObserver(allLijstenObserver);
        registerObserver(financialObserver);
        registerObserver(assetsObserver);
        registerObserver(vakgroepObserver);
        registerObserver(smsObserver);
        registerObserver(academieMenuObserver);
        registerObserver(aanwezighedenObserver);
        onPageChanged();
        setupPowerQuery();
    });
}

export function onPageChanged() {
    // clearPageState();
    for(let observer of observers) {
        observer.onPageChanged();
    }
}

function getOptions(callback?: () => void) {
    // @ts-ignore
    chrome.storage.sync.get(
        null, //get all
        (items: any) => {
            // @ts-ignore
            Object.assign(options, items);
            callback?.();
        }
    );
}

