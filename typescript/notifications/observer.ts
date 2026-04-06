import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";

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
    let notificationsDiv = document.querySelector("#dko3_plugin_notifications") as HTMLDivElement;
    if(notificationsDiv)
        return true;
    let startContent = document.querySelector("#dko3_start_content") as HTMLDivElement;
    if (startContent) {
        addNotifications(startContent).then(r => {}); //no wait needed
        return true;
    }
    return false;
}

async function addNotifications(startContentDiv: HTMLDivElement) {
    if(startContentDiv.children.length > 0) {
        let divNotifs = emmet.insertAfter(startContentDiv.children[0], "div#dko3_plugin_notifications>div.alert.alert-info.shadow-sm").last as HTMLDivElement;
        let notifications = await getNotifications();
        let html: string = "";
        notifications.forEach(notif => {
            let waitingGifUrl = chrome.runtime.getURL("images/waiting.gif");
            html += `
<div class="notif notif-${notif.level}">
    <div class="notif-img">
        <img src="${waitingGifUrl}" class="notifWaiting" alt="running...">
    </div>
    <div>${notif.message}</div>
</div>`;
        });
        divNotifs.innerHTML = html;
    }
    else
        console.error("startContentDiv has no children");
}

export type NotificationLevel = "info" | "warning" | "error" | "running";
export type NotificationId = "DIFF_ROSTERS" | "OTHER";
export interface Notification {
    level: NotificationLevel;
    id: NotificationId;
    message: string;
}
async function getNotifications() {
    let res = await fetch("https://europe-west1-ebo-tain.cloudfunctions.net/get-notifications");
    return await res.json() as Notification[];
}