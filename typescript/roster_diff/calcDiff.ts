import {DayTimeSlice, Les} from "../lessen/scrape";
import {ClassDef} from "./excelRoster";

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
    tags: string[] = [];
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

    public getHash() {
        return this.lesMoment.getHash()
    };
}

export class TaggedDko3LesMoment extends TaggedLes<Dko3LesMoment> {
    constructor(lesMoment: Dko3LesMoment) {
        let searchText = "";
        let tags: string[] = [];

        super(lesMoment, tags, searchText);
        this.location = this.lesMoment.les.vestiging;
        this.teachers = [this.lesMoment.les.teacher
            .replaceAll(/ \(en nog \d\)/g, "")]
            .filter(t => t != "");
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
        if (this.diffSubject)
            this.weight -= 10;
        if (this.diffDayTime)
            this.weight -= 10;
        if (this.diffLocation)
            this.weight -= 10;
        if (this.diffTeacher)
            this.weight -= 10;
        this.weight -= this.diffGradeYears;
    }
}

export type DiffLesType = "excel" | "www" | "dko3";

export interface ComparableLesMoment {
    lesType: DiffLesType;
    hash: string;
    className: string | null;
    location?: string;
    teachers: string[];
    subjects: string[];
    ignore: boolean;
    gradeYears: GradeYear[];
    dayTimeSlice: DayTimeSlice;
}

type MatchResult = {
    otherLes: ComparableLesMoment,
    weight: Weight
}

export enum LesType {modules = "3", gewone = "1", alias = "4"}

export type DiffType =
    "perfect match"
    | "match without subject"
    | "match without gradeYears"
    | "match without teacher"
    | "match without location"
    | "match without time and day"
    | "match without teacher, time and day"
    | "match without time and day and teacher";

export interface Diff {
    otherLes: ComparableLesMoment;
    dko3Les: TaggedDko3LesMoment;
    diffType: DiffType;
    weight: Weight;
}

export function matchIt(ctx: MatchContext, dko3LesSet: Set<TaggedDko3LesMoment>, otherLesSet: Set<ComparableLesMoment>, diffType: DiffType, matchFunction: (ctx: MatchContext, dko3Les: TaggedDko3LesMoment, otherLesSet: Set<ComparableLesMoment>) => (MatchResult | null)) {
    let diffs: Diff[] = [];
    for (let dko3Les of dko3LesSet) {
        let result = matchFunction(ctx, dko3Les, otherLesSet);
        if (result) {
            diffs.push({otherLes: result.otherLes, dko3Les: dko3Les, diffType, weight: result.weight});
            dko3LesSet.delete(dko3Les);
            otherLesSet.delete(result.otherLes);
        }
    }
    return diffs;
}

function weigh1000(dko3Les: TaggedDko3LesMoment, otherLes: ComparableLesMoment, otherTeachersForSameLesName?: string[]) {
    let weight = new Weight();
    weight.diffSubject = !dko3Les.subjects.some(t => otherLes.subjects.includes(t));
    weight.diffDayTime = !DayTimeSlice.equal(dko3Les.lesMoment.dayTimeSlice, otherLes.dayTimeSlice);
    weight.diffLocation = dko3Les.location != otherLes.location;
    let otherTeachers = otherLes.teachers;
    if (otherTeachersForSameLesName)
        otherTeachers = otherTeachersForSameLesName;
    weight.diffTeacher = !dko3Les.teachers.every(t => otherTeachers.includes(t));
    if (!weight.diffTeacher)
        weight.diffTeacher = !otherTeachers.every(t => dko3Les.teachers.includes(t));
    for (let otherGradeYear of otherLes.gradeYears) {
        if (!dko3GradeYearsContain(dko3Les.gradeYears, otherGradeYear))
            weight.diffGradeYears++;
    }
    //all excelGradeYears match (fit within) the dkoGradeYears, but check the count for a perfect match.
    if (otherLes.gradeYears.length != dko3Les.gradeYears.length)
        weight.diffGradeYears++;
    weight.calcWeight();
    return weight;
}

export type MatchContext = {
    otherLesNamesMap?: Map<string, ComparableLesMoment[]>
}

function createLesNamesMap(otherLesSet: Set<ComparableLesMoment>) {
    let otherLesNamesMap: Map<string, ComparableLesMoment[]> = new Map();
    for (let excelLes of otherLesSet) {
        if (!excelLes.className)
            continue;
        let item = otherLesNamesMap.get(excelLes.className.toLowerCase())
        if (!item)
            otherLesNamesMap.set(excelLes.className.toLowerCase(), [excelLes]);
        else
            item.push(excelLes);
    }
    return otherLesNamesMap;
}

