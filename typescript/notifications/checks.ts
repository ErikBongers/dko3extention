import {fetchCheckStatus, fetchExcelData, fetchFolderChanged, postNotification} from "../cloud";
import runRosterCheck from "../roster_diff/buildDiff";
import {fetchAndDisplayNotifications} from "./notifications";

export async function checkChecks() {
    // let woordCheckstatus = await fetchCheckStatus("WOORD_ROSTERS");
    // if (woordCheckstatus.status === "INITIAL") {
    //     //todo: add message that this check needs to be run.
    //     await postNotification("WOORD_ROSTERS_IS_DIFF", "warning", `De woordlessen zijn niet vergeleken met het uurrooser op Sharepoint. <button class="action">Vergelijk lessen</button>`, "");
    //     await fetchAndDisplayNotifications();
    // } else { //woord checks are not INITIAL, so see if they are changed since last check.
    //     let folderChanged = await fetchFolderChanged("Dko3/Uurroosters/");
    //     if (folderChanged.changed) {
    //         await postNotification("WOORD_ROSTER_CHANGED", "warning", `Het uurrooster voor woord is gewijzigd op Sharepoint. <button class="action">Vergelijk lessen</button>`, "");
    //     }
    // }
}
