import {emmet} from "../../libs/Emmeter/html";
import {scrapeAllNormalLessen} from "../roster_diff/buildDiff";
import {getUserAndSchoolName, Schoolyear, SlidingWindow} from "../globals";
import {cloud, fetchFolderContent, FileChangedInfo} from "../cloud";
import {Les} from "../lessen/scrape";
import {StatusCallback} from "../roster_diff/showDiff";
import {DKO3_BASE_URL} from "../def";
import {GradeYear} from "../roster_diff/calcDiff";

export async function setupSnapshotPage() {
    let pluginContainer = document.getElementById("plugin_container")!;
    let button = emmet.appendChild(pluginContainer, "div#snapshotPage.mb-1>div>(h4{Snapshots van lessen.}+(select#cmbSnapshotSchoolYear+button.btn.btn-primary{Snapshot maken}))").last as HTMLButtonElement;
    let cmbSnapshotSchoolYear = pluginContainer.querySelector("#cmbSnapshotSchoolYear") as HTMLSelectElement;
    let thisYear = Schoolyear.calculateCurrent();
    let schoolYear = Schoolyear.toFullString(thisYear);
    let nextYear = Schoolyear.toFullString(thisYear + 1);
    cmbSnapshotSchoolYear.innerHTML = [schoolYear, nextYear].map(name => `<option value="${name}">${name}</option>`).join("");
    cmbSnapshotSchoolYear.value = localStorage.getItem("snapshotLastSchoolYear") ?? "";//todo: check if valid value
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
        localStorage.setItem("snapshotLastSchoolYear", cmbSnapshotSchoolYear.value);
        await showSnapshotsforCombobox();
    }
    await showSnapshotsforCombobox();
}

export type LesSnapshot = {
    id: string,
    hash: string,//delete when all snapshots before 8 may 2026 have been removed.
    newHash?: string, //includes gradeYears
    naam: string,
    vakNaam: string,
    lesmoment: string,
    vestiging: string,
    online: boolean,
    teacher?: string,
    gradeYears?: string,
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
                newHash: Les.getNewHash(les),
                naam: les.naam,
                vakNaam: les.vakNaam,
                lesmoment: les.lesmoment,
                vestiging: les.vestiging,
                online: les.online,
                teacher: les.teacher,
                gradeYears: GradeYear.toString(les.gradeYears),
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
    let jsonString = JSON.stringify(snapshotData);
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
        if(previousSnapshot && snapshotData.diffs == null) {
            snapshotData.diffs = compareSnapshots(previousSnapshot, snapshotData);
            await uploadSnapshotData(snapshotData);
        }
        snapshotDataList.push(snapshotData);
        previousSnapshot = snapshotData;
    }
    return snapshotDataList;
}

function showSnapshot(snapshotData: SnapshotData, divResults: HTMLDivElement) {
    let date = new Date(snapshotData.zDate);
    let divSnapshotContainer = emmet.appendChild(divResults, `div>h5{${date.toLocaleDateString()} ${date.toLocaleTimeString()}}`).first as HTMLDivElement;
    showDifferences(snapshotData.diffs!, divSnapshotContainer);
}

async function showSnapshotsforCombobox() {
    let cmbSnapshotSchoolYear = document.querySelector("#cmbSnapshotSchoolYear") as HTMLSelectElement;
    let academieName = getUserAndSchoolName().schoolName;
    let snapshotDataList = await getCalculateAndSaveSnapshotDiffs(academieName, cmbSnapshotSchoolYear.value);
    let divResults = document.getElementById("snapshotResults") as HTMLDivElement;
    divResults.innerHTML = "";
    let inEllipse: boolean = false;
    function showSnapshotWithPossibleEllipse(snapshot: SnapshotData) {
        if(inEllipse)
            emmet.appendChild(divResults, `div{...}`);
        inEllipse = false;
        showSnapshot(snapshot, divResults);
    }
    for(let item of new SlidingWindow(snapshotDataList)) {
        if(!item.prev || !item.next //always draw the first and last snapshot.
            || item.current.diffs?.length != 0 //always draw a snapshot with diffs and it's adjacent snapshots.
            || item.prev.diffs?.length != 0
            || item.next.diffs?.length != 0
        ) {
            showSnapshotWithPossibleEllipse(item.current);
            continue;
        }
        inEllipse = true; //skip
    }
}

type SnapshotDiff = {
    what: "prev" | "next",
    les: LesSnapshot
}

function compareSnapshots(previousSnapshot: SnapshotData, nextSnapshot: SnapshotData): SnapshotDiff[] {
    let diffs: SnapshotDiff[] = [];
    for (let prev of previousSnapshot.lessen) {
        if (!nextSnapshot.lessen.find(les => {
            if(les.newHash && prev.newHash)
                return les.newHash == prev.newHash;
            return les.hash == prev.hash
        })) {
            diffs.push({what: "prev", les: prev});
        }
    }
    for (let next of nextSnapshot.lessen) {
        if (!previousSnapshot.lessen.find(les => {
            if(les.newHash && next.newHash)
                return les.newHash == next.newHash;
            return les.hash == next.hash
        })) {
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
    //                reportStatus(`Voor aliasles <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> zijn er ontbrekende lestijden.`, "error");
    for(let diff of diffs) {
        emmet.appendChild(tbody, `
            tr.${diff.what}>(
                (td>a{${diff.les.id}}[href="${DKO3_BASE_URL}#lessen-les?id=${diff.les.id}"])+
                td{${diff.les.vakNaam}}+
                td{${diff.les.naam}}+
                td{${diff.les.lesmoment
                    .replace("(wekelijks)", "")
                }}+
                td{${diff.les.vestiging
                    .replace("Vestiging ", "")
                    .replace("Academie Willem Van Laarstraat, Berchem", "Wvl")
                }}+
                td{${diff.les.teacher??"(lk)"}}+
                td{${diff.les.gradeYears??"(g.j)"}}
            )`);
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

