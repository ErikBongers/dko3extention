import * as def from "./def";

export function clearGotoState() {
    sessionStorage.removeItem(def.STORAGE_GOTO_STATE_KEY);
}

export function saveGotoState(state: GotoState) {
    sessionStorage.setItem(def.STORAGE_GOTO_STATE_KEY, JSON.stringify(state));
}

export function getGotoState(): GotoState {
    return JSON.parse(sessionStorage.getItem(def.STORAGE_GOTO_STATE_KEY));
}

function defaultGotoState(pageName: PageName) {
    let pageState = <GotoState> {
        goto: Goto.None,
        pageName,
    };
    if (pageName === PageName.Werklijst) {
        return <WerklijstGotoState> { werklijstTableName: "", ...pageState };
    }
    return pageState;
}

export function getGotoStateOrDefault(pageName: PageName): GotoState {
    let pageState = JSON.parse(sessionStorage.getItem(def.STORAGE_GOTO_STATE_KEY));
    if (pageState?.pageName === pageName)
        return pageState;
    else
        return defaultGotoState(pageName);
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

export interface GotoState {
    pageName: PageName;
    goto: Goto;
}

export interface WerklijstGotoState extends GotoState {
    werklijstTableName: string;
}