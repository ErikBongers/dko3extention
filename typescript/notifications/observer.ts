import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {fetchCheckStatus, fetchExcelData, fetchFolderChanged, fetchNotifications, NotificationId, postNotification} from "../cloud";
import {RosterFactory} from "../roster_diff/rosterFactory";
import {JsonExcelData} from "../roster_diff/excel";
import {Roster} from "../roster_diff/compare_roster";
import {updateNotificationsInNavBar} from "./notifications";
import {FetchChain} from "../table/fetchChain";
import * as def from "../def";
import {Schoolyear} from "../globals";
import {fetchLessen} from "../lessen/observer";
import {LESSEN_TABLE_ID} from "../def";
import {scrapeLessenOverzicht} from "../lessen/scrape";

class StartPageObserver extends ExactHashObserver {
    constructor() {
        super( "#start-mijn_tijdslijn", onMutation );
    }
    isPageReallyLoaded(): boolean {
        return isLoaded();
    }
}
export default new StartPageObserver();

function isLoaded() {
    let startContentDiv = document.querySelector("#dko3_start_content") as HTMLDivElement;
    return startContentDiv?.textContent.includes("welkom")??false;
}

function onMutation(mutation: MutationRecord) {
    if(document.querySelector("#dko3_plugin_notifications"))
        return true;

    let startContentDiv = document.querySelector("#dko3_start_content") as HTMLDivElement;
    if (startContentDiv) {
        if(startContentDiv.textContent.includes("welkom")) {
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

async function fetchAndDisplayNotifications() {
    let notifications = await fetchNotifications();
    await updateNotificationsInNavBar(notifications);
    let notificationsDiv = document.querySelector("#dko3_plugin_notifications > div > div") as HTMLDivElement;
    let html: string = "";
    let propNames = Object.getOwnPropertyNames(notifications.notifications) as NotificationId[];

    for(let propName of propNames){
        let notif = notifications.notifications[propName];
        let imgUrl = chrome.runtime.getURL("images/waiting.gif");
        switch (notif.level) {
            case "warning": imgUrl = chrome.runtime.getURL("images/warning.png"); break;
            case "error": imgUrl = chrome.runtime.getURL("images/error.png"); break;
            case "running": imgUrl = chrome.runtime.getURL("images/waiting.gif"); break;
            case "info": imgUrl = chrome.runtime.getURL("images/info.png"); break;
        }
        html += `
            <div class="notif notif-${notif.level}">
            <div class="notif-img">
                <img src="${imgUrl}" alt="todo">
            </div>
            <div>${notif.message}</div>
            </div>
            `;
    }
    notificationsDiv.innerHTML = html;
}

async function checkChecks() {
    let woordCheckstatus = await fetchCheckStatus("WOORD_ROSTERS");
    if(woordCheckstatus.status === "INITIAL") {
        //todo: add message that this check needs to be run.
        await postNotification("MUZIEK_ROSTERS_IS_DIFF", "warning", "De muzieklessen zijn niet vergeleken met het uurrooser op Sharepoint. Klik op de knop om de lessen te vergelijken.");
        await fetchAndDisplayNotifications();
        let folderChanged = await fetchFolderChanged("Dko3/Uurroosters/");
        for(let file of folderChanged.files) {
            let excelData = await fetchExcelData(file.name);
            await runRosterCheck(excelData);
        }
    }
}

async function runRosterCheck(excelData: JsonExcelData) {
    await postNotification("WOORD_ROSTER_RUN", "running", "Uurrooster worden vergeleken... (gestart door <todo:username>");

    let factory = new RosterFactory(excelData);
    let table = factory.getTable();
    let roster = new Roster(table);
    let excelLessen = roster.scrapeUurrooster();
    console.log(excelLessen);
    let dko3Lessen = await scrapeLessen();
    console.log(dko3Lessen);
}

async function scrapeLessen() {
    let chain = new FetchChain();
    let hash = "lessen-overzicht";
    await chain.fetch(def.DKO3_BASE_URL+"#lessen-overzicht" + hash);
    await chain.fetch("view.php?args=" + hash); // call to changeView() - assuming this is always the same, so no parsing here.
    let schoolYear = Schoolyear.toFullString(Schoolyear.calculateSetupYear()-1); //todo: TEST TEST TEST, wrong year!!!!
    let params = new URLSearchParams({
        schooljaar: schoolYear,
        domein:"4", //muziek=3, woord=4, DomeinOV=5, Dans=2
        vestigingsplaats: "",
        vak: "",
        graad: "",
        leerkracht: "",
        ag: "",
        lesdag: "",
        verberg_online:"-1",
        soorten_lessen:"1", //modules =3, gewone lessen=1
        volzet:"-1"
    });
    let tableText = await fetchLessen(params);
    let div = document.createElement("div");
    div.innerHTML = tableText;
    let table = div.querySelector("#"+LESSEN_TABLE_ID) as HTMLTableElement;
    return scrapeLessenOverzicht(table);
}

/*
export class Les {
    vakNaam: string;
    lesType: LesType;
    alc: boolean;
    online: boolean;
    naam: string;
    teacher: string;
    lesmoment: string;
    formattedLesmoment: string;
    vestiging: string;
    studentsTable: HTMLTableElement;
    aantal: number;
    maxAantal: number;
    id: string;
    wachtlijst: number;
    students: StudentInfo[];
    instrumentName: string;
    trimesterNo: number;
    tags: string[];
    warnings: string[];
}
*/