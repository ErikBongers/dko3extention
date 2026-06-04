import {Actions, createMessageHandler, DataRequestTypes, DiffSettingsDataRequestParams, sendDataRequest, sendRequest, ServiceRequest, TabType} from "../messaging";
import {emmet} from "../../libs/Emmeter/html";
import * as def from "../def";
import * as InputWithSpaces from "../webComponents/inputWithSpaces";
import {DiffSettings, PreTranslation, TagDef} from "./diffSettings";
import {uploadDiffSettings} from "../cloud";
import {ColumnValueFunc, getDefaultValueFuncs, makeTableSortable} from "../table/tableSort";
import {Tabs} from "../tabs";
import {CloseBeforeSavePreventer} from "../closeBeforeSavePreventer";

let handler  = createMessageHandler(TabType.DiffSettings);

InputWithSpaces.registerWebComponent();

chrome.runtime.onMessage.addListener(handler.getListener());

document.addEventListener("DOMContentLoaded", onDocumentLoaded);

let dataUploader = new CloseBeforeSavePreventer(saveIfDataChanged, 1000);

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
        + buildLabeledDecoratedTextField("Vind", tagDef.searchString, "trnsFind")
        + "+"
        + buildLabeledDecoratedTextField("tag met", tagDef.tag, "trnsTag")
        + "+"
        + buildLabeledDecoratedTextField("gr+jaren", tagDef.gradeYears?.toString()??"", "trnsGradeYears")
        + "+"
        + ` div.flexRow>(
                label.flexGrow[for="trnsIsClassName"]{is klasnaam:}+
                input#trnsIsClassName[type="checkbox" ${tagDef.isClassName ? 'checked="checked"' : ""} name="trnsIsClassName"]
            )
           `
    ;
    let tr = emmet.appendChild(tbody, text).first as HTMLTableRowElement;
    addDeleteButton(tr);

    let chkIsClassName = tr.querySelector("#trnsIsClassName") as HTMLInputElement;
    chkIsClassName.addEventListener("change", (_) => {
        dataUploader.setDataChanged();
    });
}

function addPreTranslationRow(preTrans: PreTranslation, tbody: HTMLTableSectionElement) {
    let text = `tr>`
        + buildLabeledDecoratedTextField("Als", preTrans.trigger, "trnsTrigger")
        + "+"
        + buildLabeledDecoratedTextField("vind", preTrans.search, "trnsSearch")
        + "+"
        + buildLabeledDecoratedTextField("vervang door", preTrans.replace, "trnsReplace")
        + "+"
        + buildLabeledDecoratedTextField("", preTrans.dscr, "trnsDscr")
    let tr = emmet.appendChild(tbody, text).first as HTMLTableRowElement;
    addDeleteButton(tr);
}

function buildLabeledDecoratedTextField(label: string, value: string, id: string){
    let attrValue = value ? ` value="${value}"` : "";
    return `(td.label>{${label}})+(td>input-with-spaces#${id}[type="text"${attrValue}])`;
}

