import {unreachable} from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {deleteNotification, fetchNotifications} from "../cloud";
import {NotificationId, Notifications} from "./types";
import {options} from "../plugin_options/options";

export function getNotifRedButton() {
    let notifButton = document.getElementById("notifButton") as HTMLButtonElement;
    if(notifButton)
        return notifButton;
    let navBar = document.getElementById("dko3_navbar") as HTMLDivElement;
    let secondUl = navBar.querySelectorAll("ul").item(1);
    return emmet.insertBefore(secondUl, "div#navBarNotifDiv>button#notifButton.noBorder{5}").last as HTMLButtonElement;
}

export async function updateNotificationsInNavBar(notifications?: Notifications) {
    if(!notifications)
        notifications = await fetchNotifications();
    let notifButton = getNotifRedButton();
    let count = Object.keys(notifications.notifications).length;
    notifButton.innerHTML = count.toString();
    notifButton.style.display = count > 0 ? "block" : "none";
    notifButton.onclick = () => {
        location.href = "https://administratie.dko3.cloud/#start?page=mijn_tijdslijn";
    };
}

const FAST_SPEED_IN_SECONDS = 5;
const NORMAL_SPEED_IN_SECONDS = 5*60;

export type PollSpeed = "fast" | "normal";
let pollSpeedInSeconds = 1000*NORMAL_SPEED_IN_SECONDS;
export function setPollTimer(speed: PollSpeed) {
   switch (speed) {
       case "fast": pollSpeedInSeconds = FAST_SPEED_IN_SECONDS; break;
       case "normal": pollSpeedInSeconds = NORMAL_SPEED_IN_SECONDS; break;
       default: unreachable(speed);
   }
   setTimeout(backToNormalSpeed, 1000*pollSpeedInSeconds);
}
setInterval(fetchAndDisplayNotifications, 1000*pollSpeedInSeconds);

function backToNormalSpeed() {
    setPollTimer('normal');
}

export async function fetchAndDisplayNotifications() {
    let notifications = await fetchNotifications();
    await updateNotificationsInNavBar(notifications);
    let notificationsWrapper = document.querySelector("#dko3_plugin_notifications") as HTMLDivElement;
    let notificationsDiv = document.querySelector("#dko3_plugin_notifications > div > div") as HTMLDivElement;
    if(!notificationsDiv)
        return;
    let count = Object.keys(notifications.notifications).length;
    notificationsWrapper.style.display = count > 0 ? "block" : "none";
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
        let delButtonClass = "";
        if (options.allowDeleteNotif) {
            delButtonClass = "allowDelete"
        }
        let html: string = `
            <div class="notif notif-${notif.level} ${delButtonClass}">
                <button class="deleteNotif noBorder" data-id="${notif.id}"  ><i class="fas fa-trash"></i></button>
                <div class="notif-img">
                    <img src="${imgUrl}" alt="todo">
                </div>
            <div>${notif.message}</div>
            </div>
            `;
        let notifDiv = emmet.appendChild(notificationsDiv, "div").first as HTMLDivElement;
        notifDiv.innerHTML = html;
        let button = notifDiv.querySelector("button.action") as HTMLButtonElement;
        if(!button)
            continue;
        button.onclick = () => {
            doNotificationAction(notif.id);
        }
    }
    notificationsDiv.querySelectorAll("button.deleteNotif").forEach((button:HTMLButtonElement) => {
        button.onclick = async (ev) => {
            let button = ev.currentTarget as HTMLButtonElement;
            let notifId = button.dataset.id;
            await deleteNotification(notifId as NotificationId);
            await fetchAndDisplayNotifications();
        }
    })
}

function doNotificationAction(id: NotificationId) {
    // console.log("doing action for notification: " + id);
    // switch (id) {
    //     case "WOORD_ROSTERS_IS_DIFF":
    //         gotoDiffPage();
    //         break;
    // }
}
