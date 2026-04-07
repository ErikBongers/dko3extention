import { unreachable } from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {fetchNotifications, Notifications} from "../cloud";

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