function addDeleteButton(tr: HTMLTableRowElement) {
    let bucket = `button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
    emmet.appendChild(tr, `td>${bucket}`);

    tr.querySelectorAll("button.deleteRow")
        .forEach(btn => btn.addEventListener("click", deleteTableRow));
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

    let valueFuncs: ColumnValueFunc[] = getDefaultValueFuncs(table);
    valueFuncs[1] = getInputWithSpacesValue; // searchText
    valueFuncs[3] = getInputWithSpacesValue; // tag
    valueFuncs[5] = getInputWithSpacesValue; // grades+years

    makeTableSortable(table, valueFuncs);
}

function fillPreTransTable(diffSettings: DiffSettings) {
    let container = document.getElementById("tagPreTransContainer")!;
    let table = container.querySelector("table") as HTMLTableElement;
    let tbody = container.querySelector("table>tbody") as HTMLTableSectionElement;
    tbody.innerHTML = "";
    if(!diffSettings.preTranslations)
        diffSettings.preTranslations = [];
    for (let preTrans of diffSettings.preTranslations) {
        addPreTranslationRow(preTrans, tbody);
    }

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
    dataUploader.setDataChanged();
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
    fillPreTransTable(request.data as DiffSettings);
    fillIgnoresTable(request.data as DiffSettings);
    fillUrls(request.data as DiffSettings);
    //set change even AFTER filling the tables:
    document.querySelectorAll("tbody").forEach(tbody => tbody.addEventListener("change", (_) => {
        dataUploader.setDataChanged();
    }));
    document.querySelectorAll('tbody').forEach(el => el.addEventListener('input', function (_) {
        dataUploader.setDataChanged();
    }));
    document.getElementById('btnNewTranslationRow')!.addEventListener('click', function (_) {
        let def: TagDef = {
            tag: "",
            searchString: "",
            gradeYears: "",
        }
        addTranslationRow(def, document.querySelector("#tagDefsContainer tbody")!);
        dataUploader.setDataChanged();
    });
    document.getElementById('btnNewPreTranslationRow')!.addEventListener('click', function (_) {
        let def: PreTranslation = {
            trigger: "",
            search: "",
            replace: "",
            dscr: "",
        }
        addPreTranslationRow(def, document.querySelector("#tagPreTransContainer tbody")!);
        dataUploader.setDataChanged();
    });
    document.getElementById('btnNewIgnoresRow')!.addEventListener('click', function (_) {
        let ignore =  "";
        addIgnoresRow(ignore, document.querySelector("#ignoresContainer tbody")!);
        dataUploader.setDataChanged();
    });
    let txtUrls = document.getElementById("txtWebPages") as HTMLTextAreaElement;
    txtUrls.addEventListener("input", (_) => {
        dataUploader.setDataChanged();
    });
    //add blur event
    txtUrls.addEventListener("blur", (_) => {
        dataUploader.setDataChanged();
    });
}

let globalSetup: DiffSettings | undefined = undefined;

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

function scrapePreTranslations() {
    let rows = document.querySelectorAll("#tagPreTransContainer>table>tbody>tr") as NodeListOf<HTMLTableRowElement>;
    return [...rows]
        .map(row => {
            let trigger = (row.querySelector("#trnsTrigger") as InputWithSpaces.Type).value.trim();
            let search = (row.querySelector("#trnsSearch") as InputWithSpaces.Type).value.trim();
            let replace = (row.querySelector("#trnsReplace") as InputWithSpaces.Type).value.trim();
            let dscr = (row.querySelector("#trnsDscr") as InputWithSpaces.Type).value.trim();
            return {
                trigger,
                search,
                replace,
                dscr,
            } satisfies PreTranslation
        });
}

async function saveIfDataChanged() {
    if(!globalSetup)
        return;
    let txtUrls = document.getElementById("txtWebPages") as HTMLTextAreaElement;
    let urls = txtUrls.value
        .split("\n")
        .map(s => s.trim())
        .filter(s => s.length > 0);
    let setupData: DiffSettings = {
        version: 1,
        academie: globalSetup.academie,
        schoolYear: globalSetup.schoolYear,
        tagDefs: scrapeTagDefs(),
        ignoreList: scrapeIgnores(),
        preTranslations: scrapePreTranslations(),
        urls
    };
    await uploadDiffSettings(globalSetup.academie, globalSetup.schoolYear, setupData)
    await sendRequest(Actions.DiffSettingsChanged, TabType.DiffSettings, TabType.Main, undefined, setupData).then(_ => {});
}

async function onDocumentLoaded(this: Document, _: Event) {
    let tabs = new Tabs(document.querySelector("div.tabsContainer")!, [
        { btnId: "btnTabTagDefs", tabId: "tabTagDefs",  btnContent: "Tags" },
        { btnId: "btnTabIgnores", tabId: "tabIgnores", btnContent: "Negeer" },
        { btnId: "btnTabPreTranslations", tabId: "tabPreTranslations", btnContent: "Voor-vertalingen" },
        { btnId: "btnTabWebPages", tabId: "tabWebPages",  btnContent: "Web pagina's" },
    ]);
    tabs.switch(0);
    let params = new URLSearchParams(document.location.search);
    let schoolYear = params.get("schoolyear")!;
    let academie = params.get("academie")!;
    await sendDataRequest<DiffSettingsDataRequestParams>(TabType.DiffSettings, DataRequestTypes.DiffSettings, {academie, schoolYear});
}

