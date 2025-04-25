import {Actions, createMessageHandler, sendRequest, ServiceRequest, TabType} from "./messaging";
import {TeacherHoursSetup} from "./werklijst/observer";
import {emmet} from "../libs/Emmeter/html";
import {uploadJson} from "./cloud";
import {findSchooljaar} from "./globals";

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
    .onData((data: ServiceRequest) => {
        globalSetup = data.data as TeacherHoursSetup;
        document.querySelector("button").addEventListener("click", async () => {
            await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, undefined, "Hullo! Fly safe!");
        });
        let container = document.getElementById("container");
        let tbody = container.querySelector("table>tbody") as HTMLTableSectionElement;
        tbody.innerHTML = "";
        for(let vak of globalSetup.subjects) {
            emmet.appendChild(tbody, `tr>(td>input[type="checkbox"])+td{${vak.name}}+td>input[type="text"]{${vak.alias}}`)
        }
        tbody.onchange = (e) => {
            hasTableChanged = true;
        }
        document.title = data.pageTitle;
    });

let globalSetup: TeacherHoursSetup = undefined;

let hasTableChanged = false;

setInterval(onTableChanged, 5000);

function onTableChanged() {
    if (!hasTableChanged)
        return;

    let rows = document.querySelectorAll("table>tbody>tr") as NodeListOf<HTMLTableRowElement>;
    let subjects = [...rows]
        .filter(row => row.querySelector("input:checked"))
        .map(row => {
            return {
                name: row.cells[1].textContent,
                alias: row.cells[2].querySelector("input").value,
            }
        });
    let setupData: TeacherHoursSetup = {
        schoolyear: globalSetup.schoolyear,
        subjects
    };
    hasTableChanged = false;
    uploadJson("teacherHoursSetup_"+globalSetup.schoolyear, setupData) //todo: make function to generate file name.
    .then(res => {
        sendRequest(Actions.HoursSettingsChanged, TabType.HoursSettings, TabType.Main, undefined, setupData);
    });
}