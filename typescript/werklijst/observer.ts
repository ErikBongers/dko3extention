import {addButton, arrayIsEqual, copyToClipboardOrRequestRetry, getSchoolIdString, openHoursSettings, Schoolyear, tryUntilThen} from "../globals";
import * as def from "../def";
import {BTN_WERKLIJST_NAV_BOTTOM} from "../def";
import {rebuildHoursTable} from "./buildUren";
import {TableFetcher} from "../table/tableFetcher";
import {fetchHoursSettingsOrSaveDefault} from "./prefillInstruments";
import {HashObserver} from "../pageObserver";
import {NamedCellTableFetchListener, NotHTMLTemplate} from "../pageHandlers";
import {decorateTableHeader} from "../table/tableHeaders";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {registerChecksumHandler} from "../table/observer";
import {createDefaultTableFetcher, createDefaultTableRefAndInfoBlock} from "../table/loadAnyTable";
import {Actions, sendRequest, ServiceRequest, TabType} from "../messaging";
import {TeacherHoursSetup} from "./hoursSettings";
import {emmet} from "../../libs/Emmeter/html";
import {createInfoBlock, getInfoBlock, InfoBlock} from "../infoBlock";
import {fetchMailMergeData} from "../table/mailMerge";
import {TeacherHoursCachedState} from "./teacherHoursCachedState";
import {hasWerklijstNoCriteria, scrapeCriteria, scrapeSelectedFieldIndexes} from "./criteria";
import MessageSender = chrome.runtime.MessageSender;

const TARGET_BUTTON_ID = "#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)";

registerChecksumHandler(def.WERKLIJST_TABLE_ID,  (tableDef: TableFetcher) => {
    let headers = NamedCellTableFetchListener.getHeaderIndices(tableDef.tableRef.getOrgTableContainer() as NotHTMLTemplate);
    let fields = [...headers].map(([key, value]) => key);
    let criteria =  document.querySelector("#view_contents > div.alert.alert-info")
        ?.textContent.replace("Criteria aanpassen", "")
        ?.replace("Criteria:", "") ?? "";
    return criteria + "__" + fields.join("_");
    }
);

class WerklijstObserver extends HashObserver {
    constructor() {
        super("#leerlingen-werklijst", onMutation, false, onPageReallyLoaded);
    }
    isPageReallyLoaded()  {
        return isPageReallyLoaded();
    }
}

let observer = new WerklijstObserver();
export default observer;

/*
Werklijst has 2 incarnations:
  * Criteria selection (hash #leerlingen-werklijst)
  * Result (hash #leerlingen-werklijst$werklijst)

Unforunatelly hash changes don't cause a page reload, therefore of limited use.

*/

let pageIncarnationChanged = true;
window.addEventListener("hashchange", () => {
    pageIncarnationChanged = true;
    let divViewContents = document.getElementById("view_contents") as HTMLDivElement;
    divViewContents.classList.remove("hideWerklijst");
});

function isPageReallyLoaded()  {
    if (document.querySelector(def.BTN_WERKLIJST_MAKEN_ID))
        return true;
    if (document.getElementById(BTN_WERKLIJST_NAV_BOTTOM)
        && document.querySelector(TARGET_BUTTON_ID))
        return true;
    return false;
}

function onPageReallyLoaded() {
    onAnyChangeEvent();
}

function onAnyChangeEvent() {
    if(!pageIncarnationChanged){
        return;
    }
    pageIncarnationChanged = false;
    console.log("onAnyChangeEvent");
    if (document.querySelector(def.BTN_WERKLIJST_MAKEN_ID)) {
        onCriteriaShown();
    } else if (document.getElementById(def.BTN_WERKLIJST_NAV_BOTTOM)) {
        onResultsShown();
    }
}

function onMutation(mutation: MutationRecord) {
    console.log("onMutation");
    tryUntilThen(isPageReallyLoaded, onAnyChangeEvent);
    return true;
}

async function gotoWerklijst() {
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    pageState.goto = Goto.None;
    saveGotoState(pageState);
    location.href = "#leerlingen-werklijst";
    location.reload();
}

