import {emmet} from "../../libs/Emmeter/html";
import {scrapeAllNormalLessen} from "../roster_diff/buildDiff";
import {getUserAndSchoolName, Schoolyear} from "../globals";
import {cloud, fetchFolderContent} from "../cloud";
import {StatusCallback} from "./diffPage";

export async function setupSnapshotPage() {
    let pluginContainer = document.getElementById("plugin_container")!;
    let button = emmet.appendChild(pluginContainer, "div#snapshotPage.mb-1>div>(h4{Snapshots van lessen.}+(select#cmbSnapshotSchoolYear+button.btn.btn-primary{Snapshot maken}))").last as HTMLButtonElement;
    let cmbSnapshotSchoolYear = pluginContainer.querySelector("#cmbSnapshotSchoolYear") as HTMLSelectElement;
    let thisYear = Schoolyear.calculateCurrent();
    let schoolYear = Schoolyear.toFullString(thisYear);
    let nextYear = Schoolyear.toFullString(thisYear + 1);
    cmbSnapshotSchoolYear.innerHTML = [schoolYear, nextYear].map(name => `<option value="${name}">${name}</option>`).join("");
    let runStatus = emmet.insertAfter(button, "div#runStatus").first as HTMLDivElement;
    let divError = emmet.insertAfter(runStatus, 'div.errors').last as HTMLDivElement;
    emmet.insertAfter(divError, "div#snapshotResults");
    let errors: string[] = [];
    function reportStatus(message: string, isError?: "error") {
        if(isError == "error")
            errors.push(message);
        else
            runStatus.innerHTML = message;
        divError.innerHTML = errors.join("<br>");
    }
    button.onclick = async () => {
        await createSnapshot(cmbSnapshotSchoolYear.value, reportStatus);
    }
    cmbSnapshotSchoolYear.onchange = async () => {
        await showSnapshotsforCombobox();
    }
    await showSnapshotsforCombobox();
}

export type LesSnapshot = {
    id: string,
    hash: string,
    naam: string,
    vakNaam: string,
    lesmoment: string,
    vestiging: string,
    online: boolean
}

export interface SnapshotData {
    lessen: LesSnapshot[];
    academie: string;
    schoolYear: string;
    zDate: string
}

async function createSnapshot(schoolYear: string, reportStatus: StatusCallback) {
    reportStatus("Snapshot wordt gemaakt...")
    let lessen = await scrapeAllNormalLessen(schoolYear, reportStatus);
    let snapshotList: LesSnapshot[] = lessen
        .map(les => {
            return {
                id: les.id,
                hash: les.getHash(),
                naam: les.naam,
                vakNaam: les.vakNaam,
                lesmoment: les.lesmoment,
                vestiging: les.vestiging,
                online: les.online
            };
        });
    let academieName = getUserAndSchoolName().schoolName;
    let zDate = new Date().toISOString();
    let snapshotData: SnapshotData = {
        lessen: snapshotList,
        academie: academieName,
        schoolYear,
        zDate
    }
    await cloud.json.upload(`Dko3/Snapshots/${academieName}/${schoolYear}/${zDate}.json`, snapshotData);
    reportStatus("Snapshot aangemaakt.")
}

async function showSnapshotsforCombobox() {
    let cmbSnapshotSchoolYear = document.querySelector("#cmbSnapshotSchoolYear") as HTMLSelectElement;
    let academieName = getUserAndSchoolName().schoolName;
    let content = await fetchFolderContent(`Dko3/Snapshots/${academieName}/${cmbSnapshotSchoolYear.value}/`)
    console.log(content);
    let divResults = document.getElementById("snapshotResults") as HTMLDivElement;
    let previousSnapshot: SnapshotData | null = null;
    for(let file of content.files) {
        let snapshotData = await cloud.json.fetch(file.name) as SnapshotData;
        let date = new Date(snapshotData.zDate);
        let divSnapshotContainer = emmet.appendChild(divResults, `div>h5{${date.toLocaleDateString()} ${date.toLocaleTimeString()}}`).first as HTMLDivElement;
        if(previousSnapshot) {
            compareSnapshots(previousSnapshot, snapshotData, divSnapshotContainer);
        }
        previousSnapshot = snapshotData;
    }
}

function compareSnapshots(previousSnapshot: SnapshotData, nextSnapshot: SnapshotData, divResults: HTMLDivElement) {
    let diffs = [];
    for(let prev of previousSnapshot.lessen) {
        if (!nextSnapshot.lessen.find(les => les.hash == prev.hash)) {
            diffs.push( {what: "prev", les: prev});
        }
    }
    for(let next of nextSnapshot.lessen) {
        if (!previousSnapshot.lessen.find(les => les.hash == next.hash)) {
            diffs.push( {what: "next", les: next});
        }
    }
    let tbody = emmet.appendChild(divResults, `table.snapshotDiffs>tbody`).last as HTMLTableSectionElement;
    diffs.sort((a, b) => {
        if(a.les.id == b.les.id)
            return b.what.localeCompare(a.what);
        return a.les.id.localeCompare(b.les.id)
    });
    for(let les of diffs) {
        emmet.appendChild(tbody, `tr.${les.what}>(td{${les.les.id}}+td{${les.les.vakNaam}}+td{${les.les.naam}}+td{${les.les.lesmoment}})`);
    }
    if(diffs.length > 0)
        divResults.classList.toggle("error", true);
}

