//to avoid "unused function" errors in linters, this file is called as a module.
import * as lessen from "./lessen/setup.js";
import * as leerling from "./leerling/setup.js";
import {options, db3, observers} from "./globals.js";

export function init() {
    getOptions(() => {
        db3("setting up controller");

        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync') {
                db3('options changed!');
                db3(changes);
                getOptions();
            }
        });

        window.navigation.addEventListener("navigatesuccess", () => {
            db3("navigateSuccess");
            onPageChanged();
        });

        window.addEventListener("load", () => {
            db3("loaded");
            onPageChanged();
        });

        onPageChanged();
    });
}

export function onPageChanged() {
    for(let observer of observers) {
        observer.onPageChanged();
    }
    setSchoolBackground();
}

function getOptions(callback) {
    chrome.storage.sync.get(
        null, //get all
        (items) => {
            Object.assign(options, items);
            db3("OPTIONS:");
            db3(options);
            callback();
        }
    );
}

function setSchoolBackground () {
    let footer = document.querySelector("body > main > div.row > div.col-auto.mr-auto > small");
    const reInstrument = /.*Je bent aangemeld als (.*)\s@\s(.*)\./;
    const match =  footer.textContent.match(reInstrument);
    if (match?.length !== 3) {
        console.error(`Could not process footer text "${footer.textContent}"`);
        return;
    }
    let userName = match[1];
    let schoolName = match[2];
    db3("user:" + userName);
    db3("school:" + schoolName);
    if (schoolName !== "Academie Berchem (Muziek-Woord)") {
        document.body.classList.add("otherSchool");
    } else {
        document.body.classList.remove("otherSchool");
    }
}