function addHoursViewButtons(infoBlock: InfoBlock) {
    let buttonBar = document.querySelector("#pluginContainer .werklijstButtonWrapper") as HTMLDivElement;
    addHoursButtons(buttonBar, infoBlock);
    addButton(buttonBar, def.UREN_REFRESH_BTN_ID, "Refresh", async () => { await reload(); }, "fa-refresh", ["btn", "btn-outline-dark"], "Refresh ", "beforeend");
    addButton(buttonBar, def.GOTO_WERKLIJST_BTN_ID, "Werklijst", gotoWerklijst, "", ["btn", "btn-outline-dark", "flexRight"], "Werklijst", "beforeend");
}

async function reload() {
    if(!globals)
        return; //oops...
    document.getElementById(def.HOURS_TABLE_ID)?.remove();
    globals = new TeacherHoursCachedState(globals.schoolYear, getInfoBlock());
    await fetchAndShowTeacherHours(globals.schoolYear, getInfoBlock());
}
function checkStateAndGotoTeacherHours(infoBlock: InfoBlock) {
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    if(pageState.goto == Goto.Werklijst_uren_prevYear) {
        showHoursView(Schoolyear.toFullString(Schoolyear.calculateCurrent()), infoBlock).then(() => {});
        return true;
    }
    if(pageState.goto == Goto.Werklijst_uren_nextYear) {
        showHoursView(Schoolyear.toFullString(Schoolyear.calculateCurrent() + 1), infoBlock).then(() => {});
        return true;
    }
    return false;
}

function addHoursButtons(buttonBar: HTMLDivElement, infoBlock: InfoBlock) {
    document.getElementById(def.UREN_PREV_BTN_ID)?.remove();
    document.getElementById(def.UREN_NEXT_BTN_ID)?.remove();
    document.getElementById(def.UREN_PREV_SETUP_BTN_ID)?.remove();
    let schoolYear = Schoolyear.getHighestAvailable();
    if(!schoolYear) {
        alert("Geen schooljaar gevonden!");
        return;
    }
    let year = parseInt(schoolYear);
    let prevSchoolyear = Schoolyear.toFullString(year-1);
    let nextSchoolyear = Schoolyear.toFullString(year);
    let prevSchoolyearShort = Schoolyear.toShortString(year-1);
    let nextSchoolyearShort = Schoolyear.toShortString(year);
    addButton(buttonBar, def.UREN_PREV_BTN_ID, "Toon lerarenuren voor " + prevSchoolyear, async () => { await showHoursView(prevSchoolyear, infoBlock); }, "", ["btn", "btn-outline-dark"], "Uren " + prevSchoolyearShort, "beforeend");
    addButton(buttonBar, def.UREN_NEXT_BTN_ID, "Toon lerarenuren voor " + nextSchoolyear, async () => { await showHoursView(nextSchoolyear, infoBlock); }, "", ["btn", "btn-primary"], "Uren " + nextSchoolyearShort, 'beforeend');
    addButton(buttonBar, def.UREN_PREV_SETUP_BTN_ID, "Setup voor " + nextSchoolyear, async () => { await showUrenSetup(nextSchoolyear); }, "", ["btn", "btn-outline-dark"], "", "beforeend", "gear.svg");
}

async function showHoursView(schoolYaar: string, infoBlock: InfoBlock) {
    addHoursViewButtons(infoBlock);
    await fetchAndShowTeacherHours(schoolYaar, infoBlock);
}

function addPluginContainer() {
    let viewContents = document.getElementById("view_contents") as HTMLDivElement;
    let container = emmet.appendChild(viewContents, "div#"+def.PLUGIN_CONTAINER_ID).first as HTMLDivElement;
    let schoolYear = Schoolyear.getHighestAvailable();
    if(!schoolYear) {
        alert("Geen schooljaar gevonden!");
        return createInfoBlock(container, "");
    }
    let buttonBar = emmet.appendChild(container, `
        div.d-flex.werklijstButtonWrapper
    `).first as HTMLDivElement;

    emmet.appendChild(container, "h4");
    return createInfoBlock(container, "");
}

