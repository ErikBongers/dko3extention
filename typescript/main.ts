//to avoid "unused function" errors in linters, this file is called as a module.
import {clearPageTransientState, equals, getOptions, observers, registerObserver, settingsObservers} from "./globals";
import leerlingObserver from "./leerling/observer";
import lessenObserver from "./lessen/observer";
import lesObserver from "./les/observer";
import academieObserver from "./academie/observer";
import werklijstObserver from "./werklijst/observer";
import tableObserver from "./table/observer";
import vakgroepObserver from "./vakgroep/observer";
import smsObserver from "./verwittigen/observer";
import aanwezighedenObserver from "./aanwezigheden/observer";
import afwezighedenObserver from "./afwezigheden/observer";
import {setupPowerQuery} from "./powerQuery/setupPowerQuery";
import {academieMenuObserver, allLijstenObserver, assetsObserver, evaluatieObserver, extraInschrijvingenObserver, financialObserver} from "./pages/observer";
import {fetchGlobalSettings, getGlobalSettings, setGlobalSetting} from "./plugin_options/options";

init();

// noinspection JSUnusedGlobalSymbols
function init() {
    getOptions()
        .then(() => {
        // @ts-ignore
        chrome.storage.onChanged.addListener((_changes: any, area: string) => {
            if (area === 'sync') {
                getOptions().then(_r => {
                    onSettingsChanged();
                });
            }
        });

        // @ts-ignore
        window.navigation.addEventListener("navigatesuccess", () => {
            checkGlobalSettings();
            onPageChanged();
        });

        //do registrations here to get all these observers/pages into the same compilation unit.
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
        registerObserver(afwezighedenObserver);
        onPageChanged();
        setupPowerQuery();
        if(document.readyState == "complete") {
            console.log("document ready. firing onPageLoaded.");
            onPageLoaded();
        }
        else {
            window.addEventListener("load", () => {
                console.log("load event fired.");
                onPageLoaded();
            });
        }
    });
}

let lastCheckTime = Date.now();
function checkGlobalSettings() {
    if(Date.now() > (lastCheckTime+10*1000)) {
        lastCheckTime = Date.now();
        console.log("Re-fetching global settings.");
        fetchGlobalSettings(getGlobalSettings()).then(r => {
            if(!equals(getGlobalSettings(), r)) {
                setGlobalSetting(r);
                onSettingsChanged();
            }
        });
    }
}

function onSettingsChanged() {
    console.log("on settings changed.");
    for(let observer of settingsObservers) {
        observer();
    }
}

function onPageChanged() {
    if(getGlobalSettings().globalHide) {
        return;
    }
    clearPageTransientState();
    for(let observer of observers) {
        observer.onPageChanged();
    }
}

function onPageLoaded() {
    if(getGlobalSettings().globalHide) {
        return;
    }
    clearPageTransientState();
    for(let observer of observers) {
        observer.onPageLoaded();
    }
}

