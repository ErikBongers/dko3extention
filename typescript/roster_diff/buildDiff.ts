import {JsonExcelData} from "./excel";
import {RosterFactory} from "./rosterFactory";
import {ClassDef, ExcelRoster, TeacherDef, TimeSlice} from "./excelRoster";
import {cloud, deleteNotification, fetchExcelData, fetchFolderChanged, fetchIgnoredDiffHashes} from "../cloud";
import {FetchChain} from "../table/fetchChain";
import {pad} from "../globals";
import {fetchLessen} from "../lessen/observer";
import {DayTimeSlice, DayUppercase, Les, scrapeLessenOverzicht} from "../lessen/scrape";
import {DKO3_BASE_URL, LESSEN_TABLE_ID} from "../def";
import {getTableFromHash, InfoBarTableFetchListener} from "../table/loadAnyTable";
import {emmet} from "../../libs/Emmeter/html";
import {fetchAndDisplayNotifications} from "../notifications/notifications";
import {DiffGotoData, DiffPageType, excelPostoExcelAddress, getDiffsDko3CacheFileName, StatusReporter} from "./showDiff";
import {DiffSettings} from "./diffSettings";
import {parseWww, preTranslate, TaggedWwwLesDef} from "../www_diff/buildDiff";
import {ComparableLesMoment, Diff, DiffLesType, DiffType, Dko3LesMoment, GradeYear, LesType, matchBasedOnName, MatchContext, matchIt, matchWithoutGradeYears, matchWithoutGradeYearsTeacher, matchWithoutLocation, matchWithoutTeacher, matchWithoutTeacherTimeAndDay, matchWithoutTimeAndDay, perfectMatch, TaggedDko3LesMoment, TaggedLes, Weight} from "./calcDiff";

let cachedDiffs: JsonDiffs | undefined = undefined;
export async function getJsonDiffsCached(academie: string, schoolYear: string, diffPageType: DiffPageType) {
    if(cachedDiffs)
        return cachedDiffs;
    let diffs = await getDiffsFromCloud(academie, schoolYear, diffPageType);
    if(diffs) {
        await saveJsonDiffs(academie, schoolYear, diffPageType, diffs);
    }
    return diffs;
}

async function saveJsonDiffs(academie: string, schoolYear: string, diffPageType: "EXCEL" | "WWW", jsonDiffs: JsonDiffs) {
    let fileName = getDiffsCloudFileName(academie, schoolYear, diffPageType);
    await cloud.json.upload(fileName, jsonDiffs);
    sessionStorage.setItem(fileName, JSON.stringify(jsonDiffs));
}

export type DataPreparationFunction = (statusReporter: StatusReporter, academie: string, schoolYear: string, dko3DiffData: PreparedDko3DiffData, diffSettings: PreparedDiffSettings) =>  Promise<{excelRosters: ExcelRoster[], otherLesSet: Set<ComparableLesMoment>}>;

export let prepareWwwData: DataPreparationFunction = async function(statusReporter: StatusReporter, academie: string, schoolYear: string, dko3DiffData: PreparedDko3DiffData, diffSettings: PreparedDiffSettings) {
    statusReporter.reportStatus("Website uurroosters ophalen...");
    let otherLessen = new Set(await parseWww(dko3DiffData, diffSettings));
    return {excelRosters: [], otherLesSet: otherLessen};
}