function onResultsShown() {
    console.log("onResultsShown");
    let infoBlock = addPluginContainer();
    if(checkStateAndGotoTeacherHours(infoBlock))
        return;

    addButtons();
    decorateTableHeader(document.querySelector("table#"+def.WERKLIJST_TABLE_ID) as HTMLTableElement, true);
}

function onCriteriaShown() {
    console.log("onCriteriaShown");
    let infoBlock = addPluginContainer();
    if(checkStateAndGotoTeacherHours(infoBlock))
        return;
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    pageState.werklijstTableName = "";
    saveGotoState(pageState);
    let btnWerklijstMakenWrapper = document.querySelector(def.BTN_WERKLIJST_MAKEN_WRAPPER_ID) as HTMLDivElement;
    if(btnWerklijstMakenWrapper) {
        return;
    }

    let btnWerklijstMaken = document.querySelector(def.BTN_WERKLIJST_MAKEN_ID) as HTMLButtonElement;
    btnWerklijstMakenWrapper = emmet.insertBefore(btnWerklijstMaken, `div#${def.BTN_WERKLIJST_MAKEN_WRAPPER_ID}.werklijstButtonWrapper`).first as HTMLDivElement;
    // btnWerklijstMakenWrapper.appendChild(btnWerklijstMaken);

    addHoursButtons(btnWerklijstMakenWrapper, infoBlock);
    addButton(btnWerklijstMaken, def.WERKLIJST_MAILMERGE_BTN_ID, "Mail merge", async () => { await mailMergeStartSchoolyear(); }, "", ["btn", "btn-outline-dark"], "Mailmerge");

    document.getElementById("btn_leerling_werklijst_reset")!.addEventListener("click", resetPageIncarnationChangedFlag);

    getSchoolIdString();
}

function resetPageIncarnationChangedFlag() {
    pageIncarnationChanged = true;
}

chrome.runtime.onMessage.addListener(onMessage)

async function onMessage(request: ServiceRequest<any>, _sender: MessageSender, sendResponse: (response?: any) => void) {
    if(request.senderTabType != TabType.HoursSettings)
        return;
    switch (request.action) {
        case Actions.RequestTabData:
            console.log("Requesting tab data", request.data);
            let setup = await fetchHoursSettingsOrSaveDefault(request.data.params.schoolYear);
            console.log(setup);
            await sendMessageToHoursSettings(Actions.TabData, setup);
            return;
        case Actions.HoursSettingsChanged:
            await onHoursSettingsChanged(request);
            return;
    }
}

let isRefreshing = false;
let refreshRequested = false;

setInterval(checkAndRefresh, 500);

async function refresh(hourSettings: TeacherHoursSetup | null) { //todo: rename to TeacherHourSettings
    if(isRefreshing)
        return;
    if(!globals)
        return; //oops...

    isRefreshing = true;
    refreshRequested = false;
    if(!hourSettings)
        hourSettings = await fetchHoursSettingsOrSaveDefault(globals.schoolYear);

    let equalSelectedSubjects = arrayIsEqual(
        hourSettings.subjects.filter(s => s.checked).map(s => s.name),
        (await globals.getHourSettingsMapped()).subjects.filter(s => s.checked).map(s => s.name)
    );

    globals.setHourSettings(hourSettings);
    if (equalSelectedSubjects) {
        rebuildHoursTable(await globals.getStudentRowData(), await globals.getHourSettingsMapped(), await globals.getFromCloud(), getInfoBlock());
    } else {
        globals.clearStudentRowData();
        await fetchAndShowTeacherHours(hourSettings.schoolyear, getInfoBlock());
    }
    isRefreshing = false;
}

async function onHoursSettingsChanged(request: ServiceRequest<any>) {
    if(isRefreshing) {
        refreshRequested = true;
        return;
    }
    await refresh(request.data as TeacherHoursSetup);
}
async function checkAndRefresh() {
    if(!refreshRequested)
        return;
    if(!globals)
        return; //oops...
    await refresh(null);
}

async function showUrenSetup(schoolyear: string) {
    let res = await openHoursSettings(schoolyear);
    globalHoursSettingsTabId = res.tabId;
}

let globalHoursSettingsTabId: number;

