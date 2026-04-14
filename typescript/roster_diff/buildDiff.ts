import {JsonExcelData} from "./excel";
import {RosterFactory} from "./rosterFactory";
import {ClassDef, ExcelRoster, TeacherDef, TimeSlice} from "./excelRoster";
import {cloud, deleteNotification, fetchExcelData, fetchFolderChanged, fetchIgnoredDiffHashes} from "../cloud";
import {FetchChain} from "../table/fetchChain";
import {pad, Schoolyear} from "../globals";
import {fetchLessen} from "../lessen/observer";
import {DayTimeSlice, DayUppercase, Les, scrapeLessenOverzicht} from "../lessen/scrape";
import {DKO3_BASE_URL, LESSEN_TABLE_ID} from "../def";
import {getTableFromHash, InfoBarTableFetchListener} from "../table/loadAnyTable";
import {emmet} from "../../libs/Emmeter/html";
import {fetchAndDisplayNotifications} from "../notifications/notifications";
import {StatusCallback} from "../startPage/diffPage";

let cachedDiffs: JsonDiffs = undefined;
export async function getJsonDiffsCached(academie: string, schoolYear: string) {
    if(cachedDiffs)
        return cachedDiffs;
    return getDiffsFromCloud(academie, schoolYear);
}

export async function buildAndSaveDiff(reportStatus: StatusCallback, fetchListener: InfoBarTableFetchListener, academie: string, schoolYear: string) {
    reportStatus("Excel bestanden ophalen...");
    let folderPath = await fetchFolderChanged(`Dko3/Uurroosters/${academie}/${schoolYear}/`);
    reportStatus(`${folderPath.files.length} Excel bestanden gevonden.`);
    let jsonExcelDatas: JsonExcelData[] = [];
    for (let file of folderPath.files) {
        let fileShortName = file.name.replaceAll("Dko3/Uurroosters/", "");
        reportStatus(`Inlezen van ${fileShortName}...`);
        let excelData = await fetchExcelData(file.name);
        jsonExcelDatas.push(excelData);
    }
    reportStatus(`Vergelijken met DKO3 lessen...`);
    let res = await runRosterCheck(jsonExcelDatas, reportStatus, fetchListener, schoolYear);
    let jsonDiffs = await createJsonDiffs(res.diffs, res.dko3LesSet, res.excelLesSet, res.excelRosters, academie, schoolYear);
    let fileName = getDiffsCloudFileName(academie, schoolYear);
    await cloud.json.upload(fileName, jsonDiffs);
    sessionStorage.setItem(fileName, JSON.stringify(jsonDiffs));
    reportStatus(`Vergelijking beeindigd.`);
    cachedDiffs = jsonDiffs;
    return jsonDiffs;
}

function removeIgnoreLessen(lessen: Les[]) {

}

export async function scrapeAllNormalLessen(schoolYear: string, reportStatus: StatusCallback) {
    reportStatus("Ophalen woordlessen...");
    let dko3Lessen = await scrapeLessen(Domein.Woord, LesType.gewone, schoolYear);
    reportStatus("Ophalen muwieklessen...");
    let muziekLessen = await scrapeLessen(Domein.Muziek, LesType.gewone, schoolYear);
    reportStatus("Ophalen kunstenbad lessen...");
    let kbLessen = await scrapeLessen(Domein.DomeinOV, LesType.gewone, schoolYear);
    return [...dko3Lessen, ...muziekLessen, ...kbLessen];
}

