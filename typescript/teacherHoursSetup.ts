import {Actions, createMessageHandler, sendRequest, TabType} from "./messaging";
import {TeacherHoursSubjectDef} from "./werklijst/observer";
import {emmet} from "../libs/Emmeter/html";

let handler  = createMessageHandler(TabType.HoursSettings);

chrome.runtime.onMessage.addListener(handler.getListener());

handler
    .onMessageForMyTabType(msg => {
        console.log("message for my tab type: ", msg);
        document.getElementById("container").innerHTML = "Message was for my tab type" + msg.data;
    })
    .onMessageForMe(msg => {
        console.log("message for me: ", msg);
        document.getElementById("container").innerHTML = "DATA:" + msg.data;
    })
    .onData(data => {
        document.querySelector("button").addEventListener("click", async () => {
            await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, undefined, "Hullo! Fly safe!");
        });
        console.log("tab opened: request data message sent and received: ");
        console.log(data);
        let container = document.getElementById("container");
        let tbody = container.querySelector("table>tbody") as HTMLTableSectionElement;
        tbody.innerHTML = "";
        for(let vak of data.data as TeacherHoursSubjectDef[]) {
            emmet.appendChild(tbody, `tr>(td>input[type="checkbox"])+td{${vak.text}}+td>input[type="text"]`)
        }
        document.title = data.pageTitle;
    });
