import {emmet} from "../../libs/Emmeter/html";
import {createStatusBlock, fetchDiffSettingsOrDefault, getAndShowDiffs} from "../roster_diff/showDiff";
import {fetchFolderContent} from "../cloud";
import {getUserAndSchoolName} from "../globals";
import {DiffSettings} from "../roster_diff/diffSettings";
import {Actions, sendRequest, ServiceRequest, TabType} from "../messaging";
import MessageSender = chrome.runtime.MessageSender;
import {OtherLesType} from "../www_diff/buildDiff";
import {setupTabNavigation} from "../tabs";

async function loadCombboxSchoolYearAndTrySelect(dirTree?: TreeNode): Promise<boolean> {
    if(!dirTree)
        dirTree = await getDiffDirStructure();

    let pluginContainer = document.getElementById("plugin_container")!;
    let cmbDiffAcademie = pluginContainer.querySelector("#cmbDiffAcademie") as HTMLSelectElement;
    let schoolYears = [...dirTree.nodes.get(cmbDiffAcademie.value)!.nodes.values()].map(n => n.folderName);
    let cmbDiffSchoolYear = document.querySelector("#cmbDiffSchoolYear") as HTMLSelectElement;
    let prevSelectedSchoolYear = cmbDiffSchoolYear.value;
    cmbDiffSchoolYear.innerHTML = schoolYears.map(schoolYear => `<option value="${schoolYear}">${schoolYear}</option>`).join("");
    if (schoolYears.length == 1) {
        cmbDiffSchoolYear.value = schoolYears[0];
        return true;
    }
    if(schoolYears.includes(prevSelectedSchoolYear)) {
        cmbDiffSchoolYear.value = prevSelectedSchoolYear;
        return true;
    }
    return false;
}

function onBeforeTabSwitch(): ("cancel" | "continue") {
    console.log("Tab switch");
    return "continue";
}

export async function setupDiffPage() {
    let pluginContainer = document.getElementById("plugin_container")!;
    emmet.appendChild(pluginContainer, `
        div#diffsPage.mb-1>(
            h4{Verschillen in uurroosters}+
            div.tabs>(
                (
                    button#btnTabTagDefs.naked.hand.tab.notSelected[data-tab-id="tabExcelDiffs"]>(
                        span>(
                            i.excelRow.far.fa-chalkboard-user+
                            span.excelRow{Excel}
                        )+
                        i.fas.fa-arrow-right+
                        span{Dko3}
                    )
                )+
                (
                    button#btnTabIgnores.naked.hand.tab.notSelected[data-tab-id="tabWwwDiffs"]>(
                        span{Dko3}+
                        i.fas.fa-arrow-right+
                        span>(
                            i.wwwRow.far.fa-globe+
                            span.wwwRow{Website}
                        )
                    )
                )
            )
        )+
        (
            div#tabExcelDiffs>(
                div#combosLoading{Gegevens laden...}+
                select#cmbDiffAcademie+
                select#cmbDiffSchoolYear+
                button#btnCalcDiff.btn.btn-primary{Zoek verschillen}+
                button#btnDiffSettings.btn.btn-outline-dark{Setup}+
                div#wrapperExcelDiffs
            )
        )+
        div#tabWwwDiffs>(
            button#btnDiffWww.btn.btn-primary{Zoek Verschillen}+
            button#btnDiffSettingsWww.btn.btn-outline-dark{Setup}+
            div#wrapperWwwDiffs
        )
     `);
    setupTabNavigation();
    // setupTabNavigation(onBeforeTabSwitch);
    let btnCalcDiff = pluginContainer.querySelector("#btnCalcDiff")  as HTMLButtonElement;
    let btnCalcDiffWww = pluginContainer.querySelector("#btnDiffWww")  as HTMLButtonElement;
    let btnDiffSettings = pluginContainer.querySelector("#btnDiffSettings")  as HTMLButtonElement;
    let btnDiffSettingsWww = pluginContainer.querySelector("#btnDiffSettings")  as HTMLButtonElement;
    let dirTree = await getDiffDirStructure();
    let myAcadFolderName = getDiffMyAcademieFolder(dirTree);
    if(!myAcadFolderName)
        throw new Error("Could not find academie folder name.");
    let academies = getAcademies(dirTree);
    let cmbDiffAcademie = pluginContainer.querySelector("#cmbDiffAcademie") as HTMLSelectElement;
    cmbDiffAcademie.innerHTML = academies.map(name => `<option value="${name}">${name}</option>`).join("");
    cmbDiffAcademie.value = myAcadFolderName;
    let cmbDiffSchoolYear = document.querySelector("#cmbDiffSchoolYear") as HTMLSelectElement;
    if(await loadCombboxSchoolYearAndTrySelect(dirTree))
        pluginContainer.classList.toggle("diffCombosLoaded", true);

    let divInfoContainerExcel = document.getElementById("wrapperExcelDiffs") as HTMLDivElement;
    createStatusBlock(divInfoContainerExcel);
    let divInfoContainerWww = document.getElementById("wrapperWwwDiffs") as HTMLDivElement;
    createStatusBlock(divInfoContainerWww);

    btnCalcDiff.onclick = () => getAndShowDiffs("calcAndShow", "fetchDko", "excel");
    btnCalcDiffWww.onclick = () => getAndShowDiffs("calcAndShow", "fetchDko", "www");
    btnDiffSettings.onclick = () => showDiffSetup(cmbDiffAcademie.value, cmbDiffSchoolYear.value);
    btnDiffSettingsWww.onclick = () => showDiffSetup(cmbDiffAcademie.value, cmbDiffSchoolYear.value); //todo: user may not be aware of what academy/schoolYear was selected in other box, as it's not really relevant.

    cmbDiffAcademie.onchange = async () => {
        await onCmbAcademieChange(dirTree);
    }
    cmbDiffSchoolYear.onchange = async () => {
        localStorage.setItem("diffLastSchoolYear", cmbDiffSchoolYear.value);
        await showDiffsFromComboboxes();
    }

    cmbDiffAcademie.value = localStorage.getItem("diffLastAcademie") ?? ""; //todo: check if valid value
    await onCmbAcademieChange(dirTree);
}