async function runRosterCheck(excelDatas: JsonExcelData[], reportStatus: StatusCallback, fetchListener: InfoBarTableFetchListener, schoolYear: string) {
    reportStatus("Vestigingsplaatsen ophalen...");
    let locationsTable = await getTableFromHash("extra-academie-vestigingsplaatsen", true, fetchListener);
    let locations = [...locationsTable.getRows()].map(tr => tr.cells[1].textContent);

    reportStatus("DKO3 gevevens ophalen...");
    let teachers = await fetchTeachers(schoolYear);
    for(let teacher of teachers) {
        for(let callDef of ExcelRoster.callNames) {
            if(teacher.name == callDef.tag)
                teacher.callName = callDef.searchString;
        }
    }
    let dko3Lessen = await scrapeAllNormalLessen(schoolYear, reportStatus);
    let dko3AliasLessen = await scrapeLessen(Domein.Woord, LesType.alias, schoolYear);
    for (let les of dko3AliasLessen) {
        les.linkedLessenIds = await getAliassesForLes(les.id, reportStatus);
    }
    //remove aliaslessen with only one linked les. We're don't care about those.
    dko3AliasLessen = dko3AliasLessen.filter(l => l.linkedLessenIds.length > 1);
    console.log(dko3Lessen);
    console.log(dko3AliasLessen);


    let subjects: string[] = dko3Lessen.map(les => [les.vakNaam, les.naam]).flat();
    subjects = [...new Set(subjects)];

    let excelLessenArray: ClassDef[][] = [];
    let excelRosters: ExcelRoster[] = [];
    for(let excelData of excelDatas) {
        let factory = new RosterFactory(excelData);
        let table = factory.getTable();
        let roster = new ExcelRoster(table, locations, subjects);
        excelRosters.push(roster);
        excelLessenArray.push(roster.scrapeUurrooster());
        console.log(excelLessenArray);
    }
    await deleteNotification("FILE_POSTED");
    await fetchAndDisplayNotifications();
    return {excelRosters, ...await buildDiff(excelLessenArray.flat(), dko3Lessen, dko3AliasLessen, reportStatus, teachers)};
}

export default runRosterCheck

