import {PageName} from "./gotoState";
import * as def from "./def";

export interface PageSettings {
    pageName: PageName
}

export function getPageSettings(pageName: PageName, defaultSettings: PageSettings): PageSettings {
    let storedState = localStorage.getItem(def.STORAGE_PAGE_SETTINGS_KEY_PREFIX + pageName);
    if (storedState) {
        return JSON.parse(storedState);
    }
    return defaultSettings;
}

export function savePageSettings(state: PageSettings) {
    localStorage.setItem(def.STORAGE_PAGE_SETTINGS_KEY_PREFIX + state.pageName, JSON.stringify(state));
}

export let pageState = {
    transient: {
        getValue: getPageTransientStateValue,
        setValue: setPageTransientStateValue,
        clear: clearPageTransientState,
    }
}

export let globalTransientPageState: Map<string, any> = new Map();
export function clearPageTransientState() {
    globalTransientPageState.clear();

}

export function setPageTransientStateValue(key: string, transientState: any) {
    globalTransientPageState.set(key, transientState);
    return transientState;

}

export function getPageTransientStateValue(key: string, defaultValue: any) {
    let value = globalTransientPageState.get(key);
    return value ? value : setPageTransientStateValue(key, defaultValue);

}
