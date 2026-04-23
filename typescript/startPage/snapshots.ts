import {emmet} from "../../libs/Emmeter/html";
import {scrapeAllNormalLessen} from "../roster_diff/buildDiff";
import {getUserAndSchoolName, Schoolyear} from "../globals";
import {cloud, fetchFolderContent, FileChangedInfo} from "../cloud";
import { Les } from "../lessen/scrape";
import {StatusCallback} from "../roster_diff/showDiff";

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
        await showSnapshotsforCombobox();
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
    zDate: string;
    diffs: SnapshotDiff[] | null;
}

async function createSnapshot(schoolYear: string, reportStatus: StatusCallback) {
    reportStatus("Snapshot wordt gemaakt...")
    let lessen = (await scrapeAllNormalLessen(schoolYear, reportStatus)).map(l => l.les);
    let snapshotList: LesSnapshot[] = lessen
        .map(les => {
            return {
                id: les.id,
                hash: Les.getHash(les),
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
        zDate,
        diffs: null,
    }
    await uploadSnapshotData(snapshotData);
    reportStatus("Snapshot aangemaakt.")
}

async function uploadSnapshotData(snapshotData: SnapshotData) {
    await cloud.json.upload(`Dko3/Snapshots/${snapshotData.academie}/${snapshotData.schoolYear}/${snapshotData.zDate}.json`, snapshotData);
}

async function fetchSnapshotData(file: FileChangedInfo) {
    let snapshotData = await cloud.json.fetch(file.name) as SnapshotData;
    //version 2:
    snapshotData.diffs = snapshotData.diffs ?? null;
    return snapshotData;
}

async function getCalculateAndSaveSnapshotDiffs(academie: string, schoolYear: string): Promise<SnapshotData[]> {
    let content = await fetchFolderContent(`Dko3/Snapshots/${academie}/${schoolYear}/`)
    let previousSnapshot: SnapshotData | null = null;
    let snapshotDataList: SnapshotData[] = [];
    for(let file of content.files) {
        let snapshotData = await fetchSnapshotData(file);
        if(previousSnapshot && snapshotData.diffs == null) { //todo: factor out the creattion loop from showing loop.
            snapshotData.diffs = compareSnapshots(previousSnapshot, snapshotData);
            await uploadSnapshotData(snapshotData);
        }
        snapshotDataList.push(snapshotData);
        previousSnapshot = snapshotData;
    }
    return snapshotDataList;
}

async function showSnapshotsforCombobox() {
    let cmbSnapshotSchoolYear = document.querySelector("#cmbSnapshotSchoolYear") as HTMLSelectElement;
    let academieName = getUserAndSchoolName().schoolName;
    let snapshotDataList = await getCalculateAndSaveSnapshotDiffs(academieName, cmbSnapshotSchoolYear.value);
    let divResults = document.getElementById("snapshotResults") as HTMLDivElement;
    divResults.innerHTML = "";
    for(let snapshotData of snapshotDataList) {
        let date = new Date(snapshotData.zDate);
        let divSnapshotContainer = emmet.appendChild(divResults, `div>h5{${date.toLocaleDateString()} ${date.toLocaleTimeString()}}`).first as HTMLDivElement;
        showDifferences(snapshotData.diffs, divSnapshotContainer);
    }
}

type SnapshotDiff = {
    what: "prev" | "next",
    les: LesSnapshot
}

function compareSnapshots(previousSnapshot: SnapshotData, nextSnapshot: SnapshotData): SnapshotDiff[] {
    let diffs: SnapshotDiff[] = [];
    for (let prev of previousSnapshot.lessen) {
        if (!nextSnapshot.lessen.find(les => les.hash == prev.hash)) {
            diffs.push({what: "prev", les: prev});
        }
    }
    for (let next of nextSnapshot.lessen) {
        if (!previousSnapshot.lessen.find(les => les.hash == next.hash)) {
            diffs.push({what: "next", les: next});
        }
    }
    return diffs;
}

function showDifferences(diffs: SnapshotDiff[], divResults: HTMLDivElement) {
    if(!diffs)
        return;
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
    //show diff fields
    let rows = [...tbody.querySelectorAll("tr")];
    for(let i = 0; i <= rows.length - 2; i++) {
        let row1 = rows[i];
        let row2 = rows[i + 1];
        let cells1 = [...row1.querySelectorAll("td")];
        let cells2 = [...row2.querySelectorAll("td")];
        if(cells1[0].innerText != cells2[0].innerText)
            continue;
        for(let cellIndex = 0; cellIndex < cells1.length; cellIndex++) {
            let cell1 = cells1[cellIndex];
            let cell2 = cells2[cellIndex];
            if(cell1.innerText != cell2.innerText) {
                cell1.classList.toggle("error", true);
                cell2.classList.toggle("error", true);
            }
        }
    }
}