export function matchBasedOnName(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, otherLesSet: Set<ComparableLesMoment>): MatchResult | null {
    let results: MatchResult[] = [];

    //prepare on first call
    if (!ctx.otherLesNamesMap) {
        ctx.otherLesNamesMap = createLesNamesMap(otherLesSet);
    }

    let dko3LesName = dko3Les.lesMoment.les.naam.trim().toLowerCase();

    //find other lessen with same name based on the pre-defined classNames.
    let otherLessenWithSameName = ctx.otherLesNamesMap.get(dko3LesName)

    if (!otherLessenWithSameName) {
        //2nd try with stored names.
        let searchName = " " + dko3LesName + " ";
        let storedNames = [" 2va ", " 1vb ", " 1vc ", " 1vd ", " 2vb ", " 2vc ", " harmonielab "]; //todo: add to settings! (or have a check box that marks this as a class name)
        let foundName = storedNames.find(name => searchName.includes(name));
        if(!foundName)
            return null;
        for(let les of otherLesSet ) {
            if((" " + les.className?.toLowerCase() + " ").includes(foundName)) {
                otherLessenWithSameName = [les];
                break;
            }
        }
        if (!otherLessenWithSameName)
            return null;
    }

    //Check for related lessen
    if (dko3Les.lesMoment.lesMomenten.length > 1) {
        for (let otherLes of otherLessenWithSameName) {
            let weight = weigh1000(dko3Les, otherLes, otherLessenWithSameName.map(l => l.teachers).flat());
            results.push({otherLes: otherLes, weight});
        }
        results.sort((a, b) => b.weight.weight - a.weight.weight);
        return results[0];
    }

    //We have multiple unrelated excelLessen with the same name. Weigh them.
    for (let otherLes of otherLessenWithSameName) {
        let weight = weigh1000(dko3Les, otherLes);
        results.push({otherLes: otherLes, weight});
    }
    results.sort((a, b) => b.weight.weight - a.weight.weight);
    return results[0];
}

export function perfectMatch(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, otherLesSet: Set<ComparableLesMoment>): MatchResult | null {
    for (let excelLes of otherLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if (weight.weight == 1000)
            return {otherLes: excelLes, weight};
    }
    return null;
}

export function matchWithoutGradeYears(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, otherLesSet: Set<ComparableLesMoment>): MatchResult | null {
    for (let excelLes of otherLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if (weight.diffSubject)
            continue;
        if (weight.diffDayTime)
            continue;
        if (weight.diffLocation)
            continue;
        if (weight.diffTeacher)
            continue;

        return {otherLes: excelLes, weight};
    }
    return null;
}

export function matchWithoutGradeYearsTeacher(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, otherLesSet: Set<ComparableLesMoment>): MatchResult | null {
    for (let excelLes of otherLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if (weight.diffSubject)
            continue;
        if (weight.diffDayTime)
            continue;
        if (weight.diffLocation)
            continue;

        return {otherLes: excelLes, weight};
    }
    return null;
}

export function matchWithoutLocation(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, otherLesSet: Set<ComparableLesMoment>): MatchResult | null {
    for (let excelLes of otherLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if (weight.diffSubject)
            continue;
        if (weight.diffDayTime)
            continue;
        if (weight.diffTeacher)
            continue;
        if (weight.diffGradeYears != 0)
            continue;
        return {otherLes: excelLes, weight};
    }
    return null;
}

export function matchWithoutTimeAndDay(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, otherLesSet: Set<ComparableLesMoment>): MatchResult | null {
    for (let excelLes of otherLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if (weight.diffSubject)
            continue;
        if (weight.diffLocation)
            continue;
        if (weight.diffTeacher)
            continue;
        if (weight.diffGradeYears != 0)
            continue;
        return {otherLes: excelLes, weight};
    }
    return null;
}

export function matchWithoutTeacherTimeAndDay(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, otherLesSet: Set<ComparableLesMoment>): MatchResult | null {
    for (let excelLes of otherLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if (weight.diffSubject)
            continue;
        if (weight.diffLocation)
            continue;
        if (weight.diffGradeYears != 0)
            continue;
        return {otherLes: excelLes, weight};
    }
    return null;
}

export function matchWithoutTeacher(ctx: MatchContext, dko3Les: TaggedDko3LesMoment, otherLesSet: Set<ComparableLesMoment>): MatchResult | null {
    for (let excelLes of otherLesSet) {
        let weight = weigh1000(dko3Les, excelLes, undefined);
        if (weight.diffSubject)
            continue;
        if (weight.diffDayTime)
            continue;
        if (weight.diffLocation)
            continue;
        if (weight.diffGradeYears != 0)
            continue;
        return {otherLes: excelLes, weight};
    }
    return null;
}

export class GradeYear {
    grade: string | null;
    year: number | null;

    public static equals(gradeYear1: GradeYear, gradeYear2: GradeYear) {
        return gradeYear1.grade == gradeYear2.grade && gradeYear1.year == gradeYear2.year;
    }

    public static matches(partial: GradeYear, exact: GradeYear) {
        // 2._ contains 2.1 2.2 ...
        // _.1 contains 2.1 3.1 ...
        if (partial.grade && partial.grade != exact.grade)
            return false;
        if (partial.year && partial.year != exact.year)
            return false;
        return true;
    }

    public static toString(gradeYears: GradeYear[]): string {
        let str = "";

        for (let gradeYear of gradeYears) {
            if (str != "")
                str += ", ";
            if (gradeYear.grade)
                str += gradeYear.grade;
            if (gradeYear.year) {
                if (gradeYear.grade)
                    str += ".";
                str += gradeYear.year;
            }
        }

        return str;
    }
}

function dko3GradeYearsContain(dko3GradeYears: GradeYear[], otherGradeYear: GradeYear) {
    for (let dko3GradeYear of dko3GradeYears) {
        if (GradeYear.matches(otherGradeYear, dko3GradeYear))
            return true;
    }
    return false;
}