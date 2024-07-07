import * as def from "./def.js";
export function clearPageState() {
    sessionStorage.removeItem(def.STORAGE_PAGE_STATE_KEY);
}
export function savePageState(state) {
    sessionStorage.setItem(def.STORAGE_PAGE_STATE_KEY, JSON.stringify(state));
}
export function getPageState() {
    return JSON.parse(sessionStorage.getItem(def.STORAGE_PAGE_STATE_KEY));
}
function defaultPageState(pageName) {
    if (pageName === PageName.Werklijst) {
        let werklijstPageState = {
            goto: Goto.None,
            pageName: PageName.Werklijst,
            werklijstTableName: ""
        };
        return werklijstPageState;
    }
    return undefined;
}
export function getPageStateOrDefault(pageName) {
    let pageState = JSON.parse(sessionStorage.getItem(def.STORAGE_PAGE_STATE_KEY));
    if (pageState?.pageName === pageName)
        return pageState;
    else
        return defaultPageState(pageName);
}
export var PageName;
(function (PageName) {
    PageName["Werklijst"] = "Werklijst";
})(PageName || (PageName = {}));
export var Goto;
(function (Goto) {
    Goto["None"] = "";
    Goto["Werklijst_uren"] = "Werklijst_uren";
})(Goto || (Goto = {}));
//# sourceMappingURL=pageState.js.map