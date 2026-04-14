import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {fetchAndDisplayNotifications} from "../notifications/notifications";
import {checkChecks} from "../notifications/checks";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, StartPageGotoState} from "../gotoState";
import {buildAndSaveDiff, getDiffsFromCloud} from "../roster_diff/buildDiff";
import {createInfoBlock} from "../infoBlock";
import {InfoBarTableFetchListener} from "../table/loadAnyTable";
import {showDiffs} from "../roster_diff/showDiff";
import {fetchFolderContent} from "../cloud";
import {getUserAndSchoolName} from "../globals";

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

async function setupPluginPage() {
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
            await setupDiffPage();
            return;
        }
    }
    pageState.goto = Goto.None;
    saveGotoState(pageState);

}

export type StatusCallback = (message: string, isError?: "error") => void;

async function runDiff(reportStatus: StatusCallback, fetchListener: InfoBarTableFetchListener, academie: string, schoolYear: string) {
    let divResults = document.getElementById("diffResults") as HTMLDivElement;
    divResults.innerHTML = "";

    return buildAndSaveDiff(reportStatus, fetchListener, academie, schoolYear);
}

async function setupDiffPage() {
    let pluginContainer = document.getElementById("plugin_container");
    let button = emmet.appendChild(pluginContainer, "div.mb-1>div>(h4{Verschillen tussen Excel uurroosters en DKO3 lessen.}+(div#combosLoading{Gegevens laden...}+select#cmbDiffAcademie+select#cmbDiffSchoolYear+button.btn.btn-primary{Zoek verschillen}))").last as HTMLButtonElement;
    let dirTree = await getDiffDirStructure();
    let myAcadFolderName = getDiffMyAcademieFolder(dirTree);
    let academies = getAcademies(dirTree);
    let cmbDiffAcademie = pluginContainer.querySelector("#cmbDiffAcademie") as HTMLSelectElement;
    cmbDiffAcademie.innerHTML = academies.map(name => `<option value="${name}">${name}</option>`).join("");
    cmbDiffAcademie.value = myAcadFolderName;
    let schoolYears = [...dirTree.nodes.get(myAcadFolderName).nodes.values()].map(n => n.folderName);
    let cmbDiffSchoolYear = pluginContainer.querySelector("#cmbDiffSchoolYear") as HTMLSelectElement;
    cmbDiffSchoolYear.innerHTML = schoolYears.map(schoolYear => `<option value="${schoolYear}">${schoolYear}</option>`).join("");
    if(schoolYears.length == 1)
        cmbDiffSchoolYear.value = schoolYears[0];
    pluginContainer.classList.toggle("diffCombosLoaded", true);
    let runStatus = emmet.insertAfter(button, "div#runStatus").first as HTMLDivElement;
    emmet.insertAfter(runStatus, "div#diffResults");

    let divInfo = emmet.insertAfter(runStatus, 'div').last as HTMLDivElement;
    let divError = emmet.insertAfter(divInfo, 'div.errors').last as HTMLDivElement;
    let infoBlock = createInfoBlock(divInfo, "");
    let fetchListener = new InfoBarTableFetchListener(infoBlock);
    let errors: string[] = [];
    function reportStatus(message: string, isError?: "error") {
        if(isError == "error")
            errors.push(message);
        else
            runStatus.innerHTML = message;
        divError.innerHTML = errors.join("<br>");
    }
    button.onclick = async () => {
        errors = [];
        let jsonDiffs = await runDiff(reportStatus, fetchListener, cmbDiffAcademie.value, cmbDiffSchoolYear.value);
        await  showDiffs(jsonDiffs, cmbDiffAcademie.value, cmbDiffSchoolYear.value);
    };
    cmbDiffAcademie.onchange = async () => {
        await showDiffsFromComboboxes();
    }
    await showDiffsFromComboboxes();
}

async function showDiffsFromComboboxes() {
    let cmbDiffAcademie = document.querySelector("#cmbDiffAcademie") as HTMLSelectElement;
    let cmbDiffSchoolYear = document.querySelector("#cmbDiffSchoolYear") as HTMLSelectElement;
    try {
        let jsonDiffs = await getDiffsFromCloud(cmbDiffAcademie.value, cmbDiffSchoolYear.value);
        await showDiffs(jsonDiffs, cmbDiffAcademie.value, cmbDiffSchoolYear.value);
    }
    catch (e) {}

}
interface TreeNode {
    folderName: string;
    nodes: Map<string, TreeNode>;
}

export async function getDiffDirStructure() {
    let folderContent = await fetchFolderContent("Dko3/Uurroosters/");
    let folderTree: TreeNode = {folderName: "", nodes: new Map()};
    for(let file of folderContent.files) {
        let dirs = file.name.split("/");
        dirs.pop(); //remove file.
        dirs.shift(); //remove Dko3/
        dirs.shift(); //remove Uurroosters/
        let currentNode = folderTree;
        for(let dir of dirs) {
            let node = currentNode.nodes.get(dir);
            if(!node) {
                node = {folderName: dir, nodes: new Map()};
                currentNode.nodes.set(dir, node);
            }
            currentNode = node;
        }
    }
    return folderTree;
}

function getAcademies(folderTree: TreeNode) {
    return [...folderTree.nodes.values()].map(n => n.folderName);
}

export function getDiffMyAcademieFolder(folderTree: TreeNode) {
    let myAcademie = getUserAndSchoolName().schoolName;
    let academies = getAcademies(folderTree);
    if(academies.includes(myAcademie))
        return myAcademie;
    myAcademie = myAcademie
        .replace("(", "")
        .replaceAll(")", "");
    if(academies.includes(myAcademie))
        return myAcademie;
    myAcademie = myAcademie
        .replaceAll("Muziek", "M")
        .replaceAll("Woord", "W")
        .replaceAll("Dans", "D")
        .replaceAll("Beeld", "B");
    if(academies.includes(myAcademie))
        return myAcademie;
    myAcademie = myAcademie
        .replaceAll("-", "");
    if(academies.includes(myAcademie))
        return myAcademie;
    let found = academies.find(name => name.includes(myAcademie))
    if(found)
        return found;
    return null;
}

