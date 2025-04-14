import {fetchGlobalSettings, GlobalSettings, options, saveGlobalSettings} from "../globals";

let htmlOptionDefs = new Map();

defineHtmlOption("showDebug", 'checked');
defineHtmlOption("showNotAssignedClasses", 'checked');
defineHtmlOption("showTableHeaders", 'checked');
defineHtmlOption("markOtherAcademies", 'checked');
defineHtmlOption("myAcademies", 'value');

document.body.addEventListener("keydown", onKeyDown);

let globalSettings: GlobalSettings = {
    globalHide: false
}

function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "h" && ev.altKey && !ev.shiftKey && !ev.ctrlKey) {
        ev.preventDefault();
        let answer = prompt("Verberg plugin bij iedereen?");
        saveHide(answer === "hide")
            .then(() => saveOptionsFromGui());
    }
}

async function saveHide(hide: boolean) {
    globalSettings = await fetchGlobalSettings(globalSettings);
    globalSettings.globalHide = hide;
    await saveGlobalSettings(globalSettings);
    console.log("Global settings saved.");
}

const saveOptionsFromGui = () => {
    let newOptions = {
        touched: Date.now() // needed to trigger the storage changed event.
    };
    for (let option of htmlOptionDefs.values()) {
        newOptions[option.id] = document.getElementById(option.id)[option.property];

    }
    // @ts-ignore
    chrome.storage.sync.set(
        newOptions, () => {
            // Update status to let user know options were saved.
            const status = document.getElementById('status');
            status.textContent = 'Opties bewaard.';
            setTimeout(() => {
                status.textContent = '';
            }, 750);
        }
    );

};

function defineHtmlOption(id: string, property: string) {
    htmlOptionDefs.set(id, {id: id, property: property});
}

async function restoreOptionsToGui(){
    let items = await chrome.storage.sync.get(null); //get all
    Object.assign(options, items);
    for (const [key, value] of Object.entries(options)) {
        let optionDef = htmlOptionDefs.get(key);
        if(!optionDef)
            continue; //no GUI for this option.
        document.getElementById(optionDef.id)[optionDef.property] = value;
    }
}

document.addEventListener('DOMContentLoaded', restoreOptionsToGui);
document.getElementById('save').addEventListener('click', saveOptionsFromGui);