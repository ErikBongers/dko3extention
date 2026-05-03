import {JsonExcelData} from "./excel";
import {RosterFactory} from "./rosterFactory";
import {ClassDef, ExcelRoster, GradeYear, TeacherDef, TimeSlice} from "./excelRoster";
import {cloud, deleteNotification, fetchExcelData, fetchFolderChanged, fetchIgnoredDiffHashes} from "../cloud";
import {FetchChain} from "../table/fetchChain";
import {pad} from "../globals";
import {fetchLessen} from "../lessen/observer";
import {DayTimeSlice, DayUppercase, Les, scrapeLessenOverzicht} from "../lessen/scrape";
import {DKO3_BASE_URL, LESSEN_TABLE_ID} from "../def";
import {getTableFromHash, InfoBarTableFetchListener} from "../table/loadAnyTable";
import {emmet} from "../../libs/Emmeter/html";
import {fetchAndDisplayNotifications} from "../notifications/notifications";
import {getDiffsDko3CacheFileName, StatusCallback} from "./showDiff";
import {DiffSettings} from "./diffSettings";

let cachedDiffs: JsonDiffs | undefined = undefined;
export async function getJsonDiffsCached(academie: string, schoolYear: string) {
    if(cachedDiffs)
        return cachedDiffs;
    return getDiffsFromCloud(academie, schoolYear);
}

export async function buildAndSaveDiff(reportStatus: StatusCallback, fetchListener: InfoBarTableFetchListener, academie: string, schoolYear: string, dko3DiffData: Dko3DiffData | null, diffSettings: DiffSettings) {
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
    if(!dko3DiffData)
        dko3DiffData = await getDko3Data(schoolYear, reportStatus, fetchListener);
    let json = JSON.stringify(dko3DiffData);
    let res = await runRosterCheck(jsonExcelDatas, reportStatus, fetchListener, dko3DiffData, diffSettings);
    //parse again, just in case previous function changed the dko3 data.
    dko3DiffData = JSON.parse(json) as Dko3DiffData;
    dko3DiffData.extraTeachersCache = res.extraTeacherCache.toJSON();
    localStorage.setItem(getDiffsDko3CacheFileName(academie, schoolYear), JSON.stringify(dko3DiffData));

    let jsonDiffs = await createJsonDiffs(res.diffs, res.dko3LesSet, res.excelLesSet, res.excelRosters, academie, schoolYear);
    let fileName = getDiffsCloudFileName(academie, schoolYear);
    await cloud.json.upload(fileName, jsonDiffs);
    sessionStorage.setItem(fileName, JSON.stringify(jsonDiffs));
    reportStatus(``);
    cachedDiffs = jsonDiffs;
    return jsonDiffs;
}

export interface Dko3DiffData {
    lessen: Les[];
    locations: string[];
    teachers: TeacherDef[];
    dko3AliasLessen: Les[];
    subjects: string[];
    classNames: string[];
    extraTeachersCache?: [string, string[]][];
}

async function getDko3Data(schoolYear: string, reportStatus: StatusCallback, fetchListener: InfoBarTableFetchListener): Promise<Dko3DiffData> {
    reportStatus("Vestigingsplaatsen ophalen...");
    let locationsTable = await getTableFromHash("extra-academie-vestigingsplaatsen", true, fetchListener);
    let locations = [...locationsTable.getRows()].map(tr => tr.cells[1].textContent);

    reportStatus("Leraren ophalen...");
    let teachers = await fetchTeachers(schoolYear);
    for(let teacher of teachers) {
        for(let callDef of ExcelRoster.callNames) {
            if(teacher.name == callDef.tag)
                teacher.callName = callDef.searchString;
        }
    }
    let lessen = (await scrapeAllNormalLessen(schoolYear, reportStatus)).map(l => l.les);
    reportStatus("Ophalen aliaslessen...");
    let dko3AliasLessen = (await scrapeLessen(Domein.Woord, LesType.alias, schoolYear)).map(l => l.les);
    for (let les of dko3AliasLessen) {
        les.linkedLessenIds = await getAliassesForLes(les.id, reportStatus);
    }
    //remove aliaslessen with only one linked les. We're don't care about those.
    dko3AliasLessen = dko3AliasLessen.filter(l => l.linkedLessenIds.length > 1);
    let subjects: string[] = lessen.map(les => [les.vakNaam, les.naam]).flat();
    subjects = [...new Set(subjects)];
    let classNames: string[] = lessen.map(les => les.naam).filter(n => n!= "");
    subjects = [...new Set(subjects)];

    return {lessen, locations, teachers, dko3AliasLessen, subjects, classNames};
}