enum LesType {modules="3", gewone="1", alias="4"}
enum Domein {Muziek="3", Woord="4", DomeinOV="5", Dans="2"}
async function scrapeLessen(domein: Domein, type: LesType, schoolYear: string ) {
    let chain = new FetchChain();
    let hash = "lessen-overzicht";
    await chain.fetch(DKO3_BASE_URL + "#lessen-overzicht" + hash);
    await chain.fetch("view.php?args=" + hash); // call to changeView() - assuming this is always the same, so no parsing here.
    let params = new URLSearchParams({
        schooljaar: schoolYear,
        domein,
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

export type DiffType =
    "perfect match"
    | "match without teacher"
    | "match without location"
    | "match without time"
    | "match without time and day"
    | "match without teacher, time and day";

export interface Diff {
    excelLes?: TaggedExcelLes;
    dko3Les?: TaggedDko3LesMoment;
    diffType: DiffType;
}

export class Dko3LesMoment {
    les: Les;
    dayTimeSlice: DayTimeSlice;
    momentId: string;
    ignore: boolean;

    constructor(les: Les, dayTimeSlice: DayTimeSlice) {
        this.les = les;
        this.dayTimeSlice = dayTimeSlice;
        this.momentId = Dko3LesMoment.createLesMomentId(les, dayTimeSlice);
    }

    public static createLesMomentId(les: Les, dayTimeSlice: DayTimeSlice) {
        return les.id + "_" + dayTimeSlice.toString();
    }

    public getHash() {
        return this.les.getHash() + this.dayTimeSlice.toString();
    }
}

export abstract class TaggedLes<T extends ClassDef | Dko3LesMoment> {
    lesMoment: T;
    tags:string[] = [];
    searchText: string;
    location?: string;
    teachers: string[];
    subjects: string[];
    linkedLesMomenten: TaggedLes<T>[] = [];
    ignore: boolean;

    protected constructor(les: T, tags: string[], searchText: string) {
        this.lesMoment = les;
        this.tags = tags;
        this.searchText = searchText;
    }

    public getHash() { return this.lesMoment.getHash()};
}

export class TaggedDko3LesMoment extends TaggedLes<Dko3LesMoment> {
    constructor(lesMoment: Dko3LesMoment) {
        let searchText = "";
        let tags: string[] = [];

        super(lesMoment, tags, searchText);
        this.location = this.lesMoment.les.vestiging;
        this.teachers = [this.lesMoment.les.teacher
            .replaceAll(/ \(en nog \d\)/g, "")];
        this.subjects = this.lesMoment.les.vakNaam
            .split('+')
            .map(txt => txt.trim());
        this.subjects.push(lesMoment.les.naam);
        this.subjects = this.subjects.filter(s => s!!);
    }
}

export class TaggedExcelLes extends TaggedLes<ClassDef> {
    public dayTimeSlice: DayTimeSlice;
    constructor(les: ClassDef, teachers: TeacherDef[]) {
        let searchText = " " + les.cellValue
            .toLowerCase()
            .replaceAll('\n', " \n ")
            .replaceAll("(", " ( ")
            .replaceAll(")", " ) ")
            .replaceAll(".", " . ")
            .replaceAll(",", " , ")
            .replaceAll("-", " - ")
            + " ";
        let tags: string[] = [];
        super(les, tags, searchText);
        this.location = this.lesMoment.location;//translate probably already done.
        this.teachers = this.lesMoment.teacher.split(/[\/,]/g).map(t => findTeacher(t, teachers));
        this.subjects = les.subjects;
        this.subjects = this.subjects.filter(s => s!!);
        this.dayTimeSlice = new DayTimeSlice(les.day, les.timeSlice);
    }
}

function isDko3LesToIgnore(les: TaggedDko3LesMoment) {
    return ExcelRoster.ignoreList.some(ignore =>
        (" "+les.lesMoment.les.naam.toLowerCase()+" ").includes(ignore) //todo: use subjects array instead of naam and vakNaam
        || (" "+les.lesMoment.les.vakNaam.toLowerCase()+" ").includes(ignore)
    )
}

function isExcelLesToIgnore(les: TaggedExcelLes) {
    return ExcelRoster.ignoreList.some(ignore => les.searchText.includes(ignore))
}

async function buildDiff(excelLessen: ClassDef[], dko3Lessen: Les[], dko3AliasLessen: Les[], reportStatus: StatusCallback, teachers: TeacherDef[]) {
    let diffs: Diff[] = [];
    let excelLesSet: Set<TaggedExcelLes> = new Set<TaggedExcelLes>(excelLessen.map(les => new TaggedExcelLes(les, teachers)));
    excelLesSet.forEach(les=> {
        if(isExcelLesToIgnore(les))
            excelLesSet.delete(les);
    })
    //split each Dko3 les into multiple lesMoments
    let lesMomenten = dko3Lessen
        .map(les => les.dayTimeSlices
            .map(slice => {
                return new Dko3LesMoment(les, slice);
            }))
        .flat()
        .map(lesMoment => new TaggedDko3LesMoment(lesMoment));
    let dko3LesSet: Set<TaggedDko3LesMoment> = new Set<TaggedDko3LesMoment>(lesMomenten);

    dko3LesSet.forEach(les=> {
        if(isDko3LesToIgnore(les))
            dko3LesSet.delete(les);
    })

    let dko3LesMap: Map<string, Les> = new Map();
    for(let les of dko3Lessen)
        dko3LesMap.set(les.id, les);

    //move linked lessen inside the alias les.
    let lesMomentenMap: Map<string, TaggedDko3LesMoment> = new Map<string, TaggedDko3LesMoment>();
    for(let les of dko3LesSet.values())
        lesMomentenMap.set(les.lesMoment.momentId, les);
    for(let aliasLes of dko3AliasLessen) {
        if (aliasLes.linkedLessenIds.length < 2) {
            reportStatus(`Error: alias les ${aliasLes.id} heeft geen 2 geldige gekoppelde lessen.`, "error");
            continue;
        }
        let linkedLessen = aliasLes.linkedLessenIds.map(lesId => dko3LesMap.get(lesId));
        if(linkedLessen.includes(undefined)) {
            reportStatus(`Voor aliasles <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> zijn er ontbrekende gekoppelde lessen.`, "error");
            continue;
        }
        let linkedLesMomentIds = linkedLessen.map(les => les.dayTimeSlices.map(slice => Dko3LesMoment.createLesMomentId(les, slice))).flat();
        let linkedLesMomenten = linkedLesMomentIds.map(momentId => lesMomentenMap.get(momentId));
        //sort the moments so we can merge them
        linkedLesMomenten.sort((a, b) => a.lesMoment.dayTimeSlice.startToNumber() - b.lesMoment.dayTimeSlice.startToNumber());
        let previousLesMoment = linkedLesMomenten[0];
        for(let i = 1; i < linkedLesMomenten.length; i++) {
            let currentLesMoment = linkedLesMomenten[i];
            if(previousLesMoment.lesMoment.dayTimeSlice.endToNumber() == currentLesMoment.lesMoment.dayTimeSlice.startToNumber()) {
                //yeah ! we can merge them!!!
                let newTimeSlice = new TimeSlice(structuredClone(previousLesMoment.lesMoment.dayTimeSlice.timeSlice.start), structuredClone(currentLesMoment.lesMoment.dayTimeSlice.timeSlice.end));
                let newDayTimeSlice = new DayTimeSlice(previousLesMoment.lesMoment.dayTimeSlice.day, newTimeSlice);
                let newAliasLesMoment = new TaggedDko3LesMoment(new Dko3LesMoment(aliasLes, newDayTimeSlice));
                dko3LesSet.add(newAliasLesMoment);
                dko3LesSet.delete(previousLesMoment);
                dko3LesSet.delete(currentLesMoment);
                previousLesMoment = newAliasLesMoment;
            } else {
                //No merge. Nothing to add or delete.
                previousLesMoment = currentLesMoment;
            }
        }
    }
    //todo: split dko3Les.vaknaam into array. Split on "+" and trim.
    //get extra teaches
    let extraTeacherCache = new ExtraTeacherCache()
    for (const les1 of [...dko3LesSet.values()]
        .filter(les => les.lesMoment.les.teacher.includes("(en nog"))) {
        les1.teachers = await extraTeacherCache.getExtraTeachers(les1.lesMoment.les.id);
        if(les1.teachers == undefined)
            throw "WTF???";
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
    return {diffs, dko3LesSet, excelLesSet};
}

class ExtraTeacherCache {
    teacherMap: Map<string, string[]> = new Map();

    async getExtraTeachers(lesId: string) {
        if(this.teacherMap.has(lesId))
            return this.teacherMap.get(lesId);

        let newEntry = await getExtraTeachers(lesId);
        this.teacherMap.set(lesId, newEntry);
        return newEntry;
    }
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

async function getAliassesForLes(lesId: string, reportStatus: StatusCallback) {
    await fetch("https://administratie.dko3.cloud/view.php?args=lessen-les?id="+lesId);
    await fetch("https://administratie.dko3.cloud/views/lessen/les/index.view.php");
    await fetch("https://administratie.dko3.cloud/views/lessen/les/index.details.tab.php");
    await fetch("https://administratie.dko3.cloud/views/lessen/les/index.meta.tab.php");
    let res = await fetch("https://administratie.dko3.cloud/views/lessen/les/meta/alias_gekoppelde_lessen.card.php");
    let htmlAliases = await res.text();
    let div = document.createElement("div") as HTMLDivElement;
    div.innerHTML = htmlAliases;
    let anchors = div.querySelectorAll("td > a");
    if(anchors.length == 0)
        reportStatus(`ERROR: alias les ${lesId} heeft geen (geldige) gekoppelde lessen.`);
    return [...anchors].map(a => a.textContent.trim());
}

function matchIt(dko3LesSet: Set<TaggedDko3LesMoment>, excelLesSet: Set<TaggedExcelLes>, diffs: Diff[], diffType: DiffType, matchFunction: (dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>) => (TaggedExcelLes | null)) {
    for(let dko3Les of dko3LesSet) {
        let excelLes = matchFunction(dko3Les, excelLesSet);
        if(excelLes) {
            diffs.push({excelLes: excelLes, dko3Les: dko3Les, diffType});
            dko3LesSet.delete(dko3Les);
            excelLesSet.delete(excelLes);
        }
    }

}

function perfectMatch(dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(!dko3Les.lesMoment.dayTimeSlice.equal(excelLes.dayTimeSlice))
            continue;
        if(dko3Les.location != excelLes.location)
            continue;
        if(!dko3Les.teachers.some(t => excelLes.teachers.includes(t)))
            continue;
        return excelLes;
    }
    return null;
}

function matchWithoutLocation(dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(!dko3Les.lesMoment.dayTimeSlice.equal(excelLes.dayTimeSlice))
            continue;
        if(!dko3Les.teachers.some(t => excelLes.teachers.includes(t)))
            continue;
        return excelLes;
    }
    return null;
}

function matchWithoutTime(dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(dko3Les.lesMoment.dayTimeSlice.day != excelLes.dayTimeSlice.day)
            continue;
        if(dko3Les.location != excelLes.location)
            continue;
        if(!dko3Les.teachers.some(t => excelLes.teachers.includes(t)))
            continue;
        return excelLes;
    }
    return null;
}

function matchWithoutTimeAndDay(dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
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

function matchWithoutTeacherTimeAndDay(dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(dko3Les.location != excelLes.location)
            continue;
        return excelLes;
    }
    return null;
}

function matchWithoutTeacher(dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): TaggedExcelLes | null {
    for(let excelLes of excelLesSet) {
        if(!dko3Les.subjects.some(t => excelLes.subjects.includes(t)))
            continue;
        if(!dko3Les.lesMoment.dayTimeSlice.equal(excelLes.dayTimeSlice))
            continue;
        if(dko3Les.location != excelLes.location)
            continue;
        return excelLes;
    }
    return null;
}

export async function fetchTeachers(schoolYear: string): Promise<TeacherDef[]> {
    await fetch(DKO3_BASE_URL+ "#personeel-personeelsleden");
    await fetch(DKO3_BASE_URL+ "view.php?args=personeel-personeelsleden");
    await fetch(DKO3_BASE_URL+ "views/personeel/personeelsleden/index.view.php");
    await fetch(DKO3_BASE_URL+ "views/personeel/personeelsleden/vestigingsplaats_schooljaar_filter.php?schooljaar=2025-2026");  //option list: can probably be skipped
    let formData = new FormData();
    formData.append("filters[naam]", "");
    formData.append("filters[status_personeelsleden]", "1");
    formData.append("filters[leerkracht]", "1");
    formData.append("filters[interim]", "1");
    formData.append("filters[alc]", "false");
    formData.append("filters[administratie]", "false");
    formData.append("filters[overig]", "false");
    formData.append("filters[schooljaar]", schoolYear);
    await fetch("https://administratie.dko3.cloud/views/personeel/personeelsleden/save_filters.php", {method: "POST", body: formData});
    let res = await fetch(DKO3_BASE_URL+ "views/personeel/personeelsleden/personeelsleden.table.php");
    let html = await res.text();
    let div = document.createElement("div");
    div.innerHTML = html;
    return [...div.querySelectorAll(`td[data-label="Naam"] strong`)]
        .map((strong: HTMLElement) => strong.textContent)
        .map(name => {
            let split = name.split(",");
            return {name, firstName: split[1].trim()};
        });
}

export function findTeacher(searchString: string, teachers: TeacherDef[]) {
    let lowerCase = searchString.toLowerCase();
    for(let teacherDef of teachers){
        if(lowerCase.includes(teacherDef.firstName.toLowerCase()))
            return teacherDef.name;
        if(teacherDef.callName)
            if(lowerCase.includes(teacherDef.callName.toLowerCase()))
                return teacherDef.name;
    }
    return searchString;
}

export function getDiffsCloudFileName(academie: string, schoolYear: string) {
    return `Dko3/${academie}_${schoolYear}_diffs.json`;
}

export async function getDiffsFromCloud(academie: string, schoolYear: string): Promise<JsonDiffs | null> {
    return await cloud.json.fetch(getDiffsCloudFileName(academie, schoolYear))
        .catch(err => {
            console.log(err);
            return null;
        }) as JsonDiffs | null;
}

export interface JsonExcelLesMoment {
    subject: string;
    teacher: string;
    day: DayUppercase;
    timeSlice: string;
    location: string;
    excelRow: number;
    excelColumn: number;
    cellValue: string;
    workBook: string;
    workSheet: string;
    hash: string;
    ignore: boolean;
}

export interface JsonDko3LesMoment {
    subject: string;
    teacher: string;
    day: DayUppercase;
    timeSlice: string;
    location: string;
    lesId: string;
    momentId: string;
    hash: string;
    ignore: boolean;
}

export interface JsonDiff {
    excelLes: JsonExcelLesMoment;
    dko3Les: JsonDko3LesMoment;
    diffType: DiffType;
}

export interface JsonWorkSheet {
    name: string,
    url: string,
}
export interface JsonWorkBook {
    name: string;
    worksheets: JsonWorkSheet[]
}
export interface JsonDiffs {
    academie: string;
    schoolYear: string;
    diffs: JsonDiff[];
    orphanedDko3Lessen: JsonDko3LesMoment[];
    orphanedExcelLessen: JsonExcelLesMoment[];
    isoDate: string,
    workBooks: JsonWorkBook[],
}

export async function setIgnoredFlags(orphanedDko3Lessen: JsonDko3LesMoment[], orphanedExcelLessen: JsonExcelLesMoment[], academie: string, schoolYear: string) {
    try {
        let ignoreHashes = await fetchIgnoredDiffHashes(academie, schoolYear);
        let ignoreHashSet = new Set(ignoreHashes);
        for (let les of orphanedDko3Lessen) {
            les.ignore = ignoreHashSet.has(les.hash);
        }
        for (let les of orphanedExcelLessen) {
            les.ignore = ignoreHashSet.has(les.hash);
        }
    } catch {}
}

export async function createJsonDiffs(diffList: Diff[], dko3LesSet: Set<TaggedDko3LesMoment>, excelLesSet: Set<TaggedExcelLes>, excelRosters: ExcelRoster[], academie: string, schoolYear: string): Promise<JsonDiffs> {
    let diffs: JsonDiff[] = diffList
        .filter(diff => diff.diffType != "perfect match")
        .map(diff => {
            return {
                excelLes: excelLesToJson(diff.excelLes),
                dko3Les: dko3LesToJson(diff.dko3Les),
                diffType: diff.diffType
            } satisfies JsonDiff;
        });
    let orphanedDko3Lessen = [...dko3LesSet.values()].map(les => dko3LesToJson(les));
    let orphanedExcelLessen = [...excelLesSet.values()].map(les => excelLesToJson(les));

    await setIgnoredFlags(orphanedDko3Lessen, orphanedExcelLessen, academie, schoolYear);
    let workBooks: Map<string, JsonWorkBook> = new Map<string, JsonWorkBook>();
    for(let excelData of excelRosters.map(r => r.table.excelData)) {
        if(!workBooks.has(excelData.workbookName)) {
            workBooks.set(excelData.workbookName, {
                name: excelData.workbookName,
                worksheets: []
            });
        }
        let workBook = workBooks.get(excelData.workbookName);
        let workSheet: JsonWorkSheet = {
            name: excelData.worksheetName,
            url: excelData.url
        };
        workBook.worksheets.push(workSheet);
    }
    return {
        academie,
        schoolYear,
        diffs,
        orphanedDko3Lessen,
        orphanedExcelLessen,
        isoDate: (new Date()).toISOString(),
        workBooks: [...workBooks.values()]
    } satisfies JsonDiffs;
}

function dko3LesToJson(dko3Les: TaggedDko3LesMoment): JsonDko3LesMoment {
    return {
        momentId: dko3Les.lesMoment.momentId,
        lesId: dko3Les.lesMoment.les.id,
        day: dko3Les.lesMoment.dayTimeSlice.day,
        timeSlice: toCompactTimeSliceString(dko3Les.lesMoment.dayTimeSlice.timeSlice),
        subject: dko3Les.subjects.join(","),
        teacher: dko3Les.teachers.join(","),
        location: dko3Les.location,
        hash: dko3Les.getHash(),
        ignore: dko3Les.ignore,
    };
}

function excelLesToJson(excelLes: TaggedExcelLes): JsonExcelLesMoment {
    return {
        excelColumn: excelLes.lesMoment.excelColumn,
        excelRow: excelLes.lesMoment.excelRow,
        day: excelLes.lesMoment.day as DayUppercase,
        timeSlice: toCompactTimeSliceString(excelLes.lesMoment.timeSlice),
        subject: excelLes.subjects.join(","),
        teacher: excelLes.teachers.join(","),
        location: excelLes.location,
        cellValue: excelLes.lesMoment.cellValue,
        workBook: excelLes.lesMoment.table.excelData.workbookName,
        workSheet: excelLes.lesMoment.table.excelData.worksheetName,
        hash: excelLes.getHash(),
        ignore: excelLes.ignore
    };
}

export function createDiffTable(divResults: HTMLDivElement) {
    let {first: table, last: tbody} = emmet.appendChild(divResults, "table#orphans.diff>(thead>tr>(th.subject{Vak/Lesnaam}+th.teacher{Leraar}+th.day{Dag}+th.{Uur}+th.location{Vestiging}+th+th))+tbody") as { target: HTMLDivElement, first: HTMLTableElement, last: HTMLTableSectionElement };
    return {table, tbody};
}

function toCompactTimeSliceString(timeSlice: TimeSlice) {
    if(!timeSlice)
        return "-geen uur-";
    return `${pad(timeSlice.start.hour, 2)}:${pad(timeSlice.start.minutes, 2)} - ${pad(timeSlice.end.hour, 2)}:${pad(timeSlice.end.minutes, 2)}`;
}

export async function getDiffForLes(lesId: string, academie: string, schoolYear: string) {
    let jsonDiffs = await getJsonDiffsCached(academie, schoolYear);
    return jsonDiffs.diffs.find(diff => diff.dko3Les.lesId == lesId);
}

export async function getUrlForWorksheet(workBook: string, workSheet: string, cellAddress: string, academie: string, schoolYear: string) {
    let jsonDiffs = await getJsonDiffsCached(academie, schoolYear);
    let url =  jsonDiffs
        .workBooks.find(wb => wb.name == workBook)
        ?.worksheets.find(ws => ws.name == workSheet)
        ?.url;
    if(cellAddress) {
        url = url + `&activeCell=${workSheet}!${cellAddress}`; //assuming activeCell is not the only param in the url.
    }
    return url;
}
