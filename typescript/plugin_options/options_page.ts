import {fetchGlobalSettings, GlobalSettings, options, saveGlobalSettings} from "../globals";
import {emmet} from "../../libs/Emmeter/html";

type OptionDef = {
    id: string,
    property: string,
    label: string,
    blockId: string
}

let htmlOptionDefs = new Map<string,  OptionDef>();

defineHtmlOption("showDebug", 'checked', "Show debug info in console.",  "block1");
defineHtmlOption("showNotAssignedClasses", 'checked', "Toon arcering voor niet toegewezen klassikale lessen.",  "block1");
defineHtmlOption("showTableHeaders", 'checked', "Toon keuzemenus in tabelhoofding.",  "block1");
defineHtmlOption("markOtherAcademies", 'checked', "Toon arcering voor 'andere' academies.",  "block1");
defineHtmlOption("myAcademies", 'value', undefined, undefined);

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

function defineHtmlOption(id: string, property: string, label: string,  blockId: string) {
    htmlOptionDefs.set(id, {id, property,  label, blockId});
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