import {cloud} from "../cloud";
import {GLOBAL_SETTINGS_FILENAME} from "../def";

export type Options = {
    showNotAssignedClasses: boolean;
    showTableHeaders: boolean;
    markOtherAcademies: boolean;
    myAcademies: string;
    showDebug: boolean;
    stripCommasOnPaste: boolean;
    reorderStudentName: boolean;
};

export const options: Options = {
    myAcademies: "",
    showNotAssignedClasses: true,
    showTableHeaders: true,
    markOtherAcademies: true,
    showDebug: false,
    stripCommasOnPaste: false,
    reorderStudentName: false
};

export function defineHtmlOptions() {
    defineHtmlOption("showNotAssignedClasses", 'checked', "Toon arcering voor niet toegewezen klassikale lessen.", "block1");
    defineHtmlOption("showTableHeaders", 'checked', "Toon keuzemenus in tabelhoofding.", "block1");
    defineHtmlOption("stripCommasOnPaste", 'checked', "Strip commas when pasting in a search field.", "block1");
    defineHtmlOption("reorderStudentName", 'checked', "Toon naam leerling als voornaam + achternaam", "block1");
    defineHtmlOption("markOtherAcademies", 'checked', "Toon arcering voor 'andere' academies.", "block1");
    defineHtmlOption("myAcademies", 'value', undefined, undefined);
    defineHtmlOption("showDebug", 'checked', "Show debug info in console.", "block3");
}

type OptionDef = {
    id: string,
    property: string,
    label: string,
    blockId: string
}

export let htmlOptionDefs = new Map<string, OptionDef>();

export function defineHtmlOption(id: string, property: string, label: string, blockId: string) {
    htmlOptionDefs.set(id, {id, property, label, blockId});

}

export interface GlobalSettings {
    globalHide: boolean
}

export let globalSettings: GlobalSettings = {
    globalHide: false
}

export function getGlobalSettings() {
    return globalSettings;
}

export function setGlobalSetting(settings: GlobalSettings) {
    globalSettings = settings;
}

export async function saveGlobalSettings(globalSettings: GlobalSettings) {
    return cloud.json.upload(GLOBAL_SETTINGS_FILENAME, globalSettings);
}

export async function fetchGlobalSettings(defaultSettings: GlobalSettings) {
    return await cloud.json.fetch(GLOBAL_SETTINGS_FILENAME)
        .catch(err => {
            console.log(err);
            return defaultSettings;
        }) as GlobalSettings;
}

