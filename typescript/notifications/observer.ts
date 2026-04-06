import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {fetchCheckStatus, Notifications, Notification, NotificationId, fetchNotifications, postNotification} from "../cloud";

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
            emmet.insertAfter(startContentDiv.children[0], "div#dko3_plugin_notifications>div.alert.alert-info.shadow-sm>(h5>strong{Plugin berichten})+div");
            doStartupStuff().then(() => {}); //no wait needed.
        }
        return true;
    }
    return false;
}

async function doStartupStuff() {
    await fetchAndDisplayNotifications();
    await checkChecks();
}

async function fetchAndDisplayNotifications() {
    let notifications = await fetchNotifications();
    let notificationsDiv = document.querySelector("#dko3_plugin_notifications > div > div") as HTMLDivElement;
    let html: string = "";
    let propNames = Object.getOwnPropertyNames(notifications.notifications) as NotificationId[];

    for(let propName of propNames){
        let notif = notifications.notifications[propName];
        let imgUrl = chrome.runtime.getURL("images/waiting.gif");
        switch (notif.level) {
            case "warning": imgUrl = chrome.runtime.getURL("images/warning.png"); break;
            case "error": imgUrl = chrome.runtime.getURL("images/error.png"); break;
            case "running": imgUrl = chrome.runtime.getURL("images/waiting.gif"); break;
            case "info": imgUrl = chrome.runtime.getURL("images/info.png"); break;
        }
        html += `
            <div class="notif notif-${notif.level}">
            <div class="notif-img">
                <img src="${imgUrl}" alt="todo">
            </div>
            <div>${notif.message}</div>
            </div>
            `;
    }
    notificationsDiv.innerHTML = html;
}

async function checkChecks() {
    let woordCheckstatus = await fetchCheckStatus("WOORD_ROSTERS");
    console.log("checkChecks: ", woordCheckstatus);
    if(woordCheckstatus.status === "INITIAL") {
        //todo: add message that this check needs to be run.
        let notif: Notification = {id: "MUZIEK_ROSTERS_IS_DIFF", level:"warning", message: "De muzieklessen zijn niet vergeleken met het uurrooser op Sharepoint. Klik op de knop om de lessen te vergelijken."};
        await postNotification(notif);
        await fetchAndDisplayNotifications();
    }
}