export async function scrapeAllNormalLessen(schoolYear: string, reportStatus: StatusCallback) {
    reportStatus("Ophalen woordlessen...");
    let dko3Lessen = await scrapeLessen(Domein.Woord, LesType.gewone, schoolYear);
    reportStatus("Ophalen muzieklessen...");
    let muziekLessen = await scrapeLessen(Domein.Muziek, LesType.gewone, schoolYear);
    reportStatus("Ophalen kunstenbad lessen...");
    let kbLessen = await scrapeLessen(Domein.DomeinOV, LesType.gewone, schoolYear);
    return [...dko3Lessen, ...muziekLessen, ...kbLessen];
}

export async function runRosterCheck(excelDatas: JsonExcelData[], reportStatus: StatusCallback, fetchListener: InfoBarTableFetchListener, dko3DiffData: Dko3DiffData, diffSettings: DiffSettings) {
    let excelLessenArray: ClassDef[][] = [];
    let excelRosters: ExcelRoster[] = [];
    reportStatus("Excel tabellen bouwen...");
    for(let excelData of excelDatas) {
        let factory = new RosterFactory(excelData);
        let table = factory.getTable();
        let roster = new ExcelRoster(table, dko3DiffData.locations, dko3DiffData.subjects, diffSettings, dko3DiffData.classNames);
        excelRosters.push(roster);
        let classDefs = roster.scrapeUurrooster();
        if(classDefs)
            excelLessenArray.push(classDefs);
        console.log(excelLessenArray);
    }
    let res = {excelRosters, ...await buildDiff(excelLessenArray.flat(), dko3DiffData, reportStatus, diffSettings)};
    //no await:
    deleteNotification("FILE_POSTED").then(() => fetchAndDisplayNotifications());
    return res;
}

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
    | "match without subject"
    | "match without gradeYears"
    | "match without teacher"
    | "match without location"
    | "match without time and day"
    | "match without teacher, time and day";

export interface Diff {
    excelLes: TaggedExcelLes;
    dko3Les: TaggedDko3LesMoment;
    diffType: DiffType;
    weight: Weight;
}

export class Dko3LesMoment {
    les: Les;
    lesMomenten: Dko3LesMoment[] = []; //contains itself!
    dayTimeSlice: DayTimeSlice;
    momentId: string;
    ignore: boolean;

    constructor(les: Les, dayTimeSlice: DayTimeSlice) {
        this.les = les;
        this.dayTimeSlice = dayTimeSlice;
        this.momentId = Dko3LesMoment.createLesMomentId(les, dayTimeSlice);
    }

    public static createLesMomentId(les: Les, dayTimeSlice: DayTimeSlice) {
        return les.id + "_" + DayTimeSlice.toString(dayTimeSlice);
    }

    public getHash() {
        return Les.getHash(this.les) + DayTimeSlice.toString(this.dayTimeSlice);
    }
}

export abstract class TaggedLes<T extends ClassDef | Dko3LesMoment> {
    lesMoment: T;
    tags:string[] = [];
    searchText: string;
    location?: string;
    teachers: string[];
    subjects: string[];
    ignore: boolean;
    gradeYears: GradeYear[];

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
        this.gradeYears = lesMoment.les.gradeYears;
    }
}

