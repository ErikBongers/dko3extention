import {fetchGlobalSettings, GlobalSettings, saveGlobalSettings} from "../globals";

let optionDefs = new Map();

defineOption("showDebug", 'checked');
defineOption("showNotAssignedClasses", 'checked');
defineOption("markOtherAcademies", 'checked');
defineOption("myAcademies", 'value');

document.body.addEventListener("keydown", onKeyDown);

let globalSettings: GlobalSettings = {
    globalHide: false
}

function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "h" && ev.altKey && !ev.shiftKey && !ev.ctrlKey) {
        ev.preventDefault();
        let answer = prompt("Verberg plugin bij iedereen?");
        saveHide(answer === "hide")
            .then(() => saveOptions());
    }
}

async function saveHide(hide: boolean) {
    globalSettings = await fetchGlobalSettings(globalSettings);
    globalSettings.globalHide = hide;
    await saveGlobalSettings(globalSettings);
    console.log("Global settings saved.");
}

const saveOptions = () => {
    let newOptions = {
        touched: Date.now() // needed to trigger the storage changed event.
    };
    for (let option of optionDefs.values()) {
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

function defineOption(id, property) {
    optionDefs.set(id, {id: id, property: property});
}

const restoreOptions = () => {
    // @ts-ignore
    chrome.storage.sync.get(
        null, //get all
        (items) => {
            for (const [key, value] of Object.entries(items)) {
                let optionDef = optionDefs.get(key);
                if(!optionDef) {
                    console.error(`No option definition "${key}".`);
                    continue;
                }
                document.getElementById(optionDef.id)[optionDef.property] = value;
            }
        }
    );
};

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);