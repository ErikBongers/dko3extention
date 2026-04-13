import * as def from "./def";
import {JsonExcelData} from "./roster_diff/excel";
import {CheckName, CheckStatus, NotificationId, NotificationLevel, Notifications, Notification} from "./notifications/types";

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

export async function fetchFolderChanged(folderName: string) {
    let res = await fetch(encodeURI(def.CLOUD_BASE_URL + "folder-changed?folderName="+folderName));
    return await res.json() as FolderChangedInfo;
}

export async function fetchExcelData(filePath: string) {
    return await fetchJson(filePath) as JsonExcelData;
}

const temp_hash_ignore_filename = "Dko3/TODO-NAME-ignored-diff-hashes.json";
export async function uploadIgnoredDiffHashes(hashes: string[]) {
    await uploadJson(temp_hash_ignore_filename, hashes);
}

export async function fetchIgnoredDiffHashes() {
    return await fetchJson(temp_hash_ignore_filename) as string[];
}