async function onCmbAcademieChange(dirTree: TreeNode) {
    let pluginContainer = document.getElementById("plugin_container")!;
    let cmbDiffAcademie = pluginContainer.querySelector("#cmbDiffAcademie") as HTMLSelectElement;
    let cmbDiffSchoolYear = document.querySelector("#cmbDiffSchoolYear") as HTMLSelectElement;
    localStorage.setItem("diffLastAcademie", cmbDiffAcademie.value);
    if (await loadCombboxSchoolYearAndTrySelect(dirTree)) {
        cmbDiffSchoolYear.value = localStorage.getItem("diffLastSchoolYear") ?? "";//todo: check if valid value
        pluginContainer.classList.toggle("diffCombosLoaded", true);
    }
    await showDiffsFromComboboxes();
}

async function showDiffsFromComboboxes() {
    await getAndShowDiffs("justShow", "dkoCache", "excel");
    await getAndShowDiffs("justShow", "dkoCache", "www");
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
    let found = academies.find(name => name == myAcademie)
    if(found)
        return found;
    found = academies.find(name => name.includes(myAcademie))
    if(found)
        return found;
    return null;
}

async function showDiffSetup(academie: string, schoolyear: string) {
    let res = await openDiffSettings(academie, schoolyear);
    globalDiffSettingsTabId = res.tabId;
}

let globalDiffSettingsTabId: number;

type DiffGlobals = {
    diffSettings: DiffSettings | undefined,
}

let diffGlobals: DiffGlobals = {
    diffSettings: undefined
}

export async function openDiffSettings(academie: string, schoolyear: string) {
    return sendRequest(Actions.OpenDiffSettings, TabType.Main, TabType.Undefined, undefined, {academie, schoolyear}, "TODO: is this title used? Uurrooster setup voor schooljaar " + schoolyear);
}

chrome.runtime.onMessage.addListener(onMessage)
let pauseRefresh = false;

//reset the pause after some time, because otherwise, in case of an error, the page will no longer be refreshed.
setInterval(() => {
    pauseRefresh = false;
}, 2000);

async function onMessage(request: ServiceRequest<any>, _sender: MessageSender, sendResponse: (response?: any) => void) {
    if(request.senderTabType != TabType.DiffSettings)
        return;
    if(request.action == Actions.RequestTabData) {
        console.log("Requesting tab data", request.data);
        let academie = request.data.params.academie;
        let schoolYear = request.data.params.schoolYear;
        if(!diffGlobals.diffSettings) {
            diffGlobals.diffSettings = await fetchDiffSettingsOrDefault(academie, schoolYear);
        }
        await sendMessageToDiffSettings(Actions.TabData, diffGlobals.diffSettings);
        return;
    }
    if(pauseRefresh)
        return;
    pauseRefresh = true;
    diffGlobals.diffSettings = request.data as DiffSettings;
    await getAndShowDiffs("calcAndShow", "dkoCache", 'excel');
    pauseRefresh = false;
}

async function sendMessageToDiffSettings(action: Actions, data: any) {
    return sendRequest(action, TabType.Main, TabType.DiffSettings, globalDiffSettingsTabId, data);
}



