import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {fetchCheckStatus} from "../cloud";

class StartPageObserver extends ExactHashObserver {
    constructor() {
        super( "#start-mijn_tijdslijn", onMutation );
    }
    isPageReallyLoaded(): boolean {
        return document.querySelectorAll("#dko3_start_content").length > 0;
    }
}
export default new StartPageObserver();

function onMutation(mutation: MutationRecord) {
    if(document.querySelector("#dko3_plugin_notifications"))
        return true;

    let startContentDiv = document.querySelector("#dko3_start_content") as HTMLDivElement;
    if (startContentDiv) {
        if(startContentDiv.textContent.includes("welkom")) {
            emmet.insertAfter(startContentDiv.children[0], "div#dko3_plugin_notifications>div.alert.alert-info.shadow-sm");
            doStartupStuff().then(() => {}); //no wait needed.
        }
        return true;
    }
    return false;
}

async function doStartupStuff() {
    await displayNotifications();
    await checkChecks();
}

async function displayNotifications() {
    let notificationsDiv = document.querySelector("#dko3_plugin_notifications > div") as HTMLDivElement;
    let notifications = await getNotifications();
    let html: string = "";
    notifications.notifications.forEach(notif => {
        let waitingGifUrl = chrome.runtime.getURL("images/waiting.gif");
        html += `
<div class="notif notif-${notif.level}">
<div class="notif-img">
    <img src="${waitingGifUrl}" class="notifWaiting" alt="running...">
</div>
<div>${notif.message}</div>
</div>`;
    });
    notificationsDiv.innerHTML = html;
}

export type NotificationLevel = "info" | "warning" | "error" | "running";
export type NotificationId =
    "WOORD_ROSTERS_IS_DIFF" | "WOORD_ROSTER_CHANGED" | "WOORD_ROSTER_RUN"
    | "MUWIEK_ROSTERS_IS_DIFF" | "MUWIEK_ROSTER_CHANGED" | "MUWIEK_ROSTER_RUN"
    | "OTHER"; //todo: OTHER should eventually be removed, as we need to be able to indentify every notif in order to be able to remove it.
export interface Notification {
    level: NotificationLevel;
    id: NotificationId;
    message: string;
}

export interface Notifications {
    instance: number;
    notifications: Notification[]
}
async function getNotifications() {
    let res = await fetch("https://europe-west1-ebo-tain.cloudfunctions.net/get-notifications");
    return await res.json() as Notifications;
}

async function checkChecks() {
    let status = await fetchCheckStatus("WOORD_ROSTERS");
    console.log("checkChecks: ", status);
}