async function sendMessageToHoursSettings(action: Actions, data: any) {
    return sendRequest(action, TabType.Main, TabType.HoursSettings, globalHoursSettingsTabId, data);
}

function addButtons() {
    let targetButton = document.querySelector(TARGET_BUTTON_ID) as HTMLButtonElement;
    addButton(targetButton, def.MAIL_BTN_ID, "Email to clipboard", onClickCopyEmails, "fa-envelope", ["btn", "btn-outline-info"]);
}

function onClickCopyEmails() {
    let requiredHeaderLabels = ["e-mailadressen"];

    let namedCellListener = new NamedCellTableFetchListener(requiredHeaderLabels, _tableDef1 => {
        navigator.clipboard.writeText("").then(_value => {
            console.log("Clipboard cleared.")
        });
    });

    let result = createDefaultTableRefAndInfoBlock();
    if("error" in result) {
        console.error(result.error);
        return;
    }
    let {tableRef, infoBlock} = result.result;

    let result2 = createDefaultTableFetcher(tableRef, infoBlock);
    if("error" in result2) {
        console.error(result2.error);
        return;
    }

    let {tableFetcher} = result2.result;
    tableFetcher.addListener(namedCellListener);

    tableFetcher.fetch( )
        .then((fetchedTable) => {
            let allEmails = fetchedTable.getRowsAsArray()
                .map(tr=> namedCellListener.getColumnText(tr, "e-mailadressen"));

            let flattened = allEmails
                .map((emails: string) => emails.split(/[,;]/))
                .flat()
                .filter((email: string) => !email.includes("@academiestudent.be"))
                .filter((email: string) => email !== "");
            flattened = [...new Set(flattened)];
            navigator.clipboard.writeText(flattened.join(";\n")).then(() =>
                infoBlock.infoBar.setTempMessage("Alle emails zijn naar het clipboard gekopieerd. Je kan ze plakken in Outlook.")
            );
        }).catch(reason => {
            console.log("Loading failed (gracefully.");
            console.log(reason);
    });
}

let globals: TeacherHoursCachedState | null = null;

async function rebuildHoursTableAfterFetch(schoolYear: string, infoBlock: InfoBlock) {
    if(!globals)
        globals = new TeacherHoursCachedState(schoolYear, infoBlock);

    rebuildHoursTable(await globals.getStudentRowData(), await globals.getHourSettingsMapped(), await globals.getFromCloud(), infoBlock);
}

async function mailMergeStartSchoolyear() {
    let schoolyear = Schoolyear.findInPage();
    if(!schoolyear) {
        alert("Geen schooljaar gevonden!");
        return;
    }
    let divFooter = document.getElementById("div_leerling_werklijst_footer") as HTMLDivElement;
    let divInfo = divFooter.insertAdjacentElement("afterend", document.createElement("div")) as HTMLDivElement;
    let infoBlock = createInfoBlock(divInfo, "");
    let selectedFields = scrapeSelectedFieldIndexes();
    let text = await fetchMailMergeData(schoolyear, infoBlock, selectedFields, hasWerklijstNoCriteria(), scrapeCriteria());
    if(text != "") {
        copyToClipboardOrRequestRetry(infoBlock.infoBar, text);
        //todo: rebuild criteria.
        infoBlock.infoBar.setInfoLine("HERLAAD WEBPAGINA VOOR JE OPNIEUW EEN MAILMERGE DOET! (sorry)");
    }
}

async function fetchAndShowTeacherHours(schooljaar: string, infoBlock: InfoBlock) {
    let divViewContents = document.getElementById("view_contents") as HTMLDivElement;
    divViewContents.classList.add("hideWerklijst");
    let divOverView = document.getElementById("div_leerlingen_werklijst_overview") as HTMLDivElement;
    divOverView.style.display = "none"; //to override an element style set by dko3. CSS won't work in this case.
    let title = document.querySelector("#" + def.PLUGIN_CONTAINER_ID + " h4") as HTMLHeadingElement;
    title.textContent = "Lerarenuren voor schooljaar " + schooljaar;
    await rebuildHoursTableAfterFetch(schooljaar, infoBlock);
}

