import {emmet} from "../../libs/Emmeter/html";
import {getAndShowDiffs} from "../roster_diff/showDiff";
import {fetchFolderContent} from "../cloud";
import {getUserAndSchoolName} from "../globals";

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

export async function setupDiffPage() {
    let pluginContainer = document.getElementById("plugin_container")!;
    let button = emmet.appendChild(pluginContainer, "div#diffsPage.mb-1>div>(h4{Verschillen tussen Excel uurroosters en DKO3 lessen.}+(div#combosLoading{Gegevens laden...}+select#cmbDiffAcademie+select#cmbDiffSchoolYear+button.btn.btn-primary{Zoek verschillen}))").last as HTMLButtonElement;
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
    let runStatus = emmet.insertAfter(button, "div#runStatus").first as HTMLDivElement;
    emmet.insertAfter(runStatus, "div#diffResults");

    let divInfo = emmet.insertAfter(runStatus, 'div#diffInfo').last as HTMLDivElement;
    let divError = emmet.insertAfter(divInfo, 'div#diffErrors.errors').last as HTMLDivElement;
    button.onclick = () => getAndShowDiffs(false);
    cmbDiffAcademie.onchange = async () => {
        if(await loadCombboxSchoolYearAndTrySelect(dirTree))
            pluginContainer.classList.toggle("diffCombosLoaded", true);
        await showDiffsFromComboboxes();
    }
    cmbDiffSchoolYear.onchange = async () => {
        await showDiffsFromComboboxes();
    }
    await showDiffsFromComboboxes();
}

async function showDiffsFromComboboxes() {
    await getAndShowDiffs(true);
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

