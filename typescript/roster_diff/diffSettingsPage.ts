import {Actions, createMessageHandler, DataRequestTypes, DiffSettingsDataRequestParams, sendDataRequest, sendRequest, ServiceRequest, TabType} from "../messaging";
import {emmet} from "../../libs/Emmeter/html";
import * as def from "../def";
import * as InputWithSpaces from "../webComponents/inputWithSpaces";
import {DiffSettings, TagDef} from "./diffSettings";
import {uploadDiffSettings} from "../cloud";
import {setupTabNavigation} from "../tabs";
import {ColumnValueFunc, getDefaultValueFuncs, makeTableSortable} from "../table/tableSort";

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
        + buildField("tag met", tagDef.tag, "trnsTag")
        + "+"
        + buildField("gr+jaren", tagDef.gradeYears?.toString()??"", "trnsGradeYears")
        + "+"
        + ` div.flexRow>(
                label.flexGrow[for="trnsIsClassName"]{is klasnaam:}+
                input#trnsIsClassName[type="checkbox" ${tagDef.isClassName ? 'checked="checked"' : ""} name="trnsIsClassName"]
            )
           `
    ;
    let tr = emmet.appendChild(tbody, text).first as HTMLTableRowElement;
    let bucket = `button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
    emmet.appendChild(tr, `td>${bucket}`);

    tbody.querySelectorAll("button.deleteRow")
        .forEach(btn => btn.addEventListener("click", deleteTableRow));

    function buildField(label: string, value: string, id: string){
        let attrValue = value ? ` value="${value}"` : "";
        return `(td.label>{${label}})+(td>input-with-spaces#${id}[type="text"${attrValue}])`;
    }
    let chkIsClassName = tr.querySelector("#trnsIsClassName") as HTMLInputElement;
    chkIsClassName.addEventListener("change", (_) => {
        hasDataChanged = true;
    });
}

function addIgnoresRow(ignore: string, tbody: HTMLTableSectionElement) {
    let text = `tr>` + buildField(ignore, "trnsIgnore");
    let tr = emmet.appendChild(tbody, text).first as HTMLTableRowElement;
    let bucket = `button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
    emmet.appendChild(tr, `td>${bucket}`);

    tbody.querySelectorAll("button.deleteRow")
        .forEach(btn => btn.addEventListener("click", deleteTableRow));

    function buildField(value: string, id: string){
        let attrValue = value ? ` value="${value}"` : "";
        return `(td>input-with-spaces#${id}[type="text"${attrValue}])`;
    }
}

function fillTagDefTable(diffSettings: DiffSettings) {
    let container = document.getElementById("tagDefsContainer")!;
    let table = container.querySelector("table") as HTMLTableElement;
    let tbody = container.querySelector("table>tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    for (let tagDef of diffSettings.tagDefs) {
        addTranslationRow(tagDef, tbody);
    }

    document.querySelectorAll("#tagDefsContainer button.deleteRow")
        .forEach(btn => btn.addEventListener("click", deleteTableRow));
    let valueFuncs: ColumnValueFunc[] = getDefaultValueFuncs(table);
    valueFuncs[1] = getInputWithSpacesValue; // searchText
    valueFuncs[3] = getInputWithSpacesValue; // tag
    valueFuncs[5] = getInputWithSpacesValue; // grades+years

    makeTableSortable(table, valueFuncs);
}

let getInputWithSpacesValue: ColumnValueFunc = (td: HTMLTableCellElement) => {
    return (td.querySelector("input-with-spaces") as InputWithSpaces.Type).value;
};

function fillIgnoresTable(diffSettings: DiffSettings) {
    let container = document.getElementById("ignoresContainer")!;
    let tbody = container.querySelector("table>tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    for (let ignore of diffSettings.ignoreList) {
        addIgnoresRow(ignore, tbody);
    }

    document.querySelectorAll("#tagDefsContainer button.deleteRow")
        .forEach(btn => btn.addEventListener("click", deleteTableRow));
}

function fillUrls(diffSettings: DiffSettings) {
    let txtUrls = document.getElementById("txtWebPages") as HTMLTextAreaElement;
    txtUrls.value = (diffSettings.urls??[]).join("\n");
}

function deleteTableRow(ev: Event) {
    let btn = ev.target as HTMLButtonElement;
    btn.closest("tr")!.remove();
    hasDataChanged = true;
}

