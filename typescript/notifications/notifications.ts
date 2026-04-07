import { unreachable } from "../globals";
import {emmet} from "../../libs/Emmeter/html";

export function setupNotifications() {
    let navBar = document.getElementById("dko3_navbar") as HTMLDivElement;
    let secondUl = navBar.querySelectorAll("ul").item(1);
    emmet.insertBefore(secondUl, "div#navBarNotifDiv>button.noBorder{2}");
}

function checkNotifications() {
    console.log("checking...");
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
setInterval(checkNotifications, 1000*10);

function backToNormalSpeed() {
    setPollTimer('normal');
}

