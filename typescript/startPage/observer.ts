import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {fetchAndDisplayNotifications} from "../notifications/notifications";
import {checkChecks} from "../notifications/checks";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, StartPageGotoState} from "../gotoState";
import {fetchExcelData, fetchFolderChanged} from "../cloud";
import {Diff, runRosterCheck, TaggedDko3Les, TaggedExcelLes} from "../roster_diff/build";
import {DayUppercase} from "../lessen/scrape";
import {TimeSlice} from "../roster_diff/compare_roster";
import {pad, unreachable} from "../globals";

class StartPageObserver extends ExactHashObserver {
    constructor() {
        super("#start-mijn_tijdslijn", onMutation);
    }

    isPageReallyLoaded(): boolean {
        return isLoaded();
    }
}

export default new StartPageObserver();

function isLoaded() {
    let startContentDiv = document.querySelector("#dko3_start_content") as HTMLDivElement;
    return startContentDiv?.textContent.includes("welkom") ?? false;
}

function onMutation(mutation: MutationRecord) {
    if (document.querySelector("#dko3_plugin_notifications"))
        return true;

    if(document.querySelector("#view_contents>div.row"))
        setupPluginPage();

    let startContentDiv = document.querySelector("#dko3_start_content") as HTMLDivElement;
    if (startContentDiv) {
        if (startContentDiv.textContent.includes("welkom")) {
            emmet.insertAfter(startContentDiv.children[0], "div#dko3_plugin_notifications>div.alert.alert-info.shadow-sm>(h5>strong{Plugin berichten})+div");
            doStartupStuff().then(() => {}); //no wait needed.
        }
        return true;
    }
    return false;
}

async function doStartupStuff() {
    await fetchAndDisplayNotifications();
    await checkChecks();
}

function setupPluginPage() {
    let pluginContainer = document.getElementById("plugin_container");
    if (pluginContainer)
        return;
    let viewContent = document.getElementById("view_contents");
    if (!viewContent)
        return;

    emmet.appendChild(viewContent, "div#plugin_container");

    let pageState = getGotoStateOrDefault(PageName.StartPage) as StartPageGotoState;
    if(pageState.goto == Goto.Start_page) {
        if (pageState.showPage == "start") {
            pageState.goto = Goto.None;
            saveGotoState(pageState);
            return;
        }
        if (pageState.showPage == "diff") {
            pageState.goto = Goto.None;
            saveGotoState(pageState);
            let viewContent = document.getElementById("view_contents");
            emmet.insertBefore(viewContent.firstElementChild, "div.hide_view_contents");
            setupDiffPage();
            return;
        }
    }
    pageState.goto = Goto.None;
    saveGotoState(pageState);

}

type StatusCallback = (message: string) => void;

async function runDiff(reportStatus: StatusCallback) {
    reportStatus("Excel bestanden ophalen...");
    let folderChanged = await fetchFolderChanged("Dko3/Uurroosters/");
    reportStatus(`${folderChanged.files.length} Excel bestanden gevonden.`);
    for (let file of folderChanged.files) {
        let fileShortName = file.name.replaceAll("Dko3/Uurroosters/", "");
        reportStatus(`Inlezen van ${fileShortName}...`);
        let excelData = await fetchExcelData(file.name);
        reportStatus(`Vergelijken van ${fileShortName} met DKO3 lessen...`);
        let res = await runRosterCheck(excelData);
        showDiffs(res.diffs, res.dko3LesSet, res.excelLesSet);
    }
    reportStatus(`Vergelijking beeindigd.`);
}

function setupDiffPage() {
    let pluginContainer = document.getElementById("plugin_container");
    let button = emmet.appendChild(pluginContainer, "div.mb-1>div>(h4{Verschillen tussen Excel uurroosters en DKO3 lessen.}+button{Run the diffs!})").last as HTMLButtonElement;
    let runStatus = emmet.insertAfter(button, "div#runStatus").first as HTMLDivElement;
    let results = emmet.insertAfter(runStatus, "div#diffResults").first as HTMLDivElement;
    let messages: string[] = [];
    function reportStatus(message: string) {
        messages.push(message);
        runStatus.innerHTML = messages.join("<br>");
    }
    button.onclick = async () => {
        await runDiff(reportStatus);
    };
}

function showDiffs(diffs: Diff[], dko3LesSet: Set<TaggedDko3Les>, excelLesSet: Set<TaggedExcelLes>) {
    let actualDiffs = diffs.filter(diff => diff.diffType != "perfect match");
    let divResults = document.getElementById("diffResults") as HTMLDivElement;
    for(let diff of actualDiffs)
        displayDiff(diff, divResults);
}

function displayDiff(diff: Diff, divResults: HTMLDivElement) {
    let tbody = emmet.appendChild(divResults, "table>tbody").last as HTMLTableSectionElement;
    let tr = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
    fillDiffRow(tr, diff.excelLes.subjects, diff.excelLes.teachers, diff.excelLes.les.day as DayUppercase, diff.excelLes.les.timeSlice, diff.excelLes.location);
    tr.classList.add("excelRow");
    let tr2 = emmet.appendChild(tbody, "tr").last as HTMLTableRowElement;
    fillDiffRow(tr2, diff.dko3Les.subjects, diff.dko3Les.teachers, diff.dko3Les.les.day as DayUppercase, diff.dko3Les.les.timeSlice, diff.dko3Les.location);
}

function fillDiffRow(tr: HTMLTableRowElement, subjects: string[], teachers: string[], day: DayUppercase, timeSlice: TimeSlice, location: string) {
    emmet.appendChild(tr, `td{${subjects.join(",")}}+td{${teachers.join(",")}}+td{${toCompactDateString(day as DayUppercase, timeSlice)}}+td{${location}}`)
}
function toCompactDateString(day: DayUppercase, timeSlice: TimeSlice) {
    let text: string = "";
    switch (day) {
        case "MAANDAG": text += "ma "; break;
        case "DINSDAG": text += "di "; break;
        case "WOENSDAG": text += "wo "; break;
        case "DONDERDAG": text += "do "; break;
        case "VRIJDAG": text += "vr "; break;
        case "ZATERDAG": text += "za "; break;
        case "ZONDAG": text += "zo "; break;
        case "": text += "?? "; break;
        default: unreachable(day);
    }
    text += `${pad(timeSlice.start.hour, 2)}:${pad(timeSlice.start.minutes, 2)} - ${pad(timeSlice.end.hour, 2)}:${pad(timeSlice.end.minutes, 2)}`;
    return text;
}
