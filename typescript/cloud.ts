import * as def from "./def";

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

export type CheckName  = "WOORD_ROSTERS";

export type NotificationLevel = "info" | "warning" | "error" | "running";
export type NotificationId =
    "WOORD_ROSTERS_IS_DIFF" | "WOORD_ROSTER_CHANGED" | "WOORD_ROSTER_RUN"
    | "MUZIEK_ROSTERS_IS_DIFF" | "MUZIEK_ROSTER_CHANGED" | "MUZIEK_ROSTER_RUN"
    | "OTHER"; //todo: OTHER should eventually be removed, as we need to be able to indentify every notif in order to be able to remove it.
export interface Notification {
    level: NotificationLevel;
    id: NotificationId;
    message: string;
}

export interface Notifications {
    instance: number;
    notifications: {
        [key in NotificationId]?: Notification;
    }
}

export interface CheckStatus {
    status: "INITIAL" | "RUNNING" | "FINISHED" | "FAILED";
    date: string;
    errors: string[];
}

export async function fetchCheckStatus(checkName: CheckName) {
    let res = await fetch(def.CHECK_STATUS_URL + "?name="+checkName);
    return await res.json() as CheckStatus;
}

export async function fetchNotifications() {
    let res = await fetch("https://europe-west1-ebo-tain.cloudfunctions.net/get-notifications");
    return await res.json() as Notifications;
}

export async function postNotification(id: NotificationId, level: NotificationLevel, message: string) {
    let notification: Notification = {id, level, message};
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
    return await fetchJson(filePath) as ExcelData;
}