import {Actions, createMessageHandler, DataRequestTypes, DiffSettingsDataRequestParams, sendDataRequest, sendRequest, ServiceRequest, TabType} from "../messaging";
import {emmet} from "../../libs/Emmeter/html";
import * as def from "../def";
import * as InputWithSpaces from "../webComponents/inputWithSpaces";
import {DiffSettings, saveDiffSettings, TagDef} from "./diffSettings";

let handler  = createMessageHandler(TabType.DiffSettings);

InputWithSpaces.registerWebComponent();

chrome.runtime.onMessage.addListener(handler.getListener());

document.addEventListener("DOMContentLoaded", onDocumentLoaded)

handler
    .onMessageForMyTabType(msg => {
        console.log("diff setup page: message for my tab type: ", msg);
    })
    .onMessageForMe(msg => {
        console.log("diff setup page: message for me: ", msg);
    })
    .onData(onData);

function addTranslationRow(tagDef: TagDef, tbody: HTMLTableSectionElement) {
    let text = `tr>`
        + buildField("Vind", tagDef.searchString, "trnsFind")
        + "+"
        + buildField("vervang door", tagDef.tag, "trnsTag");
    let tr = emmet.appendChild(tbody, text).first as HTMLTableRowElement;
    let bucket = `button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
    emmet.appendChild(tr, `td>${bucket}`);

    tbody.querySelectorAll("button.deleteRow")
        .forEach(btn => btn.addEventListener("click", deleteTableRow));

    function buildField(label: string, value: string, id: string){
        let attrValue = value ? ` value="${value}"` : "";
        return `(td>{${label}})+(td>input-with-spaces#${id}[type="text"${attrValue}])`;
    }
}

function fillTagDefTable(diffSettings: DiffSettings) {
    let container = document.getElementById("tagDefsContainer")!;
    let tbody = container.querySelector("table>tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    for (let tagDef of diffSettings.tagDefs) {
        addTranslationRow(tagDef, tbody);
    }

    document.querySelectorAll("#tagDefsContainer button.deleteRow")
        .forEach(btn => btn.addEventListener("click", deleteTableRow));
}

function deleteTableRow(ev: Event) {
    let btn = ev.target as HTMLButtonElement;
    btn.closest("tr")!.remove();
    hasTableChanged = true;
}

async function onData(request: ServiceRequest) {
    let title = "Uurrooster tags voor schooljaar " + request.data.schoolyear;
    document.title = title;
    document.getElementById(def.SETUP_HOURS_TITLE_ID)!.innerHTML = title;
    //test...
    document.querySelector("button")!.addEventListener("click", async () => {
        await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, undefined, "Hullo! Fly safe!");
    });

    globalSetup = request.data as DiffSettings;
    fillTagDefTable(request.data as DiffSettings);
    //set change even AFTER filling the tables:
    document.querySelectorAll("tbody").forEach(tbody => tbody.addEventListener("change", (_) => {
        hasTableChanged = true;
    }));
    document.querySelectorAll('tbody').forEach(el => el.addEventListener('input', function (_) {
        hasTableChanged = true;
    }));
    document.getElementById('btnNewTranslationRow')!.addEventListener('click', function (_) {
        let def: TagDef = {
            tag: "",
            searchString: ""
        }
        addTranslationRow(def, document.querySelector("#tagDefsContainer tbody")!);
        hasTableChanged = true;
    });
}

let globalSetup: DiffSettings | undefined = undefined;

let hasTableChanged = false;

setInterval(() => {
    if(globalSetup)
        onCheckTableChanged(globalSetup);
}, 1000);


function scrapeTagDefs(): TagDef[] {
    let rows = document.querySelectorAll("#tagDefsContainer>table>tbody>tr") as NodeListOf<HTMLTableRowElement>;
    return [...rows]
        .map(row => {
            return {
                searchString: (row.querySelector("#trnsFind") as InputWithSpaces.Type).value,
                tag: (row.querySelector("#trnsTag") as InputWithSpaces.Type).value,
            }
        });
}

function onCheckTableChanged(diffSettings: DiffSettings) {
    if (!hasTableChanged)
        return;
    let setupData: DiffSettings = {
        version: 1,
        schoolyear: diffSettings.schoolyear,
        tagDefs: scrapeTagDefs(),
        ignoreList: globalSetup.ignoreList //todo: scrape
    };
    hasTableChanged = false;
    saveDiffSettings(setupData)
        .then(_ => {
            sendRequest(Actions.DiffSettingsChanged, TabType.DiffSettings, TabType.Main, undefined, setupData).then(_ => {});
        });
}

window.onbeforeunload = () => {
    if(globalSetup)
        onCheckTableChanged(globalSetup);
}

function switchTab(btn: HTMLButtonElement) {
    let tabId = btn.dataset.tabId!;
    let tabs = btn.parentElement!;
    tabs.querySelectorAll(".tab")!.forEach((tab: HTMLElement) => {
        tab.classList.add("notSelected");
        document.getElementById(tab.dataset.tabId!)!.style.display = "none";
    });
    btn.classList.remove("notSelected");
    document.getElementById(tabId)!.style.display = "block";
}

async function onDocumentLoaded(this: Document, _: Event) {
    let tabs = document.querySelector(".tabs")!;
    switchTab(tabs.querySelector(".tab")!);
    document.querySelectorAll(".tabs > button.tab")
        .forEach(btn => btn
            .addEventListener("click", (ev) => {
                switch ((ev.target as HTMLElement).id) {
                    case "btnTabTagDefs":
                        switchTab(ev.target as HTMLButtonElement);
                        break;
                    case "btnTabTranslations":
                        switchTab(ev.target as HTMLButtonElement);
                        break;
                    case "btnTabGradeYears":
                        switchTab(ev.target as HTMLButtonElement);
                        break;
                }
            }));
    let params = new URLSearchParams(document.location.search);
    let schoolYear = params.get("schoolyear")!;
    await sendDataRequest<DiffSettingsDataRequestParams>(TabType.DiffSettings, DataRequestTypes.DiffSettings, {schoolYear});
}

