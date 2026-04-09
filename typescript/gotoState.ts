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
    if (pageName === PageName.Werklijst) { //todo: try to force a default state instead of these if statements.
        return { werklijstTableName: "", ...pageState } satisfies WerklijstGotoState;
    }
    if (pageName === PageName.StartPage) {
        return { showPage: "start", ...pageState } satisfies StartPageGotoState;
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
    StartPage = "Start",
}

export enum Goto {
    None = "",
    Werklijst_uren_nextYear = "Werklijst_uren_nextYear", //todo: separate the actual page (hash) from the sub-page details - see start page
    Werklijst_uren_prevYear = "Werklijst_uren_prevYear",
    Lessen_trimesters_set_filter = "Lessen_trimesters_set_filter",
    Lessen_trimesters_show = "Lessen_trimesters_show",
    Start_page = "Start_page",
}

export interface GotoState {
    pageName: PageName;
    goto: Goto;
}

export interface WerklijstGotoState extends GotoState {
    werklijstTableName: string;
}

export type StartPageName = "start" | "diff";

export interface StartPageGotoState extends GotoState {
    showPage: StartPageName;
}