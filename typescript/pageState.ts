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
    let pageState = <PageState> {
        goto: Goto.None,
        pageName,
    };
    if (pageName === PageName.Werklijst) {
        return <WerklijstPageState> { werklijstTableName: "", ...pageState };
    }
    return pageState;
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
    Lessen = "Lessen",
}

export enum Goto {
    None = "",
    Werklijst_uren_nextYear = "Werklijst_uren_nextYear",
    Werklijst_uren_prevYear = "Werklijst_uren_prevYear",
    Lessen_trimesters_set_filter = "Lessen_trimesters_set_filter",
    Lessen_trimesters_show = "Lessen_trimesters_show",
}

export interface PageState {
    pageName: PageName;
    goto: Goto;
}

export interface WerklijstPageState extends PageState {
    werklijstTableName: string;
}