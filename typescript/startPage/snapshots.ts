import {emmet} from "../../libs/Emmeter/html";
import {scrapeAllNormalLessen} from "../roster_diff/buildDiff";
import {getUserAndSchoolName, Schoolyear} from "../globals";
import {cloud} from "../cloud";
import {StatusCallback} from "./diffPage";

export async function setupSnapshotPage() {
    let pluginContainer = document.getElementById("plugin_container");
    let button = emmet.appendChild(pluginContainer, "div.mb-1>div>(h4{Snapshots van lessen.}+(select#cmbDiffSchoolYear+button.btn.btn-primary{Snapshot maken}))").last as HTMLButtonElement;
    let cmbDiffSchoolYear = pluginContainer.querySelector("#cmbDiffSchoolYear") as HTMLSelectElement;
    cmbDiffSchoolYear.innerHTML = ["2025-2026", "2026-2027HARD CODED!!!"].map(name => `<option value="${name}">${name}</option>`).join("");
    let runStatus = emmet.insertAfter(button, "div#runStatus").first as HTMLDivElement;
    let divError = emmet.insertAfter(runStatus, 'div.errors').last as HTMLDivElement;
    let errors: string[] = [];
    function reportStatus(message: string, isError?: "error") {
        if(isError == "error")
            errors.push(message);
        else
            runStatus.innerHTML = message;
        divError.innerHTML = errors.join("<br>");
    }
    button.onclick = async () => {
        await createSnapshot(cmbDiffSchoolYear.value, reportStatus);
    }
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
