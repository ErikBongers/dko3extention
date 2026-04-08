import {ExactHashObserver} from "../pageObserver";
import {emmet} from "../../libs/Emmeter/html";
import {fetchCheckStatus, fetchExcelData, fetchFolderChanged, fetchNotifications, NotificationId, postNotification} from "../cloud";
import {RosterFactory} from "../roster_diff/rosterFactory";
import {JsonExcelData} from "../roster_diff/excel";
import {ClassDef, GradeYear, Roster, TimeSlice} from "../roster_diff/compare_roster";
import {updateNotificationsInNavBar} from "./notifications";
import {FetchChain} from "../table/fetchChain";
import * as def from "../def";
import {Schoolyear} from "../globals";
import {fetchLessen} from "../lessen/observer";
import {LESSEN_TABLE_ID} from "../def";
import {Les, scrapeLessenOverzicht} from "../lessen/scrape";

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

    let startContentDiv = document.querySelector("#dko3_start_content") as HTMLDivElement;
    if (startContentDiv) {
        if (startContentDiv.textContent.includes("welkom")) {
            emmet.insertAfter(startContentDiv.children[0], "div#dko3_plugin_notifications>div.alert.alert-info.shadow-sm>(h5>strong{Plugin berichten})+div");
            doStartupStuff().then(() => {
            }); //no wait needed.
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

    for (let propName of propNames) {
        let notif = notifications.notifications[propName];
        let imgUrl = chrome.runtime.getURL("images/waiting.gif");
        switch (notif.level) {
            case "warning":
                imgUrl = chrome.runtime.getURL("images/warning.png");
                break;
            case "error":
                imgUrl = chrome.runtime.getURL("images/error.png");
                break;
            case "running":
                imgUrl = chrome.runtime.getURL("images/waiting.gif");
                break;
            case "info":
                imgUrl = chrome.runtime.getURL("images/info.png");
                break;
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
    if (woordCheckstatus.status === "INITIAL") {
        //todo: add message that this check needs to be run.
        await postNotification("MUZIEK_ROSTERS_IS_DIFF", "warning", "De muzieklessen zijn niet vergeleken met het uurrooser op Sharepoint. Klik op de knop om de lessen te vergelijken.");
        await fetchAndDisplayNotifications();
        let folderChanged = await fetchFolderChanged("Dko3/Uurroosters/");
        for (let file of folderChanged.files) {
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
    let dko3Lessen = await scrapeLessen(LesType.gewone);
    let dko3AliasLessen = await scrapeLessen(LesType.alias);
    for (let les of dko3AliasLessen) {
        les.linkedLessen = await getAliassesForLes(les.id);
    }
    //remove aliaslessen with only one linked les. We're don't care about those.
    dko3AliasLessen = dko3AliasLessen.filter(l => l.linkedLessen.length > 1);
    console.log(dko3Lessen);
    console.log(dko3AliasLessen);

    await buildDiff(excelLessen, dko3Lessen, dko3AliasLessen);
}

enum LesType {modules="3", gewone="1", alias="4"}
async function scrapeLessen(type: LesType ) {
    let chain = new FetchChain();
    let hash = "lessen-overzicht";
    await chain.fetch(def.DKO3_BASE_URL + "#lessen-overzicht" + hash);
    await chain.fetch("view.php?args=" + hash); // call to changeView() - assuming this is always the same, so no parsing here.
    let schoolYear = Schoolyear.toFullString(Schoolyear.calculateSetupYear() - 1); //todo: TEST TEST TEST, wrong year!!!!
    let params = new URLSearchParams({
        schooljaar: schoolYear,
        domein: "4", //muziek=3, woord=4, DomeinOV=5, Dans=2
        vestigingsplaats: "",
        vak: "",
        graad: "",
        leerkracht: "",
        ag: "",
        lesdag: "",
        verberg_online: "-1",
        soorten_lessen: type,
        volzet: "-1"
    });
    let tableText = await fetchLessen(params);
    let div = document.createElement("div");
    div.innerHTML = tableText;
    let table = div.querySelector("#" + LESSEN_TABLE_ID) as HTMLTableElement;
    return scrapeLessenOverzicht(table);
}

export interface Diff {
    excelLes?: ClassDef;
    dko3Les?: Les;
    comment: string;
}

abstract class TaggedLes<T extends ClassDef | Les> {
    les: T;
    tags:string[] = [];
    searchText: string;
    location?: string;
    teachers: string[];
    subjects: string[];
    linkedLessen: TaggedLes<T>[] = [];

    protected constructor(les: T, tags: string[], searchText: string) {
        this.les = les;
        this.tags = tags;
        this.searchText = searchText;
    }
}

class TaggedDko3Les extends TaggedLes<Les> {
    constructor(les: Les) {
        let searchText = "";
        let tags: string[] = [];

        super(les, tags, searchText);
        this.location = this.les.vestiging;
        this.teachers = [this.les.teacher
            .replaceAll(/ \(en nog \d\)/g, "")];
        this.subjects = this.les.vakNaam
            .split('+')
            .map(txt => txt.trim());
        this.subjects.push(les.naam);
    }
}

class TaggedExcelLes extends TaggedLes<ClassDef> {
    constructor(les: ClassDef) {
        let searchText = "";
        let tags: string[] = [];
        super(les, tags, searchText);
        this.location = this.les.location;//translate probably already done.
        this.teachers = this.les.teacher.split(/[]\/,/g).map(t => Roster.findTeacher(t));
        this.subjects = [les.subject];
    }
}

async function buildDiff(excelLessen: ClassDef[], dko3Lessen: Les[], dko3AliasLessen: Les[]) {
    let diffs: Diff[] = [];
    let excelLesSet: Set<TaggedExcelLes> = new Set<TaggedExcelLes>(excelLessen.map(les => new TaggedExcelLes(les)));
    let dko3LesSet: Set<TaggedDko3Les> = new Set<TaggedDko3Les>(dko3Lessen.map(les => new TaggedDko3Les(les)));
    //move linked lessen inside the alias les.
    let lessenMap: Map<string, TaggedDko3Les> = new Map<string, TaggedDko3Les>();
    for(let les of dko3LesSet.values())
        lessenMap.set(les.les.id, les);
    for(let aliasLes of dko3AliasLessen) {
        let taggedAliasLes = new TaggedDko3Les(aliasLes);
        taggedAliasLes.linkedLessen = taggedAliasLes.les.linkedLessen.map(id => lessenMap.get(id));
        dko3LesSet.add(taggedAliasLes);
        for(let linkedLes of taggedAliasLes.linkedLessen)
            dko3LesSet.delete(linkedLes);
    }
    //todo: split dko3Les.vaknaam into array. Split on "+" and trim.
    //get extra teaches
    for (const les1 of [...dko3LesSet.values()]
        .filter(les => les.les.teacher.includes("(en nog"))) {
            les1.teachers = await getExtraTeachers(les1.les.id);
        }

    matchIt(dko3LesSet, excelLesSet, diffs, "perfect match", perfectMatch);
    matchIt(dko3LesSet, excelLesSet, diffs, "match without teacher", matchWithoutTeacher);
    matchIt(dko3LesSet, excelLesSet, diffs, "match without location", matchWithoutLocation);
    matchIt(dko3LesSet, excelLesSet, diffs, "match without time", matchWithoutTime);
    matchIt(dko3LesSet, excelLesSet, diffs, "match without time and day", matchWithoutTimeAndDay);
    matchIt(dko3LesSet, excelLesSet, diffs, "match without teacher, time and day", matchWithoutTeacherTimeAndDay);
    console.log(diffs);
    console.log(dko3LesSet.values());
    console.log(excelLesSet.values());
}

async function getExtraTeachers(lesId: string) {
    await fetch("https://administratie.dko3.cloud/view.php?args=lessen-les?id="+lesId);
    await fetch("https://administratie.dko3.cloud/views/lessen/les/index.view.php");
    await fetch("https://administratie.dko3.cloud/views/lessen/les/index.details.tab.php");
    let res = await fetch("https://administratie.dko3.cloud/views/lessen/les/details/index.details.leerkrachten.card.php");
    let htmlTeachers = await res.text();
    let div = document.createElement("div") as HTMLDivElement;
    div.innerHTML = htmlTeachers;
    let strongs = div.querySelectorAll("td > strong");
    return [...strongs].map(s => {
        return s.textContent
            .replaceAll("  ", " ")
            .replaceAll(" ,", ",")
            .trim(); //clean up of names with additional spaces
    });
}

async function getAliassesForLes(lesId: string) {
    await fetch("https://administratie.dko3.cloud/view.php?args=lessen-les?id="+lesId);
    await fetch("https://administratie.dko3.cloud/views/lessen/les/index.view.php");
    await fetch("https://administratie.dko3.cloud/views/lessen/les/index.details.tab.php");
    await fetch("https://administratie.dko3.cloud/views/lessen/les/index.meta.tab.php");
    let res = await fetch("https://administratie.dko3.cloud/views/lessen/les/meta/alias_gekoppelde_lessen.card.php");
    let htmlAliases = await res.text();
    let div = document.createElement("div") as HTMLDivElement;
    div.innerHTML = htmlAliases;
    let anchors = div.querySelectorAll("td > a");
    return [...anchors].map(a => a.textContent.trim());
}

function matchIt(dko3LesSet: Set<TaggedDko3Les>, excelLesSet: Set<TaggedExcelLes>, diffs: Diff[], comment: string, matchFunction: (dko3Les: TaggedDko3Les, excelLesSet: Set<TaggedExcelLes>) => (TaggedExcelLes | null)) {
    for(let dko3Les of dko3LesSet) {
        let excelLes = matchFunction(dko3Les, excelLesSet);
        if(excelLes) {
            diffs.push({excelLes: excelLes.les, dko3Les: dko3Les.les, comment});
            dko3LesSet.delete(dko3Les);
            excelLesSet.delete(excelLes);
        }
    }

}

function perfectMatch(dko3Les: TaggedDko3Les, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(dko3Les.les.day != excelLes.les.day)
            continue;
        if(!dko3Les.les.timeSlice.equal(excelLes.les.timeSlice))
            continue;
        if(dko3Les.location != excelLes.location)
            continue;
        if(!dko3Les.teachers.some(t => excelLes.teachers.includes(t)))
            continue;
        return excelLes;
    }
    return null;
}

function matchWithoutLocation(dko3Les: TaggedDko3Les, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(dko3Les.les.day != excelLes.les.day)
            continue;
        if(!dko3Les.les.timeSlice.equal(excelLes.les.timeSlice))
            continue;
        if(!dko3Les.teachers.some(t => excelLes.teachers.includes(t)))
            continue;
        return excelLes;
    }
    return null;
}

function matchWithoutTime(dko3Les: TaggedDko3Les, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(dko3Les.les.day != excelLes.les.day)
            continue;
        if(dko3Les.location != excelLes.location)
            continue;
        if(!dko3Les.teachers.some(t => excelLes.teachers.includes(t)))
            continue;
        return excelLes;
    }
    return null;
}

function matchWithoutTimeAndDay(dko3Les: TaggedDko3Les, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(dko3Les.location != excelLes.location)
            continue;
        if(!dko3Les.teachers.some(t => excelLes.teachers.includes(t)))
            continue;
        return excelLes;
    }
    return null;
}

function matchWithoutTeacherTimeAndDay(dko3Les: TaggedDko3Les, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(dko3Les.location != excelLes.location)
            continue;
        return excelLes;
    }
    return null;
}

function matchWithoutTeacher(dko3Les: TaggedDko3Les, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(dko3Les.les.day != excelLes.les.day)
            continue;
        if(!dko3Les.les.timeSlice.equal(excelLes.les.timeSlice))
            continue;
        if(dko3Les.location != excelLes.location)
            continue;
        return excelLes;
    }
    return null;
}
