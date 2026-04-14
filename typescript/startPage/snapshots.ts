import {emmet} from "../../libs/Emmeter/html";
import {scrapeAllNormalLessen} from "../roster_diff/buildDiff";
import {getUserAndSchoolName, Schoolyear} from "../globals";
import {cloud, fetchFolderContent} from "../cloud";
import {StatusCallback} from "./diffPage";

export async function setupSnapshotPage() {
    let pluginContainer = document.getElementById("plugin_container");
    let button = emmet.appendChild(pluginContainer, "div#snapshotPage.mb-1>div>(h4{Snapshots van lessen.}+(select#cmbSnapshotSchoolYear+button.btn.btn-primary{Snapshot maken}))").last as HTMLButtonElement;
    let cmbSnapshotSchoolYear = pluginContainer.querySelector("#cmbSnapshotSchoolYear") as HTMLSelectElement;
    cmbSnapshotSchoolYear.innerHTML = ["2025-2026", "2026-2027HARD CODED!!!"].map(name => `<option value="${name}">${name}</option>`).join("");
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
    let html = {html: ""};
    let previousSnapshot: SnapshotData = null;
    for(let file of content.files) {
        let snapshotData = await cloud.json.fetch(file.name) as SnapshotData;
        html.html+= `<h4>${snapshotData.zDate}</h4>`;
        if(previousSnapshot) {
            let diffs = compareSnapshots(previousSnapshot, snapshotData);
            for(let diff of diffs) {
                html.html += diff;
            }
        }
        previousSnapshot = snapshotData;
    }
    divResults.innerHTML = html.html;
}

function compareSnapshots(previousSnapshot: SnapshotData, nextSnapshot: SnapshotData) {
    let diffs: string[] = [];
    for(let prev of previousSnapshot.lessen) {
        if (!nextSnapshot.lessen.find(les => les.hash == prev.hash)) {
            diffs.push(`<p>${prev.hash}</p>`);
        }
    }
    for(let next of nextSnapshot.lessen) {
        if (!previousSnapshot.lessen.find(les => les.hash == next.hash)) {
            diffs.push(`<p>${next.hash}</p>`);
        }
    }
    return diffs;
}

