import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {fetchAndDisplayNotifications} from "../notifications/notifications";
import {checkChecks} from "../notifications/checks";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, StartPageGotoState, WerklijstGotoState} from "../gotoState";
import {pageState} from "../pageState";

class StartPageObserver extends ExactHashObserver {
    constructor() {
        super("#start-mijn_tijdslijn", onMutation);
    }

    isPageReallyLoaded(): boolean {
        return isLoaded();
    }
}

export default new StartPageObserver();

function isLoaded() {
    let startContentDiv = document.querySelector("#dko3_start_content") as HTMLDivElement;
    return startContentDiv?.textContent.includes("welkom") ?? false;
}

function onMutation(mutation: MutationRecord) {
    if (document.querySelector("#dko3_plugin_notifications"))
        return true;

    setupPluginPage();
    let startContentDiv = document.querySelector("#dko3_start_content") as HTMLDivElement;
    if (startContentDiv) {
        if (startContentDiv.textContent.includes("welkom")) {
            emmet.insertAfter(startContentDiv.children[0], "div#dko3_plugin_notifications>div.alert.alert-info.shadow-sm>(h5>strong{Plugin berichten})+div");
            doStartupStuff().then(() => {}); //no wait needed.
        }
        return true;
    }
    return false;
}

async function doStartupStuff() {
    await fetchAndDisplayNotifications();
    await checkChecks();
}

function setupPluginPage() {
    let pluginContainer = document.getElementById("plugin_container");
    if(!pluginContainer) {
        let viewContent = document.getElementById("view_contents");
        if(!viewContent)
            return;
        emmet.appendChild(viewContent, "div#plugin_container>div.row.mb-1>div.col-7>h4{Tadaaaa!}");
    }
    let pageState = getGotoStateOrDefault(PageName.StartPage) as StartPageGotoState;
    if (pageState.showPage == "start") {
        // pageState.goto = Goto.None;
        // saveGotoState(pageState);
        document.body.classList.toggle("showPluginPage", false);
        return;
    }
    if (pageState.showPage == "diff") {
        // pageState.goto = Goto.None;
        // saveGotoState(pageState);
        document.body.classList.toggle("showPluginPage", true);
        return;
    }
    // pageState.goto = Goto.None;
    saveGotoState(pageState);

}