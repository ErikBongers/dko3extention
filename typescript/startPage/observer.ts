import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {fetchAndDisplayNotifications} from "../notifications/notifications";
import {checkChecks} from "../notifications/checks";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, StartPageGotoState} from "../gotoState";
import {cloud, fetchExcelData, fetchFolderChanged} from "../cloud";
import runRosterCheck, {buildAndSaveDiff, createJsonDiffs, getDiffsCloudFileName, getDiffsFromCloud} from "../roster_diff/buildDiff";
import {createInfoBlock} from "../infoBlock";
import {InfoBarTableFetchListener} from "../table/loadAnyTable";
import {showDiffs} from "../roster_diff/showDiff";
import {JsonExcelData} from "../roster_diff/excel";

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

    if(document.querySelector("#view_contents>div.row"))
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
    if (pluginContainer)
        return;
    let viewContent = document.getElementById("view_contents");
    if (!viewContent)
        return;

    emmet.appendChild(viewContent, "div#plugin_container");

    let pageState = getGotoStateOrDefault(PageName.StartPage) as StartPageGotoState;
    if(pageState.goto == Goto.Start_page) {
        if (pageState.showPage == "start") {
            pageState.goto = Goto.None;
            saveGotoState(pageState);
            return;
        }
        if (pageState.showPage == "diff") {
            pageState.goto = Goto.None;
            saveGotoState(pageState);
            let viewContent = document.getElementById("view_contents");
            emmet.insertBefore(viewContent.firstElementChild, "div.hide_view_contents");
            setupDiffPage();
            return;
        }
    }
    pageState.goto = Goto.None;
    saveGotoState(pageState);

}

export type StatusCallback = (message: string) => void;

async function runDiff(reportStatus: StatusCallback, fetchListener: InfoBarTableFetchListener) {
    let divResults = document.getElementById("diffResults") as HTMLDivElement;
    divResults.innerHTML = "";

    return buildAndSaveDiff(reportStatus, fetchListener);
}

async function setupDiffPage() {
    let pluginContainer = document.getElementById("plugin_container");
    let button = emmet.appendChild(pluginContainer, "div.mb-1>div>(h4{Verschillen tussen Excel uurroosters en DKO3 lessen.}+button{Run the diffs!})").last as HTMLButtonElement;
    let runStatus = emmet.insertAfter(button, "div#runStatus").first as HTMLDivElement;
    let results = emmet.insertAfter(runStatus, "div#diffResults").first as HTMLDivElement;

    let divInfo = emmet.insertAfter(runStatus, 'dinv').last as HTMLDivElement;
    let infoBlock = createInfoBlock(divInfo, "");
    let fetchListener = new InfoBarTableFetchListener(infoBlock);
    let messages: string[] = [];
    function reportStatus(message: string) {
        messages.push(message);
        runStatus.innerHTML = messages.join("<br>");
    }
    button.onclick = async () => {
        let jsonDiffs = await runDiff(reportStatus, fetchListener);
        showDiffs(jsonDiffs);
    };
    try {
        let jsonDiffs = await getDiffsFromCloud();
        showDiffs(jsonDiffs);
    }
    catch (e) {}
}