export let prepareExcelData: DataPreparationFunction = async function(statusReporter: StatusReporter, academie: string, schoolYear: string, dko3DiffData: PreparedDko3DiffData, diffSettings: PreparedDiffSettings) {
    statusReporter.reportStatus("Excel bestanden ophalen...");
    let folderPath = await fetchFolderChanged(`Dko3/Uurroosters/${academie}/${schoolYear}/`);
    statusReporter.reportStatus(`${folderPath.files.length} Excel bestanden gevonden.`);
    let jsonExcelDatas: JsonExcelData[] = [];
    for (let file of folderPath.files) {
        let fileShortName = file.name.replaceAll("Dko3/Uurroosters/", "");
        statusReporter.reportStatus(`Inlezen van ${fileShortName}...`);
        let excelData = await fetchExcelData(file.name);
        jsonExcelDatas.push(excelData);
    }

    let excelLessenArray: ClassDef[][] = [];
    let excelRosters: ExcelRoster[] = [];
    statusReporter.reportStatus("Excel tabellen bouwen...");
    for (let excelData of jsonExcelDatas) {
        let factory = new RosterFactory(excelData);
        let table = factory.getTable();
        let roster = new ExcelRoster(table, dko3DiffData, diffSettings);
        excelRosters.push(roster);
        let classDefs = roster.scrapeUurrooster();
        if (classDefs)
            excelLessenArray.push(classDefs);
        console.log(excelLessenArray);
    }
    statusReporter.reportStatus("Lessen vergelijken...");
    let dddata = dko3DiffData;
    let otherLesSet: Set<ComparableLesMoment> = new Set<TaggedExcelLes>(excelLessenArray.flat().map(les => new TaggedExcelLes(les, dddata.preparedDko3DiffData.teachers, diffSettings)));
    otherLesSet.forEach(les => {
        if (isExcelLesToIgnore(les as TaggedExcelLes, diffSettings.preparedDiffSettings.ignoreList))
            otherLesSet.delete(les);
    });
    return {excelRosters, otherLesSet};
}

export type PreparedDko3DiffData = { preparedDko3DiffData: Dko3DiffData };
export type PreparedDiffSettings = {
    preparedDiffSettings: DiffSettings,
    classNamesFromTags: string[],
};
export type PreparedData = {dko3DiffData: PreparedDko3DiffData, diffSettings: PreparedDiffSettings};
function updateDko3DiffDataAndSettings(dko3DiffData: Dko3DiffData, diffSettings: DiffSettings): PreparedData {
    for(let teacher of dko3DiffData.teachers) {
        for(let tagDef of diffSettings.tagDefs) {
            if(teacher.fullName == tagDef.tag)
                teacher.callName = tagDef.searchString;
        }
    }
    let classNamesFromTags = diffSettings.tagDefs
        .filter(tagDef => tagDef.isClassName)
        .map(tagDef => tagDef.searchString);
    return {dko3DiffData: {preparedDko3DiffData: dko3DiffData}, diffSettings: {preparedDiffSettings: diffSettings, classNamesFromTags} }
}

