import {Actions, createMessageHandler, sendRequest, ServiceRequest, TabType} from "./messaging";
import {emmet} from "../libs/Emmeter/html";
import {cloud} from "./cloud";

import {createTeacherHoursFileName, mapHourSettings, SubjectDef, TeacherHoursSetup, TeacherHoursSetupMapped, TranslationDef} from "./werklijst/hoursSettings";

let handler  = createMessageHandler(TabType.HoursSettings);

chrome.runtime.onMessage.addListener(handler.getListener());

document.addEventListener("DOMContentLoaded", onDocumentLoaded)

handler
    .onMessageForMyTabType(msg => {
        console.log("message for my tab type: ", msg);
        document.getElementById("container").innerHTML = "Message was for my tab type" + msg.data;
    })
    .onMessageForMe(msg => {
        console.log("message for me: ", msg);
        document.getElementById("container").innerHTML = "DATA:" + msg.data;
    })
    .onData(onData);

function fillSubjectsTable(cloudData: TeacherHoursSetup) {
    if (cloudData) {
        let globalSubjectMap = new Map<string, SubjectDef>(globalSetup.subjects.map(s => [s.name, s]));
        let cloudSubjectMap = new Map<string, SubjectDef>(cloudData.subjects.map(s => [s.name, s]));
        //merge:globalData has more recent and valud subjects but cloud data has priority
        //for now, ignore the old subjects from cloud data.
        for (let [key, value] of cloudSubjectMap) {
            globalSubjectMap.set(key, value);
        }
        globalSetup.subjects = [...globalSubjectMap.values()];
    }
    let container = document.getElementById("subjectsContainer");
    let tbody = container.querySelector("table>tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    for (let vak of globalSetup.subjects) {
        let validClass = "";
        let bucket = "";
        if(!vak.stillValid) {
            validClass = ".invalid";
            bucket = `+button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
        }
        let valueAttribute = "";
        if (vak.alias)
            valueAttribute = ` value="${vak.alias}"`;
        let checkedAttribute = "";
        if (vak.checked)
            checkedAttribute = ` checked="checked"`;
        emmet.appendChild(tbody, `tr>(td>input[type="checkbox" ${checkedAttribute}])+(td${validClass}>({${vak.name}}${bucket}))+td>input[type="text" ${valueAttribute}]`)
    }
    document.querySelectorAll("#subjectsContainer button.deleteRow")
        .forEach(btn => btn
            .addEventListener("click", deleteTableRow));
}

function addTranslationRow(trns: TranslationDef, tbody: HTMLTableSectionElement) {
    let text = `tr>`
        + buildField("Vind", trns.find, "trnsFind")
        + "+"
        + buildField("vervang door", trns.replace, "trnsReplace")
        + "+"
        + buildField("prefix", trns.prefix, "trnsPrefix")
        + "+"
        + buildField("suffix", trns.suffix, "trnsSuffix");
    let tr = emmet.appendChild(tbody, text).first as HTMLTableRowElement;
    let up = `button.moveUp.naked>img[src="${chrome.runtime.getURL("images/up-arrow.svg")}"]`;
    let down = `button.moveDown.naked>img.upSideDown[src="${chrome.runtime.getURL("images/up-arrow.svg")}"]`;
    let bucket = `button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
    emmet.appendChild(tr, `(td>${up})+(td>${down})+(td>${bucket})`);

    tbody.querySelectorAll("button.deleteRow")
        .forEach(btn => btn.addEventListener("click", deleteTableRow));

    function buildField(label: string, value: string, id: string){
        let attrValue = value ? ` value="${value}"` : "";
        return `(td>{${label}})+(td>input#${id}[type="text"${attrValue}])`;
    }
}

function fillTranslationsTable(cloudData: TeacherHoursSetup) {
    let container = document.getElementById("translationsContainer");
    let tbody = container.querySelector("table>tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    for (let trns of globalSetup.translations) {
        addTranslationRow(trns, tbody);
    }

    document.querySelectorAll("button.moveUp")
        .forEach(btn => btn
            .addEventListener("click", (ev) => {
                let btn = ev.target as HTMLButtonElement;
                let row = btn.closest("tr") as HTMLTableRowElement;
                let prevRow =row.previousElementSibling;
                row.parentElement.insertBefore(row, prevRow);
                hasTableChanged = true;
            }));
    document.querySelectorAll("button.moveDown")
        .forEach(btn => btn
            .addEventListener("click", (ev) => {
                let btn = ev.target as HTMLButtonElement;
                let row = btn.closest("tr") as HTMLTableRowElement;
                let nextRow =row.nextElementSibling;
                row.parentElement.insertBefore(nextRow, row);
                hasTableChanged = true;
            }));
    document.querySelectorAll("#translationsContainer button.deleteRow")
        .forEach(btn => btn.addEventListener("click", deleteTableRow));
}

function deleteTableRow(ev: Event) {
    let btn = ev.target as HTMLButtonElement;
    btn.closest("tr").remove();
    hasTableChanged = true;
}

async function onData(data: ServiceRequest) {
    document.title = data.pageTitle;
    //test...
    document.querySelector("button").addEventListener("click", async () => {
        await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, undefined, "Hullo! Fly safe!");
    });

    globalSetup = mapHourSettings(data.data as TeacherHoursSetup);
    let cloudData: TeacherHoursSetup = await cloud.json.fetch(createTeacherHoursFileName(globalSetup.schoolyear)).catch(e => {});
    fillSubjectsTable(cloudData);
    fillTranslationsTable(cloudData);
    //set change even AFTER filling the tables:
    document.querySelectorAll("tbody").forEach(tbody => tbody.addEventListener("change", (e) => {
        hasTableChanged = true;
    }));
    document.querySelector('tbody').addEventListener('input', function (e) {
        hasTableChanged = true;
    });
    document.getElementById('btnNewTranslationRow').addEventListener('click', function (e) {
        let def: TranslationDef = {
            find: "",
            replace: "",
            prefix: "",
            suffix: ""
        }
        addTranslationRow(def, document.querySelector("#translationsContainer tbody"));
        hasTableChanged = true;
    });


}

let globalSetup: TeacherHoursSetupMapped = undefined;

let hasTableChanged = false;

setInterval(onCheckTableChanged, 2000);

function scrapeSubjects() {
    let rows = document.querySelectorAll("#subjectsContainer>table>tbody>tr") as NodeListOf<HTMLTableRowElement>;
    return [...rows]
        .filter(row => row.cells[0].querySelector("input:checked") !== null || row.cells[2].querySelector("input").value)
        .map(row => {
            return {
                checked: row.cells[0].querySelector("input:checked") !== null,
                name: row.cells[1].textContent,
                alias: row.cells[2].querySelector("input").value,
                stillValid: row.cells[1].classList.contains("invalid") == false
            }
        });
}

function scrapeTranslations(): TranslationDef[] {
    let rows = document.querySelectorAll("#translationsContainer>table>tbody>tr") as NodeListOf<HTMLTableRowElement>;
    return [...rows]
        .map(row => {
            return {
                find: (row.querySelector("#trnsFind") as HTMLInputElement).value,
                replace: (row.querySelector("#trnsReplace") as HTMLInputElement).value,
                prefix: (row.querySelector("#trnsPrefix") as HTMLInputElement).value,
                suffix: (row.querySelector("#trnsSuffix") as HTMLInputElement).value,
            }
        });
}

function onCheckTableChanged() {
    if (!hasTableChanged)
        return;
    let setupData: TeacherHoursSetup = {
        schoolyear: globalSetup.schoolyear,
        subjects: scrapeSubjects(),
        translations: scrapeTranslations(),
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

function switchTab(btn: HTMLButtonElement) {
    let tabId = btn.dataset.tabId;
    let tabs = btn.parentElement;
    tabs.querySelectorAll(".tab").forEach((tab: HTMLElement) => {
        tab.classList.add("notSelected");
        document.getElementById(tab.dataset.tabId).style.display = "none";
    });
    btn.classList.remove("notSelected");
    document.getElementById(tabId).style.display = "block";
}

function onDocumentLoaded(this: Document, ev: Event) {
    let tabs = document.querySelector(".tabs");
    switchTab(tabs.querySelector(".tab"));
    document.querySelectorAll(".tabs > button.tab")
        .forEach(btn => btn
            .addEventListener("click", (ev) => {
                switch ((ev.target as HTMLElement).id) {
                    case "btnTabSubjects":
                        switchTab(ev.target as HTMLButtonElement);
                        break;
                    case "btnTabTranslations":
                        switchTab(ev.target as HTMLButtonElement);
                        break;
                }
            }));
}