async function onData(request: ServiceRequest<any>) {
    let title = "Uurrooster tags voor schooljaar " + request.data.schoolYear;
    document.title = title;
    document.getElementById(def.SETUP_HOURS_TITLE_ID)!.innerHTML = title;
    //test...
    document.querySelector("button")!.addEventListener("click", async () => {
        await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, undefined, "Hullo! Fly safe!");
    });

    globalSetup = request.data as DiffSettings;
    fillTagDefTable(request.data as DiffSettings);
    fillIgnoresTable(request.data as DiffSettings);
    fillUrls(request.data as DiffSettings);
    //set change even AFTER filling the tables:
    document.querySelectorAll("tbody").forEach(tbody => tbody.addEventListener("change", (_) => {
        hasDataChanged = true;
    }));
    document.querySelectorAll('tbody').forEach(el => el.addEventListener('input', function (_) {
        hasDataChanged = true;
    }));
    document.getElementById('btnNewTranslationRow')!.addEventListener('click', function (_) {
        let def: TagDef = {
            tag: "",
            searchString: "",
            gradeYears: "",
        }
        addTranslationRow(def, document.querySelector("#tagDefsContainer tbody")!);
        hasDataChanged = true;
    });
    document.getElementById('btnNewIgnoresRow')!.addEventListener('click', function (_) {
        let ignore =  "";
        addIgnoresRow(ignore, document.querySelector("#ignoresContainer tbody")!);
        hasDataChanged = true;
    });
    let txtUrls = document.getElementById("txtWebPages") as HTMLTextAreaElement;
    txtUrls.addEventListener("input", (_) => {
        hasDataChanged = true;
    });
    //add blur event
    txtUrls.addEventListener("blur", (_) => {
        hasDataChanged = true;
    });
}

let globalSetup: DiffSettings | undefined = undefined;

let hasDataChanged = false;

setInterval(() => {
    if(globalSetup)
        onCheckTableChanged(globalSetup);
}, 1000);


function scrapeTagDefs(): TagDef[] {
    let rows = document.querySelectorAll("#tagDefsContainer>table>tbody>tr") as NodeListOf<HTMLTableRowElement>;
    return [...rows]
        .map(row => {
            let gradeYears = (row.querySelector("#trnsGradeYears") as InputWithSpaces.Type).value.trim();
            let isClassName = (row.querySelector("#trnsIsClassName") as HTMLInputElement).checked;
            return {
                searchString: (row.querySelector("#trnsFind") as InputWithSpaces.Type).value.toLowerCase(),
                tag: (row.querySelector("#trnsTag") as InputWithSpaces.Type).value,
                gradeYears,
                isClassName
            } satisfies TagDef
        });
}

function scrapeIgnores(): string[] {
    let rows = document.querySelectorAll("#ignoresContainer>table>tbody>tr") as NodeListOf<HTMLTableRowElement>;
    return [...rows]
        .map(row => (row.querySelector("#trnsIgnore") as InputWithSpaces.Type).value);
}

function onCheckTableChanged(diffSettings: DiffSettings) {
    if (!hasDataChanged)
        return;
    let txtUrls = document.getElementById("txtWebPages") as HTMLTextAreaElement;
    let urls = txtUrls.value
        .split("\n")
        .map(s => s.trim())
        .filter(s => s.length > 0);
    let setupData: DiffSettings = {
        version: 1,
        academie: diffSettings.academie,
        schoolYear: diffSettings.schoolYear,
        tagDefs: scrapeTagDefs(),
        ignoreList: scrapeIgnores(),
        urls
    };
    hasDataChanged = false;
    uploadDiffSettings(diffSettings.academie, diffSettings.schoolYear, setupData)
        .then(_ => {
            sendRequest(Actions.DiffSettingsChanged, TabType.DiffSettings, TabType.Main, undefined, setupData).then(_ => {});
        });
}

window.onbeforeunload = () => {
    if(globalSetup)
        onCheckTableChanged(globalSetup);
}

async function onDocumentLoaded(this: Document, _: Event) {
    setupTabNavigation();
    let params = new URLSearchParams(document.location.search);
    let schoolYear = params.get("schoolyear")!;
    let academie = params.get("academie")!;
    await sendDataRequest<DiffSettingsDataRequestParams>(TabType.DiffSettings, DataRequestTypes.DiffSettings, {academie, schoolYear});
}

