import * as def from "./def";

export function clearPageState() {
    sessionStorage.removeItem(def.STORAGE_PAGE_STATE_KEY);
}

export function savePageState(state: PageState) {
    sessionStorage.setItem(def.STORAGE_PAGE_STATE_KEY, JSON.stringify(state));
}

export function getPageState(): PageState {
    return JSON.parse(sessionStorage.getItem(def.STORAGE_PAGE_STATE_KEY));
}

function defaultPageState(pageName: PageName) {
    if (pageName === PageName.Werklijst) {
        let werklijstPageState: WerklijstPageState = {
            goto: Goto.None,
            pageName: PageName.Werklijst,
            werklijstTableName: ""
        }
        return werklijstPageState;
    }
    return undefined;
}

export function getPageStateOrDefault(pageName: PageName): PageState {
    let pageState = JSON.parse(sessionStorage.getItem(def.STORAGE_PAGE_STATE_KEY));
    if (pageState?.pageName === pageName)
        return pageState;
    else
        return defaultPageState(pageName);
}

export enum PageName {
    Werklijst = "Werklijst",
}

export enum Goto {
    None = "",
    Werklijst_uren_nextYear = "Werklijst_uren_nextYear",
    Werklijst_uren_prevYear = "Werklijst_uren_prevYear",
}

export interface PageState {
    pageName: PageName;
    goto: Goto;
}

export interface WerklijstPageState extends PageState {
    werklijstTableName: string;
}