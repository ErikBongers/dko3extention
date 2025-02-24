//to avoid "unused function" errors in linters, this file is called as a module.
import {observers, options, registerObserver} from "./globals";
import leerlingObserver from "./leerling/observer";
import lessenObserver from "./lessen/observer";
import lesObserver from "./les/observer";
import academieObserver from "./academie/observer";
import werklijstObserver from "./werklijst/observer";
import tableObserver from "./table/observer";
import vakgroepObserver from "./vakgroep/observer";
import smsObserver from "./verwittigen/observer";
import aanwezighedenObserver from "./aanwezigheden/observer";
import {setupPowerQuery} from "./setupPowerQuery";
import {allLijstenObserver, assetsObserver, extraInschrijvingenObserver, financialObserver, academieMenuObserver, evaluatieObserver} from "./pages/observer";

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
        registerObserver(evaluatieObserver);
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

