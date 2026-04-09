import {fetchCheckStatus, fetchExcelData, fetchFolderChanged, postNotification} from "../cloud";
import {runRosterCheck} from "../roster_diff/build";
import {fetchAndDisplayNotifications} from "./notifications";

export async function checkChecks() {
    let woordCheckstatus = await fetchCheckStatus("WOORD_ROSTERS");
    if (woordCheckstatus.status === "INITIAL") {
        //todo: add message that this check needs to be run.
        await postNotification("MUZIEK_ROSTERS_IS_DIFF", "warning", "De muzieklessen zijn niet vergeleken met het uurrooser op Sharepoint. Klik op de knop om de lessen te vergelijken.");
        await fetchAndDisplayNotifications();
        let folderChanged = await fetchFolderChanged("Dko3/Uurroosters/");
        for (let file of folderChanged.files) {
            let excelData = await fetchExcelData(file.name);
            await runRosterCheck(excelData);
        }
    }
}
