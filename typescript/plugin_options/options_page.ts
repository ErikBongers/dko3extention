import {emmet} from "../../libs/Emmeter/html";
import {defineHtmlOptions, fetchGlobalSettings, getGlobalSettings, htmlOptionDefs, options, saveGlobalSettings} from "./options";

defineHtmlOptions();
document.body.addEventListener("keydown", onKeyDown);

function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "h" && ev.altKey && !ev.shiftKey && !ev.ctrlKey) {
        ev.preventDefault();
        let answer = prompt("Verberg plugin bij iedereen?");
        saveHide(answer === "hide")
            .then(() => saveOptionsFromGui());
    }
}

async function saveHide(hide: boolean) {
    let globalSettings = await fetchGlobalSettings(getGlobalSettings());
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

async function fillOptionsInGui() {
    for(let optiondDef of htmlOptionDefs.values()){
        if(!optiondDef.blockId)
            continue;
        let block = document.getElementById(optiondDef.blockId);
        emmet.appendChild(block, `label>input#${optiondDef.id}[type="checkbox"]+{${optiondDef.label}}`);
    }
    await restoreOptionsToGui();
}

document.addEventListener('DOMContentLoaded', fillOptionsInGui);
document.getElementById('save').addEventListener('click', saveOptionsFromGui);