export class Weight {
    weight: number = 1000;
    diffTeacher: boolean = false;
    diffSubject: boolean = false;
    diffLocation: boolean = false;
    diffDayTime: boolean = false;
    diffGradeYears: number = 0;
    public calcWeight() {
        this.weight = 1000; //perfect match
        if(this.diffSubject)
            this.weight -= 10;
        if(this.diffDayTime)
            this.weight -= 10;
        if(this.diffLocation)
            this.weight -= 10;
        if (this.diffTeacher)
            this.weight -= 10;
        this.weight -= this.diffGradeYears;
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
        if(this.lesMoment.className)
            this.subjects.push(this.lesMoment.className);
        this.subjects = [...new Set(this.subjects)];
        this.dayTimeSlice = new DayTimeSlice(les.day, les.timeSlice);
        this.gradeYears = les.gradeYears;
    }
}

function isDko3LesToIgnore(les: Les, ignoreList: string[]) {
    return ignoreList.some(ignore =>
        (" "+les.naam.toLowerCase()+" ").includes(ignore)
        || (" "+les.vakNaam.toLowerCase()+" ").includes(ignore)
    )
}

function isExcelLesToIgnore(les: TaggedExcelLes, ignoreList: string[]) {
    return ignoreList.some(ignore => les.lesMoment.cellValue.includes(ignore))
    || ignoreList.some(ignore => les.searchText.includes(ignore))
}

function splitDko3LessenIntoLesmomenten(dko3Data: Dko3DiffData, diffSettings: DiffSettings, reportStatus: StatusCallback) {
    //split each Dko3 les into multiple lesMoments
    let lesMomenten = dko3Data.lessen
        .filter(les => !isDko3LesToIgnore(les, diffSettings.ignoreList))
        .map(les => {
            if (les.dayTimeSlices.length == 0)
                reportStatus(`Les <a href="https://administratie.dko3.cloud/#lessen-les?id=${les.id}">${les.id}</a> heeft geen lesmoment.`, "error");
            let lesMomenten = les.dayTimeSlices
                .map(slice => {
                    return new Dko3LesMoment(les, slice);
                });
            for (let moment of lesMomenten)
                moment.lesMomenten = lesMomenten;

            return lesMomenten;
        })
        .flat()
        .map(lesMoment => new TaggedDko3LesMoment(lesMoment));

    return new Set<TaggedDko3LesMoment>(lesMomenten);
}

