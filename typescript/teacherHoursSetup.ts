import {Actions, createMessageHandler, sendRequest, ServiceRequest, TabType} from "./messaging";
import {TeacherHoursSetup} from "./werklijst/observer";
import {emmet} from "../libs/Emmeter/html";
import {cloud} from "./cloud";
import {SubjectDef} from "./werklijst/scrapeUren";

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
    .onData(async (data: ServiceRequest) => {
        globalSetup = data.data as TeacherHoursSetup;
        let cloudData: TeacherHoursSetup = await cloud.json.fetch(createTeacherHoursFileName(globalSetup.schoolyear)).catch(e => {});
        console.log("cloud data: ", cloudData);
        if (cloudData) {
            let globalSubjectMap = new Map<string, SubjectDef>(globalSetup.subjects.map(s => [s.name, s]));
            let cloudSubjectMap = new Map<string, SubjectDef>(cloudData.subjects.map(s => [s.name, s]));
            //merge:globalData has more recent and valud subjects but cloud data has priority
            //for now, ignore the old subjects from cloud data.
            for(let [key, value] of cloudSubjectMap) {
                globalSubjectMap.set(key, value);
            }
            globalSetup.subjects = [...globalSubjectMap.values()];
        }
        document.querySelector("button").addEventListener("click", async () => {
            await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, undefined, "Hullo! Fly safe!");
        });
        let container = document.getElementById("container");
        let tbody = container.querySelector("table>tbody") as HTMLTableSectionElement;
        tbody.innerHTML = "";
        for(let vak of globalSetup.subjects) {
            let valueAttribute = "";
            if(vak.alias)
                valueAttribute = ` value="${vak.alias}"`;
            let checkedAttribute = "";
            if(vak.checked)
                checkedAttribute = ` checked="checked"`;
            emmet.appendChild(tbody, `tr>(td>input[type="checkbox" ${checkedAttribute}])+td{${vak.name}}+td>input[type="text" ${valueAttribute}]`)
        }
        tbody.onchange = (e) => {
            hasTableChanged = true;
        }
        document.title = data.pageTitle;
    });

let globalSetup: TeacherHoursSetup = undefined;

let hasTableChanged = false;

setInterval(onCheckTableChanged, 2000);

function createTeacherHoursFileName(schoolyear: string) {
    return "teacherHoursSetup_" + schoolyear+".json"; //todo: assumes globalSetup is filled.
}

function onCheckTableChanged() {
    if (!hasTableChanged)
        return;

    let rows = document.querySelectorAll("table>tbody>tr") as NodeListOf<HTMLTableRowElement>;
    let subjects = [...rows]
        .filter(row => row.cells[0].querySelector("input:checked")!== null || row.cells[2].querySelector("input").value)
        .map(row => {
            return {
                checked: row.cells[0].querySelector("input:checked") !== null,
                name: row.cells[1].textContent,
                alias: row.cells[2].querySelector("input").value,
            }
        });
    let setupData: TeacherHoursSetup = {
        schoolyear: globalSetup.schoolyear,
        subjects
    };
    hasTableChanged = false;
    let fileName = createTeacherHoursFileName(globalSetup.schoolyear);
    cloud.json.upload(fileName, setupData) //todo: make function to generate file name.
    .then(res => {
        sendRequest(Actions.HoursSettingsChanged, TabType.HoursSettings, TabType.Main, undefined, setupData);
    });
}

window.onbeforeunload = () => {
    onCheckTableChanged();
}