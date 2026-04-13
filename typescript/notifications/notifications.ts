import { unreachable } from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {fetchNotifications} from "../cloud";
import {gotoDiffPage} from "../menu";
import {NotificationId, Notifications} from "./types";

export function setupNotifications() {
    let navBar = document.getElementById("dko3_navbar") as HTMLDivElement;
    let secondUl = navBar.querySelectorAll("ul").item(1);
    emmet.insertBefore(secondUl, "div#navBarNotifDiv>button#notifButton.noBorder{5}");
}

export async function updateNotificationsInNavBar(notifications?: Notifications) {
    console.log("checking...");
    if(!notifications)
        notifications = await fetchNotifications();
    let notifButton = document.getElementById("notifButton") as HTMLButtonElement;
    let count = Object.keys(notifications.notifications).length;
    notifButton.innerHTML = count.toString();
    notifButton.style.display = count > 0 ? "block" : "none";
}

const FAST_SPEED_IN_SECONDS = 5;
const NORMAL_SPEED_IN_SECONDS = 5*60;

export type PollSpeed = "fast" | "normal";
let pollSpeedInSeconds = -1;
export function setPollTimer(speed: PollSpeed) {
   switch (speed) {
       case "fast": pollSpeedInSeconds = FAST_SPEED_IN_SECONDS; break;
       case "normal": pollSpeedInSeconds = NORMAL_SPEED_IN_SECONDS; break;
       default: unreachable(speed);
   }
   setTimeout(backToNormalSpeed, 1000*60);
}
setInterval(updateNotificationsInNavBar, 1000*10);

function backToNormalSpeed() {
    setPollTimer('normal');
}

export async function fetchAndDisplayNotifications() {
    let notifications = await fetchNotifications();
    await updateNotificationsInNavBar(notifications);
    let notificationsDiv = document.querySelector("#dko3_plugin_notifications > div > div") as HTMLDivElement;
    let propNames = Object.getOwnPropertyNames(notifications.notifications) as NotificationId[];

    notificationsDiv.innerHTML = "";
    for (let propName of propNames) {
        let notif = notifications.notifications[propName];
        let imgUrl = chrome.runtime.getURL("images/waiting.gif");
        switch (notif.level) {
            case "warning":
                imgUrl = chrome.runtime.getURL("images/warning.png");
                break;
            case "error":
                imgUrl = chrome.runtime.getURL("images/error.png");
                break;
            case "running":
                imgUrl = chrome.runtime.getURL("images/waiting.gif");
                break;
            case "info":
                imgUrl = chrome.runtime.getURL("images/info.png");
                break;
        }
        let html: string = `
            <div class="notif notif-${notif.level}">
            <div class="notif-img">
                <img src="${imgUrl}" alt="todo">
            </div>
            <div>${notif.message}</div>
            </div>
            `;
        let notifDiv = emmet.appendChild(notificationsDiv, "div").first as HTMLDivElement;
        notifDiv.innerHTML = html;
        let button = notifDiv.querySelector("button") as HTMLButtonElement;
        if(!button)
            continue;
        button.onclick = () => {
            doNotificationAction(notif.id);
        }
    }
}

function doNotificationAction(id: NotificationId) {
    console.log("doing action for notification: " + id);
    switch (id) {
        case "WOORD_ROSTERS_IS_DIFF":
            gotoDiffPage();
            break;
    }

}
