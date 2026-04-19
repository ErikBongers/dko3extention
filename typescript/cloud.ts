import * as def from "./def";
import {JsonExcelData} from "./roster_diff/excel";
import {CheckName, CheckStatus, NotificationId, NotificationLevel, Notifications, Notification} from "./notifications/types";
import {DiffSettings} from "./roster_diff/diffSettings";

export let cloud = {
    json: {
        fetch: fetchJson,
        upload: uploadJson
    }
};

async function fetchJson(fileName: string) {
    return fetch(def.JSON_URL + "?fileName="+fileName, {method: "GET"})
        .then((res) => res.json());
}

async function uploadJson(fileName: string, data: any) {
    let res = await fetch(def.JSON_URL + "?fileName=" + fileName, {
        method: "POST",
        body: JSON.stringify(data),
        keepalive: true, //keeps the data valid even if window is closing.
    });
    return await res.text();
}

export async function fetchCheckStatus(checkName: CheckName) {
    let res = await fetch(def.CHECK_STATUS_URL + "?name="+checkName);
    return await res.json() as CheckStatus;
}

export async function fetchNotifications() {
    console.log("fetching notifications");
    let res = await fetch("https://europe-west1-ebo-tain.cloudfunctions.net/get-notifications");
    return await res.json() as Notifications;
}

export async function postNotification(id: NotificationId, level: NotificationLevel, message: string, data: string) {
    let notification: Notification = {id, level, message, data};
    await fetch(`https://europe-west1-ebo-tain.cloudfunctions.net/notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify(notification),
    });
}

export async function deleteNotification(id: NotificationId) {
    await fetch(`https://europe-west1-ebo-tain.cloudfunctions.net/notification?id=${id}`, {
        method: "DELETE"
    });
}

export interface FileChangedInfo {
    name: string,
    changed: string
}
export interface FolderChangedInfo {
    changed: boolean;
    newestChange: string;
    oldestChange: string;
    files: FileChangedInfo[]
}

export interface FolderContentInfo {
    files: FileChangedInfo[]
    folder: string
}

export async function fetchFolderChanged(folderName: string) {
    let res = await fetch(encodeURI(def.CLOUD_BASE_URL + "folder-changed?folderName="+folderName));
    return await res.json() as FolderChangedInfo;
}

export async function fetchFolderContent(folderName: string) {
    let res = await fetch(encodeURI(def.CLOUD_BASE_URL + "folder-content?folderName="+folderName));
    return await res.json() as FolderContentInfo;
}

export async function fetchExcelData(filePath: string) {
    return await fetchJson(filePath) as JsonExcelData;
}

function getIgnoreHashesFileName(academie: string, schoolYear: string) {
    return `Dko3/Uurroosters/${academie}/${academie}_${schoolYear}_ignored-diff-hashes.json`;
}

export async function uploadIgnoredDiffHashes(academie: string, schoolYear: string, hashes: string[]) {
    await uploadJson(getIgnoreHashesFileName(academie, schoolYear), hashes);
}

export async function fetchIgnoredDiffHashes(academie: string, schoolYear: string) {
    return await fetchJson(getIgnoreHashesFileName(academie, schoolYear)) as string[];
}

function getDiffSettingsFileName(academie: string ,schoolYear: string ) {
    return `Dko3/Uurroosters/${academie}/${academie}_${schoolYear}_diff_settings.json`;
}
export async function uploadDiffSettings(academie: string, schoolYear: string, diffSettings: DiffSettings) {
    await uploadJson(getDiffSettingsFileName(academie, schoolYear), diffSettings);
}

export async function fetchDiffSettings(academie: string, schoolYear: string) {
    return await fetchJson(getDiffSettingsFileName(academie, schoolYear)) as DiffSettings;
}