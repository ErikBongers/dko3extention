import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {fetchAndDisplayNotifications} from "../notifications/notifications";
import {checkChecks} from "../notifications/checks";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, StartPageGotoState} from "../gotoState";
import {fetchExcelData, fetchFolderChanged} from "../cloud";
import {Diff, runRosterCheck, TaggedDko3Les, TaggedExcelLes} from "../roster_diff/build";

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

type StatusCallback = (message: string) => void;

async function runDiff(reportStatus: StatusCallback) {
    reportStatus("Excel bestanden ophalen...");
    let folderChanged = await fetchFolderChanged("Dko3/Uurroosters/");
    reportStatus(`${folderChanged.files.length} Excel bestanden gevonden.`);
    for (let file of folderChanged.files) {
        let fileShortName = file.name.replaceAll("Dko3/Uurroosters/", "");
        reportStatus(`Inlezen van ${fileShortName}...`);
        let excelData = await fetchExcelData(file.name);
        reportStatus(`Vergelijken van ${fileShortName} met DKO3 lessen...`);
        let res = await runRosterCheck(excelData);
        showDiffs(res.diffs, res.dko3LesSet, res.excelLesSet);
    }
    reportStatus(`Vergelijking beeindigd.`);
}

function setupDiffPage() {
    let pluginContainer = document.getElementById("plugin_container");
    let button = emmet.appendChild(pluginContainer, "div.row.mb-1>div.col-7>(h4{Verschillen tussen Excel uurroosters en DKO3 lessen.}+button{Run the diffs!})").last as HTMLButtonElement;
    let results = emmet.insertAfter(button, "div").first as HTMLDivElement;
    let messages: string[] = [];
    function reportStatus(message: string) {
        messages.push(message);
        results.innerHTML = messages.join("<br>");
    }
    button.onclick = async () => {
        await runDiff(reportStatus);
    };
}

function showDiffs(diffs: Diff[], dko3LesSet: Set<TaggedDko3Les>, excelLesSet: Set<TaggedExcelLes>) {

}