function createLesMomenten(dko3Data: Dko3DiffData, reportStatus: StatusCallback, diffSettings: DiffSettings) {
    let dko3LesSet = splitDko3LessenIntoLesmomenten(dko3Data, diffSettings, reportStatus);
    let dko3LesMap: Map<string, Les> = new Map();
    for (let les of dko3Data.lessen)
        dko3LesMap.set(les.id, les);

    //move linked lessen inside the alias les.
    let lesMomentenMap: Map<string, TaggedDko3LesMoment> = new Map<string, TaggedDko3LesMoment>();
    for (let les of dko3LesSet.values())
        lesMomentenMap.set(les.lesMoment.momentId, les);
    loopAliasLessen: for (let aliasLes of dko3Data.dko3AliasLessen) {
        if (aliasLes.linkedLessenIds.length < 2) {
            reportStatus(`Error: alias les <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> heeft geen 2 geldige gekoppelde lessen.`, "error");
            continue;
        }
        let linkedLessen = aliasLes.linkedLessenIds.map(lesId => dko3LesMap.get(lesId));
        if (linkedLessen.includes(undefined)) {
            reportStatus(`Voor aliasles <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> zijn er ontbrekende gekoppelde lessen.`, "error");
            continue;
        }
        let linkedLesMomentIds = linkedLessen.map((les: Les) => les.dayTimeSlices.map(slice => Dko3LesMoment.createLesMomentId(les, slice))).flat();
        let linkedLesMomenten = linkedLesMomentIds.map(momentId => lesMomentenMap.get(momentId));
        //sort the moments so we can merge them
        linkedLesMomenten.sort((a: TaggedDko3LesMoment, b: TaggedDko3LesMoment) => DayTimeSlice.startToNumber(a.lesMoment.dayTimeSlice) - DayTimeSlice.startToNumber(b.lesMoment.dayTimeSlice));
        let previousLesMoment = linkedLesMomenten[0]!;
        for (let i = 1; i < linkedLesMomenten.length; i++) {
            let currentLesMoment = linkedLesMomenten[i]!;
            if (!currentLesMoment.lesMoment.dayTimeSlice.timeSlice || !previousLesMoment.lesMoment.dayTimeSlice.timeSlice) {
                reportStatus(`Voor aliasles <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> zijn er ontbrekende lestijden.`, "error");
                continue loopAliasLessen;
            }
            if (DayTimeSlice.endToNumber(previousLesMoment.lesMoment.dayTimeSlice) == DayTimeSlice.startToNumber(currentLesMoment.lesMoment.dayTimeSlice)) {
                //yeah ! we can merge them!!!
                let newTimeSlice = new TimeSlice(structuredClone(previousLesMoment.lesMoment.dayTimeSlice.timeSlice!.start), structuredClone(currentLesMoment.lesMoment.dayTimeSlice.timeSlice!.end));
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
    return dko3LesSet;
}

async function buildDiff(excelLessen: ClassDef[], dko3Data: Dko3DiffData, reportStatus: StatusCallback, diffSettings: DiffSettings) {
    reportStatus("Lessen vergelijken...");
    let excelLesSet: Set<TaggedExcelLes> = new Set<TaggedExcelLes>(excelLessen.map(les => new TaggedExcelLes(les, dko3Data.teachers)));
    excelLesSet.forEach(les=> {
        if(isExcelLesToIgnore(les, diffSettings.ignoreList))
            excelLesSet.delete(les);
    });
    let dko3LesSet: Set<TaggedDko3LesMoment> = createLesMomenten(dko3Data, reportStatus, diffSettings);
    //todo: split dko3Les.vaknaam into array. Split on "+" and trim.
    //get extra teaches
    let extraTeacherCache = ExtraTeacherCache.fromJSON(dko3Data.extraTeachersCache ?? [])
    for (const les1 of [...dko3LesSet.values()]
        .filter(les => les.lesMoment.les.teacher.includes("(en nog"))) {
        les1.teachers = await extraTeacherCache.getExtraTeachers(les1.lesMoment.les.id);
    }

    let diffs: Diff[] = [];
    let ctx: MatchContext = {};
    diffs = matchIt(ctx, dko3LesSet, excelLesSet, "perfect match", matchBasedOnName);
    diffs.push(...matchIt(ctx, dko3LesSet, excelLesSet, "perfect match", perfectMatch));
    diffs.push(...matchIt(ctx, dko3LesSet, excelLesSet, "match without gradeYears", matchWithoutGradeYears));
    diffs.push(...matchIt(ctx, dko3LesSet, excelLesSet, "match without teacher", matchWithoutTeacher));
    diffs.push(...matchIt(ctx, dko3LesSet, excelLesSet, "match without location", matchWithoutLocation));
    diffs.push(...matchIt(ctx, dko3LesSet, excelLesSet, "match without time and day", matchWithoutTimeAndDay));
    diffs.push(...matchIt(ctx, dko3LesSet, excelLesSet, "match without teacher, time and day", matchWithoutTeacherTimeAndDay));
    console.log(diffs);
    console.log(dko3LesSet.values());
    console.log(excelLesSet.values());
    return {diffs, dko3LesSet, excelLesSet, extraTeacherCache};
}

class ExtraTeacherCache {
    teacherMap: Map<string, string[]> = new Map();

    async getExtraTeachers(lesId: string) {
        if(this.teacherMap.has(lesId))
            return this.teacherMap.get(lesId)!;

        let newEntry = await getExtraTeachers(lesId);
        this.teacherMap.set(lesId, newEntry);
        return newEntry;
    }

    public toJSON() {
        return [...this.teacherMap.entries()];
    }

    public static fromJSON(json: [string, string[]][]) {
        let cache = new ExtraTeacherCache();
        cache.teacherMap = new Map(json);
        return cache;
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

type MatchResult = {
    excelLes: TaggedExcelLes,
    weight: Weight
}
function matchIt(ctx: MatchContext, dko3LesSet: Set<TaggedDko3LesMoment>, excelLesSet: Set<TaggedExcelLes>, diffType: DiffType, matchFunction: (ctx: MatchContext, dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>) => (MatchResult | null)) {
    let diffs: Diff[] = [];
    for(let dko3Les of dko3LesSet) {
        let result = matchFunction(ctx, dko3Les, excelLesSet);
        if(result) {
            diffs.push({excelLes: result.excelLes, dko3Les: dko3Les, diffType, weight: result.weight});
            dko3LesSet.delete(dko3Les);
            excelLesSet.delete(result.excelLes);
        }
    }
    return diffs;
}

function dko3GradeYearsContain(dko3GradeYears: GradeYear[], excelGradeYear: GradeYear) {
    for(let dko3GradeYear of dko3GradeYears) {
        if(GradeYear.matches(excelGradeYear, dko3GradeYear))
            return true;
    }
    return false;
}

function weigh1000(dko3Les: TaggedDko3LesMoment, excelLes: TaggedExcelLes, extraExcelTeachers?: string[]) {
    let weight = new Weight();
    weight.diffSubject = !dko3Les.subjects.some(t => excelLes.subjects.includes(t));
    weight.diffDayTime = !DayTimeSlice.equal(dko3Les.lesMoment.dayTimeSlice,excelLes.dayTimeSlice);
    weight.diffLocation = dko3Les.location != excelLes.location;
    if(extraExcelTeachers)
        weight.diffTeacher = !dko3Les.teachers.some(t => extraExcelTeachers.includes(t));
    else
        weight.diffTeacher = !dko3Les.teachers.some(t => excelLes.teachers.includes(t));
    for(let excelGradeYear of excelLes.gradeYears) {
        if(!dko3GradeYearsContain(dko3Les.gradeYears, excelGradeYear))
            weight.diffGradeYears++;
    }
    //all excelGradeYears match (fit within) the dkoGradeYears, but check the count for a perfect match.
    if(excelLes.gradeYears.length != dko3Les.gradeYears.length)
        weight.diffGradeYears++;
    weight.calcWeight();
    return weight;
}
type MatchContext = {
    excelLesNamesMap?: Map<string, TaggedExcelLes[]>
}

function createExcelLesNamesMap(excelLesSet: Set<TaggedExcelLes>) {
    let excelLesNamesMap: Map<string, TaggedExcelLes[]> = new Map();
    for (let excelLes of excelLesSet) {
        if(!excelLes.lesMoment.className)
            continue;
        let item = excelLesNamesMap.get(excelLes.lesMoment.className.toLowerCase())
        if(!item)
            excelLesNamesMap.set(excelLes.lesMoment.className.toLowerCase(), [excelLes]);
        else
            item.push(excelLes);
    }
    return excelLesNamesMap;
}

function matchBasedOnName(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): MatchResult | null {
    if(!ctx.excelLesNamesMap) {
        ctx.excelLesNamesMap = createExcelLesNamesMap(excelLesSet);
    }
    let excelLessen = ctx.excelLesNamesMap.get(dko3Les.lesMoment.les.naam.trim().toLowerCase())
    if(!excelLessen)
        return null;
    if(dko3Les.lesMoment.lesMomenten.length == 1) {
        let weight = weigh1000(dko3Les, excelLessen[0], excelLessen.map(l => l.teachers).flat());
        return {excelLes: excelLessen[0], weight};
    }

    //Check for related lessen
    let results: MatchResult[] = [];
    if(dko3Les.lesMoment.lesMomenten.length > 1) {
        for(let excelLes of excelLessen) {
            let weight = weigh1000(dko3Les, excelLes, excelLessen.map(l => l.teachers).flat());
            results.push({excelLes, weight});
        }
        results.sort((a, b) => b.weight.weight - a.weight.weight);
        return results[0];
    }

    //We have multiple unrelated excelLessen with the same name. Weigh them.
    for(let excelLes of excelLessen) {
        let weight = weigh1000(dko3Les, excelLes);
        results.push({excelLes, weight});
    }
    results.sort((a, b) => b.weight.weight - a.weight.weight);
    return results[0];
}

function perfectMatch(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): MatchResult | null {
    for(let excelLes of excelLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if(weight.weight == 1000)
            return {excelLes, weight};
    }
    return null;
}
function matchWithoutGradeYears(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): MatchResult | null {
    for(let excelLes of excelLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if(weight.diffSubject)
            continue;
        if(weight.diffDayTime)
            continue;
        if(weight.diffLocation)
            continue;
        if(weight.diffTeacher)
            continue;

        return {excelLes, weight};
    }
    return null;
}

function matchWithoutLocation(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): MatchResult | null {
    for(let excelLes of excelLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if(weight.diffSubject)
            continue;
        if(weight.diffDayTime)
            continue;
        if(weight.diffTeacher)
            continue;
        if(weight.diffGradeYears != 0)
            continue;
        return {excelLes, weight};
        }
    return null;
}

function matchWithoutTimeAndDay(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): MatchResult | null {
    for(let excelLes of excelLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if(weight.diffSubject)
            continue;
        if(weight.diffLocation)
            continue;
        if(weight.diffTeacher)
            continue;
        if(weight.diffGradeYears != 0)
            continue;
        return {excelLes, weight};
    }
    return null;
}

function matchWithoutTeacherTimeAndDay(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): MatchResult | null {
    for(let excelLes of excelLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if(weight.diffSubject)
            continue;
        if(weight.diffLocation)
            continue;
        if(weight.diffGradeYears != 0)
            continue;
        return {excelLes, weight};
    }
    return null;
}

function matchWithoutTeacher(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, excelLesSet: Set<TaggedExcelLes>): MatchResult | null {
    for(let excelLes of excelLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if(weight.diffSubject)
            continue;
        if(weight.diffDayTime)
            continue;
        if(weight.diffLocation)
            continue;
        if(weight.diffGradeYears != 0)
            continue;
        return {excelLes, weight};
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
    let fromCloud= await cloud.json.fetch(getDiffsCloudFileName(academie, schoolYear))
        .catch(function (err: any): null {
            console.log(err);
            return null;
        }) as JsonDiffs | null;
    if(fromCloud) {  //todo: temp until cloud is updated.
        for (let diff of fromCloud.diffs) {
            if (!diff.dko3Les.gradeYears) diff.dko3Les.gradeYears = [];
            if (!diff.excelLes.gradeYears) diff.excelLes.gradeYears = [];
        }
        for(let orphan of fromCloud.orphanedDko3Lessen)
            if(!orphan.gradeYears) orphan.gradeYears = [];
        for(let orphan of fromCloud.orphanedExcelLessen)
            if(!orphan.gradeYears) orphan.gradeYears = [];
    }
    return fromCloud;
}

export interface JsonBasicLesMoment {
    subjects: string;
    teachers: string;
    day: DayUppercase;
    timeSlice: string;
    location: string;
    hash: string;
    ignore: boolean;
    gradeYears: GradeYear[];
}

export interface JsonExcelLesMoment extends JsonBasicLesMoment{
    excelRow: number;
    excelColumn: number;
    cellValue: string;
    workBook: string;
    workSheet: string;
}

export interface JsonDko3LesMoment extends JsonBasicLesMoment{
    lesId: string;
    momentId: string;
}

export interface JsonDiff {
    excelLes: JsonExcelLesMoment;
    dko3Les: JsonDko3LesMoment;
    diffType: DiffType;
    weight: Weight;
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
        .filter(diff => diff.diffType != "perfect match" || diff.weight.weight != 1000)
        .map(diff => {
            return {
                excelLes: excelLesToJson(diff.excelLes),
                dko3Les: dko3LesToJson(diff.dko3Les),
                diffType: diff.diffType,
                weight: diff.weight
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
        let workBook = workBooks.get(excelData.workbookName)!;
        let workSheet: JsonWorkSheet = {
            name: excelData.worksheetName,
            url: excelData.url!
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
        timeSlice: toCompactTimeSliceString(dko3Les.lesMoment.dayTimeSlice.timeSlice!),
        subjects: dko3Les.subjects.join(","),
        teachers: dko3Les.teachers.join(","),
        location: dko3Les.location!,
        hash: dko3Les.getHash(),
        ignore: dko3Les.ignore,
        gradeYears: dko3Les.gradeYears,
    };
}

function excelLesToJson(excelLes: TaggedExcelLes): JsonExcelLesMoment {
    return {
        excelColumn: excelLes.lesMoment.excelColumn,
        excelRow: excelLes.lesMoment.excelRow,
        day: excelLes.lesMoment.day as DayUppercase,
        timeSlice: toCompactTimeSliceString(excelLes.lesMoment.timeSlice),
        subjects: excelLes.subjects.join(","),
        teachers: excelLes.teachers.join(","),
        location: excelLes.location!,
        cellValue: excelLes.lesMoment.cellValue,
        workBook: excelLes.lesMoment.table.excelData.workbookName,
        workSheet: excelLes.lesMoment.table.excelData.worksheetName,
        hash: excelLes.getHash(),
        ignore: excelLes.ignore,
        gradeYears: excelLes.gradeYears,
    };
}

export function createDiffTable(divResults: HTMLDivElement) {
    let {first: table, last: tbody} = emmet.appendChild(divResults, "table#orphans.diff>(thead>tr>(th.subject{Vak/Lesnaam}+th.gradeYear{Gr.Jr}+th.teacher{Leraar}+th.day{Dag}+th.{Uur}+th.location{Vestiging}+th+th))+tbody") as { target: HTMLDivElement, first: HTMLTableElement, last: HTMLTableSectionElement };
    return {table, tbody};
}

function toCompactTimeSliceString(timeSlice: TimeSlice) {
    if(!timeSlice)
        return "-geen uur-";
    return `${pad(timeSlice.start.hour, 2)}:${pad(timeSlice.start.minutes, 2)} - ${pad(timeSlice.end.hour, 2)}:${pad(timeSlice.end.minutes, 2)}`;
}

export async function getDiffForLes(lesId: string, academie: string, schoolYear: string) {
    let jsonDiffs = await getJsonDiffsCached(academie, schoolYear);
    return jsonDiffs!.diffs.find(diff => diff.dko3Les.lesId == lesId);
}

export async function getUrlForWorksheet(workBook: string, workSheet: string, cellAddress: string, academie: string, schoolYear: string) {
    let jsonDiffs = await getJsonDiffsCached(academie, schoolYear);
    let url =  jsonDiffs!
        .workBooks.find(wb => wb.name == workBook)
        ?.worksheets.find(ws => ws.name == workSheet)
        ?.url;
    if(cellAddress) {
        url = url + `&activeCell=${workSheet}!${cellAddress}`; //assuming activeCell is not the only param in the url.
    }
    return url;
}