export async function buildAndSaveDiff(statusReporter: StatusReporter,
                                       fetchListener: InfoBarTableFetchListener,
                                       academie: string, schoolYear: string,
                                       dko3DiffData: Dko3DiffData | null,
                                       diffSettings: DiffSettings,
                                       diffPageType: DiffPageType,
                                       prepareOtherData: DataPreparationFunction,
                                       errors: string[]) {
    statusReporter.reportStatus(`DKO3 data ophalen...`);
    if(!dko3DiffData)
        dko3DiffData = await getDko3Data(schoolYear, statusReporter, fetchListener);
    let json = JSON.stringify(dko3DiffData);
    let preparedData = updateDko3DiffDataAndSettings(dko3DiffData, diffSettings);

    let {excelRosters, otherLesSet} = await prepareOtherData(statusReporter, academie, schoolYear, preparedData.dko3DiffData, preparedData.diffSettings);

    let res = {excelRosters, ...await calcDiff(dko3DiffData, statusReporter, preparedData.diffSettings, otherLesSet)};
    //no await:
    deleteNotification("FILE_POSTED").then(() => fetchAndDisplayNotifications());

    //parse again, just in case previous function changed the dko3 data.
    dko3DiffData = JSON.parse(json) as Dko3DiffData;
    dko3DiffData.extraTeachersCache = res.extraTeacherCache.toJSON();
    localStorage.setItem(getDiffsDko3CacheFileName(academie, schoolYear, diffPageType), JSON.stringify(dko3DiffData));

    let jsonDiffs = await createJsonDiffs(res.diffs, res.dko3LesSet, res.otherLesSet, res.excelRosters, academie, schoolYear, diffPageType, errors);
    await saveJsonDiffs(academie, schoolYear, diffPageType, jsonDiffs);
    statusReporter.reportStatus(``);
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

export async function getDko3Data(schoolYear: string, statusReporter: StatusReporter, fetchListener: InfoBarTableFetchListener): Promise<Dko3DiffData> {
    statusReporter.reportStatus("Vestigingsplaatsen ophalen...");
    let locationsTable = await getTableFromHash("extra-academie-vestigingsplaatsen", true, fetchListener);
    let locations = [...locationsTable.getRows()].map(tr => tr.cells[1].textContent);

    statusReporter.reportStatus("Leraren ophalen...");
    let teachers = await fetchTeachers(schoolYear);
    let lessen = (await scrapeAllNormalLessen(schoolYear, statusReporter)).map(l => l.les);
    statusReporter.reportStatus("Ophalen aliaslessen...");
    let dko3AliasLessen = (await scrapeLessen(Domein.Woord, LesType.alias, schoolYear)).map(l => l.les);
    for (let les of dko3AliasLessen) {
        les.linkedLessenIds = await getAliassesForLes(les.id, statusReporter);
    }
    //remove aliaslessen with only one linked les. We're don't care about those.
    dko3AliasLessen = dko3AliasLessen.filter(l => l.linkedLessenIds.length > 1);
    let subjects: string[] = lessen.map(les => [les.vakNaam, les.naam]).flat();
    subjects = [...new Set(subjects)];
    let classNames: string[] = lessen.map(les => les.naam).filter(n => n!= "");
    subjects = [...new Set(subjects)];

    return {lessen, locations, teachers, dko3AliasLessen, subjects, classNames};
}

export async function scrapeAllNormalLessen(schoolYear: string, statusReporter: StatusReporter) {
    statusReporter.reportStatus("Ophalen woordlessen...");
    let dko3Lessen = await scrapeLessen(Domein.Woord, LesType.gewone, schoolYear);
    statusReporter.reportStatus("Ophalen muzieklessen...");
    let muziekLessen = await scrapeLessen(Domein.Muziek, LesType.gewone, schoolYear);
    statusReporter.reportStatus("Ophalen kunstenbad lessen...");
    let kbLessen = await scrapeLessen(Domein.DomeinOV, LesType.gewone, schoolYear);
    return [...dko3Lessen, ...muziekLessen, ...kbLessen];
}

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

export class TaggedExcelLes extends TaggedLes<ClassDef> implements ComparableLesMoment {
    public lesType: DiffLesType = "excel";
    public className: string | null;
    public dayTimeSlice: DayTimeSlice;
    public hash: string;
    constructor(les: ClassDef, teachers: TeacherDef[], diffSettings: PreparedDiffSettings) {
        let searchText = " " + les.cellValue
            .toLowerCase()
            .replaceAll('\n', " \n ") //todo: dedup this code.
            .replaceAll("(", " ( ")
            .replaceAll(")", " ) ")
            .replaceAll(".", " . ")
            .replaceAll(",", " , ")
            .replaceAll("-", " - ")
            + " ";
        super(les, [], searchText, [], false);
        this.className = this.lesMoment.className;
        this.location = this.lesMoment.location;//translate probably already done.
        this.teachers = preTranslate(les.cellValue, diffSettings)
            .split(/[\/,]/g).map(t => findTeacher(t, teachers, ""))
            .filter(t => t != "");
        if(this.teachers.length == 0) {
            this.teachers = preTranslate(this.lesMoment.teacher, diffSettings)
                .split(/[\/,]/g)
                .map(t => t.trim())
                .filter(t => t.substring(t.length-1) != "?")
                .map(t => findTeacher(t, teachers, t))
                .filter(t => t != "");
        }
        this.subjects = les.subjects;
        this.subjects = this.subjects.filter(s => s!!);
        if(this.lesMoment.className)
            this.subjects.push(this.lesMoment.className);
        this.subjects = [...new Set(this.subjects)];
        this.dayTimeSlice = new DayTimeSlice(les.day, les.timeSlice);
        this.gradeYears = les.gradeYears;
        this.hash = les.getHash();
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

function splitDko3LessenIntoLesmomenten(dko3Data: Dko3DiffData, diffSettings: PreparedDiffSettings, statusReporter: StatusReporter) {
    //split each Dko3 les into multiple lesMoments
    let lesMomenten = dko3Data.lessen
        .filter(les => !isDko3LesToIgnore(les, diffSettings.preparedDiffSettings.ignoreList))
        .map(les => {
            if (les.dayTimeSlices.length == 0)
                statusReporter.addError(`Les <a href="https://administratie.dko3.cloud/#lessen-les?id=${les.id}">${les.id}</a> heeft geen lesmoment. ${les.vakNaam}(${les.naam}), ${les.teacher}`, "error");
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

function createLesMomenten(dko3Data: Dko3DiffData, statusReporter: StatusReporter, diffSettings: PreparedDiffSettings) {
    let dko3LesSet = splitDko3LessenIntoLesmomenten(dko3Data, diffSettings, statusReporter);
    let dko3LesMap: Map<string, Les> = new Map();
    for (let les of dko3Data.lessen)
        dko3LesMap.set(les.id, les);

    //move linked lessen inside the alias les.
    let lesMomentenMap: Map<string, TaggedDko3LesMoment> = new Map<string, TaggedDko3LesMoment>();
    for (let les of dko3LesSet.values())
        lesMomentenMap.set(les.lesMoment.momentId, les);
    loopAliasLessen: for (let aliasLes of dko3Data.dko3AliasLessen) {
        if (aliasLes.linkedLessenIds.length < 2) {
            statusReporter.addError(`Error: alias les <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> heeft geen 2 geldige gekoppelde lessen.`, "error");
            continue;
        }
        let possibleLinkedLessen = aliasLes.linkedLessenIds.map(lesId => dko3LesMap.get(lesId));
        if (possibleLinkedLessen.includes(undefined)) {
            statusReporter.addError(`Voor aliasles <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> zijn er ontbrekende gekoppelde lessen.`, "error");
            continue;
        }
        let linkedLessen: Les[] = possibleLinkedLessen as Les[]; //already checked for null.

        let aliasLocation = aliasLes.vestiging;
        let aliasGradeYearsStr = GradeYear.toString(aliasLes.gradeYears);
        for(let linkedLes of linkedLessen) {
            if(linkedLes.vestiging != aliasLocation)
                statusReporter.addError(`Voor aliasles <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> is de vestiging niet dezelfde als de gekoppelde lessen.`, "error");
            if(GradeYear.toString(linkedLes?.gradeYears??[]) != aliasGradeYearsStr)
                statusReporter.addError(`Voor aliasles <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> zijn de graden en jaren niet gelijk aan de gekoppelde les <a href="https://administratie.dko3.cloud/#lessen-les?id=${linkedLes.id}">${linkedLes.id}</a>.`, "error");
            if(linkedLes.online)
                statusReporter.addError(`Voor aliasles <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> is gekoppelde les <a href="https://administratie.dko3.cloud/#lessen-les?id=${linkedLes.id}">${linkedLes.id}</a> online zichtbaar.`, "error");
        }
        let linkedLesMomentIds = linkedLessen.map((les: Les) => les.dayTimeSlices.map(slice => Dko3LesMoment.createLesMomentId(les, slice))).flat();
        let linkedLesMomenten = linkedLesMomentIds.map(momentId => lesMomentenMap.get(momentId)!); //! should all exist in the map.
        //sort the moments so we can merge them
        linkedLesMomenten.sort((a: TaggedDko3LesMoment, b: TaggedDko3LesMoment) => DayTimeSlice.startToNumber(a.lesMoment.dayTimeSlice) - DayTimeSlice.startToNumber(b.lesMoment.dayTimeSlice));
        let previousLesMoment = linkedLesMomenten[0]!;
        for (let i = 1; i < linkedLesMomenten.length; i++) {
            let currentLesMoment = linkedLesMomenten[i]!;
            if (!currentLesMoment.lesMoment.dayTimeSlice.timeSlice || !previousLesMoment.lesMoment.dayTimeSlice.timeSlice) {
                statusReporter.addError(`Voor aliasles <a href="https://administratie.dko3.cloud/#lessen-les?id=${aliasLes.id}">${aliasLes.id}</a> zijn er ontbrekende lestijden.`, "error");
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

export async function calcDiff(dko3Data: Dko3DiffData, statusReporter: StatusReporter, diffSettings: PreparedDiffSettings, otherLesSet: Set<ComparableLesMoment>) {
    let dko3LesSet: Set<TaggedDko3LesMoment> = createLesMomenten(dko3Data, statusReporter, diffSettings);
    //todo: split dko3Les.vaknaam into array. Split on "+" and trim.
    //get extra teaches
    let extraTeacherCache = ExtraTeacherCache.fromJSON(dko3Data.extraTeachersCache ?? [])
    for (const les1 of [...dko3LesSet.values()]
        .filter(les => les.lesMoment.les.teacher.includes("(en nog"))) {
        les1.teachers = await extraTeacherCache.getExtraTeachers(les1.lesMoment.les.id);
    }

    let diffs: Diff[] = [];
    let ctx: MatchContext = {};
    diffs.push(...matchIt(ctx, dko3LesSet, otherLesSet, "perfect match", diffSettings, matchBasedOnName));
    diffs.push(...matchIt(ctx, dko3LesSet, otherLesSet, "perfect match", diffSettings, perfectMatch));
    diffs.push(...matchIt(ctx, dko3LesSet, otherLesSet, "match without gradeYears", diffSettings, matchWithoutGradeYears));
    diffs.push(...matchIt(ctx, dko3LesSet, otherLesSet, "match without teacher", diffSettings, matchWithoutTeacher));
    diffs.push(...matchIt(ctx, dko3LesSet, otherLesSet, "match without location", diffSettings, matchWithoutLocation));
    diffs.push(...matchIt(ctx, dko3LesSet, otherLesSet, "match without time and day", diffSettings, matchWithoutTimeAndDay));
    diffs.push(...matchIt(ctx, dko3LesSet, otherLesSet, "match without teacher, time and day", diffSettings, matchWithoutTeacherTimeAndDay));
    diffs.push(...matchIt(ctx, dko3LesSet, otherLesSet, "match without time and day and teacher", diffSettings, matchWithoutGradeYearsTeacher));
    console.log(diffs);
    console.log(dko3LesSet.values());
    console.log(otherLesSet.values());
    return {diffs, dko3LesSet, otherLesSet, extraTeacherCache};
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

async function getAliassesForLes(lesId: string, statusReporter: StatusReporter) {
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
        statusReporter.reportStatus(`ERROR: alias les ${lesId} heeft geen (geldige) gekoppelde lessen.`);
    return [...anchors].map(a => a.textContent.trim());
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
    return [...(div.querySelectorAll(`td[data-label="Naam"] strong`) as NodeListOf<HTMLElement>)]
        .map((strong: HTMLElement) => strong.textContent)
        .map(name => {
            let split = name.split(",");
            name = name.trim().replaceAll(" ,", ",");
            return {fullName: name, firstName: split[1].trim(), lastName: split[0].trim()};
        });
}

export function findTeacher(searchString: string, teachers: TeacherDef[], defaultValue: string) {
    let lowerCase = searchString.toLowerCase();
    let paddedLowerCase = " " + lowerCase + " ";
    //first check full name.
    for(let teacherDef of teachers){
        if(lowerCase.includes(teacherDef.firstName.toLowerCase())
          && lowerCase.includes(teacherDef.lastName.toLowerCase()))
            return teacherDef.fullName;
    }
    for(let teacherDef of teachers){
        if(lowerCase.includes(teacherDef.firstName.toLowerCase()))
            return teacherDef.fullName;
        if(teacherDef.callName)
            if(paddedLowerCase.includes(teacherDef.callName.toLowerCase()))
                return teacherDef.fullName;
    }
    return defaultValue;
}

export function getDiffsCloudFileName(academie: string, schoolYear: string, diffPageType: DiffPageType) {
    return `Dko3/${academie}_${schoolYear}_${diffPageType}_diffs.json`;
}

export async function getDiffsFromCloud(academie: string, schoolYear: string, diffPageType: DiffPageType): Promise<JsonDiffs | null> {
    let fromCloud= await cloud.json.fetch(getDiffsCloudFileName(academie, schoolYear, diffPageType))
        .catch(function (err: any): null {
            console.log(err);
            return null;
        }) as JsonDiffs | null;
    if(fromCloud) {  //todo: temp until cloud is updated.
        for (let diff of fromCloud.diffs) {
            if (!diff.dko3Les.gradeYears) diff.dko3Les.gradeYears = [];
            if (!diff.otherLes.gradeYears) diff.otherLes.gradeYears = [];
        }
        for(let orphan of fromCloud.orphanedDko3Lessen)
            if(!orphan.gradeYears) orphan.gradeYears = [];
        for(let orphan of fromCloud.orphanedOtherLessen)
            if(!orphan.gradeYears) orphan.gradeYears = [];
    }
    return fromCloud;
}

export async function getWwwDiffsFromCloud(academie: string, schoolYear: string): Promise<JsonDiffs | null> {
    return null;
}

export interface JsonBasicLesMoment {
    lesType: DiffLesType
    subjects: string;
    teachers: string;
    day: DayUppercase;
    timeSlice: string;
    location: string;
    hash: string;
    ignore: boolean;
    gradeYears: GradeYear[];
}

export interface JsonOtherLesMoment extends JsonBasicLesMoment{
    gotoData: DiffGotoData;
}

export interface JsonDko3LesMoment extends JsonBasicLesMoment{
    lesId: string;
    momentId: string;
}

export interface JsonDiff {
    otherLes: JsonOtherLesMoment;
    dko3Les: JsonDko3LesMoment;
    diffType: DiffType;
    weight: Weight;
}

export interface JsonPerfectMatch {
    otherLes: JsonOtherLesMoment;
    dkoId: string;
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
    errors?: string[],
    orphanedDko3Lessen: JsonDko3LesMoment[];
    orphanedOtherLessen: JsonOtherLesMoment[];
    isoDate: string,
    workBooks: JsonWorkBook[],
    perfectMatches?: JsonPerfectMatch[],
}

export async function setIgnoredFlags(orphanedDko3Lessen: JsonDko3LesMoment[], orphanedOtherLessen: JsonBasicLesMoment[], academie: string, schoolYear: string, diffPageType: DiffPageType) {
    try {
        let ignoreHashes = await fetchIgnoredDiffHashes(academie, schoolYear, diffPageType);
        let ignoreHashSet = new Set(ignoreHashes);
        for (let les of orphanedDko3Lessen) {
            les.ignore = ignoreHashSet.has(les.hash);
        }
        for (let les of orphanedOtherLessen) {
            les.ignore = ignoreHashSet.has(les.hash);
        }
    } catch {}
}

export async function createJsonDiffs(diffList: Diff[], dko3LesSet: Set<TaggedDko3LesMoment>, otherLesSet: Set<ComparableLesMoment>, excelRosters: ExcelRoster[], academie: string, schoolYear: string, diffPageType: DiffPageType, errors: string[]): Promise<JsonDiffs> {
    let diffs: JsonDiff[] = diffList
        .filter(diff => diff.diffType != "perfect match" || diff.weight.weight != 1000)
        .map(diff => {
            let otherLes;
            if(diffPageType == "EXCEL")
                otherLes = excelLesToJson(diff.otherLes as TaggedExcelLes);
            else
                otherLes = wwwLesToJson(diff.otherLes as TaggedWwwLesDef);
            return {
                otherLes,
                dko3Les: dko3LesToJson(diff.dko3Les),
                diffType: diff.diffType,
                weight: diff.weight
            } satisfies JsonDiff;
        });
    let perfectMatches = diffList.filter(diff => diff.diffType == "perfect match" && diff.weight.weight == 1000).map(diff => {
        return {
            otherLes: excelLesToJson(diff.otherLes as TaggedExcelLes),
            dkoId: diff.dko3Les.lesMoment.les.id
        } satisfies JsonPerfectMatch;
    });
    let orphanedDko3Lessen = [...dko3LesSet.values()].map(les => dko3LesToJson(les));
    let orphanedOtherLessen;
    if(diffPageType == "EXCEL")
        orphanedOtherLessen = [...otherLesSet.values()].map(les => excelLesToJson(les as TaggedExcelLes));
    else
        orphanedOtherLessen = [...otherLesSet.values()].map(les => wwwLesToJson(les as TaggedWwwLesDef));

    await setIgnoredFlags(orphanedDko3Lessen, orphanedOtherLessen, academie, schoolYear, diffPageType);
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
        errors,
        orphanedDko3Lessen,
        orphanedOtherLessen,
        isoDate: (new Date()).toISOString(),
        workBooks: [...workBooks.values()],
        perfectMatches
    } satisfies JsonDiffs;
}

function dko3LesToJson(dko3Les: TaggedDko3LesMoment): JsonDko3LesMoment {
    return {
        lesType: "dko3",
        day: dko3Les.lesMoment.dayTimeSlice.day,
        timeSlice: toCompactTimeSliceString(dko3Les.lesMoment.dayTimeSlice.timeSlice!),
        subjects: dko3Les.subjects.join(","),
        teachers: dko3Les.teachers.join(","),
        location: dko3Les.location!,
        hash: dko3Les.getHash(),
        ignore: dko3Les.ignore,
        gradeYears: dko3Les.gradeYears,

        momentId: dko3Les.lesMoment.momentId,
        lesId: dko3Les.lesMoment.les.id,
    };
}

function excelLesToJson(excelLes: TaggedExcelLes): JsonOtherLesMoment {
    return {
        lesType: "excel",
        day: excelLes.lesMoment.day as DayUppercase,
        timeSlice: toCompactTimeSliceString(excelLes.lesMoment.timeSlice),
        subjects: excelLes.subjects.filter(s => !!s).join(","),
        teachers: excelLes.teachers.join(","),
        location: excelLes.location!,
        hash: excelLes.getHash(),
        ignore: excelLes.ignore,
        gradeYears: excelLes.gradeYears,
        gotoData: {
            lesId: "",
            cellAddress: excelPostoExcelAddress(excelLes.lesMoment.excelRow, excelLes.lesMoment.excelColumn),
            text: excelLes.lesMoment.cellValue,
            workBook: excelLes.lesMoment.table.excelData.workbookName,
            workSheet: excelLes.lesMoment.table.excelData.worksheetName,
            url: "",
            rowType: "excel"
        }

    };
}

function wwwLesToJson(wwwLesDef: TaggedWwwLesDef): JsonOtherLesMoment {
    return {
        lesType: "www",
        day: wwwLesDef.day as DayUppercase,
        timeSlice: toCompactTimeSliceString(wwwLesDef.timeSlice),
        subjects: wwwLesDef.subjects.filter(s => !!s).join(","),
        teachers: wwwLesDef.teachers.join(","),
        location: wwwLesDef.location!,
        hash: wwwLesDef.getHash(),
        ignore: wwwLesDef.ignore,
        gradeYears: wwwLesDef.gradeYears,
        gotoData: {
            lesId: "",
            cellAddress: "",
            text: wwwLesDef.lesDef.pageTitle + " | " + wwwLesDef.lesDef.sectionTitle + " | " + wwwLesDef.lesDef.panelTitle + " | " + wwwLesDef.lesDef.className,
            workBook: "",
            workSheet: "",
            url: wwwLesDef.lesDef.url,
            rowType: "www"
        }

    };
}

export function createDiffTable(divResults: HTMLDivElement, diffPageType: DiffPageType) {
    let {first: table, last: tbody} = emmet.appendChild(divResults, `table#orphans${diffPageType}.diff.diffOrphans>(thead>tr>(th.subject{Vak/Lesnaam}+th.gradeYear{Gr.Jr}+th.teacher{Leraar}+th.day{Dag}+th.{Uur}+th.location{Vestiging}+th+th))+tbody`) as { target: HTMLDivElement, first: HTMLTableElement, last: HTMLTableSectionElement };
    return {table, tbody};
}

function toCompactTimeSliceString(timeSlice: TimeSlice) {
    if(!timeSlice)
        return "-geen uur-";
    return `${pad(timeSlice.start.hour, 2)}:${pad(timeSlice.start.minutes, 2)} - ${pad(timeSlice.end.hour, 2)}:${pad(timeSlice.end.minutes, 2)}`;
}

export async function getUrlForWorksheet(workBook: string, workSheet: string, cellAddress: string, academie: string, schoolYear: string) {
    let jsonDiffs = await getJsonDiffsCached(academie, schoolYear, "EXCEL");
    let url =  jsonDiffs!
        .workBooks.find(wb => wb.name == workBook)
        ?.worksheets.find(ws => ws.name == workSheet)
        ?.url;
    if(cellAddress) {
        url = url + `&activeCell=${workSheet}!${cellAddress}`; //assuming activeCell is not the only param in the url.
    }
    return url;
}
