import {ExcelPos, Table, TablePos} from "./excel";
import {RosterFactory} from "./rosterFactory";
import {DayUppercase} from "../lessen/scrape";
import {defaultIgnoreList, defaultTagDefs, DiffSettings, TagDef} from "./diffSettings";

export type GradeYear = {
    grade: string,
    year: number
}

export class ClassDef {
    day: DayUppercase;
    teacher: string;
    timeSlice: TimeSlice;
    subjects: string[];
    location: string;
    gradeYears: GradeYear[];
    excelRow: number;
    excelColumn: number;
    cellValue: string;
    table: Table;
    hash: string;
    ignore: boolean;

    constructor(day: DayUppercase, teacher: string, timeSlice: TimeSlice, subjects: string[], location: string, gradeYears: GradeYear[], excelRow: number, excelColumn: number, cellValue: string, table: Table) {
        this.day = day;
        this.teacher = teacher;
        this.timeSlice = timeSlice;
        this.subjects = subjects;
        this.location = location;
        this.gradeYears = gradeYears;
        this.excelRow = excelRow;
        this.excelColumn = excelColumn;
        this.cellValue = cellValue;
        this.table = table;
        this.hash = cellValue + day + teacher + TimeSlice.toString(timeSlice); //cellvalue + table headers should be defining enough.
    }

    public getHash() { return this.hash; }
}

export class TimeSlice {
    start: Time;
    end: Time;

    public constructor(start: Time, end: Time) {
        this.start = start;
        this.end = end;
    }

    public static equal(timeslice1: TimeSlice, timeslice2: TimeSlice): boolean {
        return timeslice1.start.hour == timeslice2.start.hour
            && timeslice1.start.minutes == timeslice2.start.minutes
            && timeslice1.end.hour == timeslice2.end.hour
            && timeslice1.end.minutes == timeslice2.end.minutes;
    }

    private toString() {} //avoid implicit call.

    public static toString(timeSlice: TimeSlice) {
        return `${timeSlice.start.hour}:${timeSlice.start.minutes}-${timeSlice.end.hour}:${timeSlice.end.minutes}`;
    }
}

export type Time = {
    hour: number,
    minutes: number
}

export function timeToMinutes(time: Time) {
    return time.hour*60+time.minutes;
}

export function dayToMinutes(day: DayUppercase): number {
    switch (day) {
        case "MAANDAG": return 0;
        case "DINSDAG": return 1440;
        case "WOENSDAG": return 2880;
        case "DONDERDAG": return 4320;
        case "VRIJDAG": return 5760;
        case "ZATERDAG": return 7200;
        case "ZONDAG": return 8640;
        default: return -1;
    }
}

export class ExcelRoster {
    public readonly table: Table;
    private locationDefs: string[];
    private readonly subjectDefs: string[];
    private errors: string[] = [];
    private tagDefs: TagDef[];
    public ignoreList: string[];
    public constructor(table: Table, locations: string[], subjects: string[], diffSettings: DiffSettings) {
        this.table = table;
        this.locationDefs = locations;
        this.subjectDefs = subjects;
        this.tagDefs = diffSettings.tagDefs;
        this.ignoreList = diffSettings.ignoreList;
    }

    public scrapeUurrooster(): ClassDef[] | null {
        let timeSlices = this.createTimeSlices();
        if(this.errors.length > 0)
            return null;

        let classDefs: ClassDef[] = [];
        for(let c = 0; c <= this.table.ColumnCount; c++) {
            classDefs = classDefs.concat(this.scrapeColumn(c, timeSlices));
        }
        // console.log(this.classDefsToString(classDefs));
        return classDefs;
    }

    private scrapeColumn(column: number, timeSlices: Map<string, TimeSlice>) {
        let classDefs: ClassDef[] = [];
        let day = RosterFactory.toDayName(this.table.HeaderRowValue(0, column));
        let teacher = this.table.HeaderRowValue(1, column);
        if (teacher.trim() == "?")
            teacher = "";
        for(let row = 0; row < this.table.RowCount; row++) {
            let cellValue = this.table.Cell(row, column)
            if (cellValue) {
                let rx = /\n/g;
                let description = cellValue
                    .replaceAll(rx, " ");
                let parseText = " "+description
                    .replaceAll("(", " ( ") //force spaces around words or numbers
                    .replaceAll(")", " ) ")
                    .replaceAll(",", " , ")
                    .replaceAll("+", " + ")
                    + " ";
                let timeSlice: TimeSlice | undefined = undefined;
                let mergedRange = this.table.RangeOfCell({row, column});
                let sliceStartText = this.table.HeaderColumnValue(mergedRange.Start.row, 0);
                let sliceEndText = this.table.HeaderColumnValue(mergedRange.End.row, 0);
                let sliceStart = timeSlices.get(sliceStartText)!;
                let sliceEnd = timeSlices.get(sliceEndText)!;
                timeSlice = new TimeSlice(sliceStart.start, sliceEnd.end);
                let times = this.findTimes(parseText);
                if(times.length ===2) {
                    timeSlice = new TimeSlice(times[0], times[1]);
                } else if(times.length === 1) {
                    timeSlice = this.moveTimeSliceTo(timeSlice, times[0]);
                }
                let tags = this.findTags(parseText, this.tagDefs);
                let location = this.findLocation(tags);
                let subjects = this.findSubjects(tags);
                let tablePos: TablePos = {row, column};
                let excelPos: ExcelPos = TablePos.toExcel(tablePos, this.table);
                let classDef= new ClassDef(
                    day,
                    teacher,
                    timeSlice,
                    subjects,
                    location,
                    this.findGradeYears(parseText),
                    excelPos.row,
                    excelPos.column,
                    cellValue,
                    this.table
                );
                classDefs.push(classDef);
                row = mergedRange.End.row+1;
            }
        }
        return classDefs;
    }

    private createTimeSlices(): Map<string, TimeSlice> {
        let timeSlices: Map<string, TimeSlice> = new Map<string, TimeSlice>();

        for(let row = 0; row < this.table.RowCount; row++) {
            let value = this.table.HeaderColumnValue(row, 0);
            let timeSlice = parseTimeSlice(value);
            if(timeSlice) {
                timeSlices.set(value, timeSlice);
            } else {
                this.errors.push(`Could not parse time slice: ${value}`);
            }
        }
        return timeSlices;
    }

    private findTimes(text: string) {
        let times: Time[] = [];
        let rx = /\s+(\d?\d)[.:,](\d\d)/gm;
        let matches = rx.exec(text);
        while(matches) {
            let time: Time = {
                hour: parseInt(matches[1]),
                minutes: parseInt(matches[2])
            };
            times.push(time);
            matches = rx.exec(text);
        }
        return times;
    }

    private moveTimeSliceTo(timeSlice: TimeSlice, newStart: Time) {
        let newSlice = structuredClone(timeSlice);
        let startMinutes = timeSlice.start.hour * 60 + timeSlice.start.minutes;
        let endMinutes = timeSlice.end.hour * 60 + timeSlice.end.minutes;
        let duration = endMinutes - startMinutes;
        newSlice.start = structuredClone(newStart);
        let newEndMinutes = newStart.hour * 60 + newStart.minutes + duration;
        newSlice.end.hour = Math.trunc(newEndMinutes / 60);
        newSlice.end.minutes = newEndMinutes % 60;
        return newSlice;
    }


    public static callNames: TagDef[] = [
        {tag: "Van Goethem, Robert", searchString: "bert"},
    ];

    private findLocation(tags: string[]) {
        let location = this.locationDefs.find(location => tags.includes(location));
        if(location)
            return location;
        else
            return "Academie Willem Van Laarstraat, Berchem";
    }

    private findSubjects(tags: string[]) {
        return this.subjectDefs.filter(subject => tags.includes(subject));
    }

    private findTags(text: string, tagDefs: TagDef[]) {
        let tags: string[] = [];
        let lowerCase = text.toLowerCase();
        for (let def of tagDefs) {
            if(lowerCase.includes(def.searchString))
                tags.push(def.tag);
        }
        for (let subject of this.subjectDefs) {
            if(lowerCase.includes(subject.toLowerCase()))
                tags.push(subject);
        }
        return tags;
    }

    private findGradeYears(text: string) {
        let gradeYears: GradeYear[] = [];
        const rx = /\s+(?:(\d)\.(\d)|(S)(\d))(?:\s?[,+\/]\s?(?:(\d)\.(\d)|(S)(\d)))?(?:\s?[,+\/]\s?(?:(\d)\.(\d)|(S)(\d)))?(?:\s?[,+\/]\s?(?:(\d)\.(\d)|(S)(\d)))?(?:\s?[,+\/]\s?(?:(\d)\.(\d)|(S)(\d)))?/gm;
        let matches = rx.exec(text);
        if(matches) {
            let strippedMatches = matches.filter(m => m);
            for (let i = 1; i < strippedMatches.length; i += 2) {
                let gradeYear: GradeYear = {
                    grade: strippedMatches[i],
                    year: parseInt(strippedMatches[i+1])
                };
                gradeYears.push(gradeYear);
            }
            return gradeYears;
        }
        const rx2 = /\s+(\d)\s?[,+]\s?(\d)/gm;
        matches = rx2.exec(text);
        if(matches) {
            let strippedMatches = matches.filter(m => m);
            for (let i = 1; i < strippedMatches.length; i++) {
                let gradeYear: GradeYear = {
                    grade: "2", //assumptionn!
                    year: parseInt(strippedMatches[i])
                };
                gradeYears.push(gradeYear);
            }
            return gradeYears;
        }
        return [];
    }
}


export interface TeacherDef {
    name: string;
    firstName: string;
    callName?: string;
}

export function parseTime(timeString: string): Time | null {
    let timeParts = timeString.split(/[:;,.]/gm);
    if(timeParts.length == 2) {
        return {hour: parseInt(timeParts[0]), minutes: parseInt(timeParts[1])};
    }
    if(timeParts.length == 1) {
        return { hour: parseInt(timeParts[0]), minutes: 0};
    }
    return null;
}

export function parseTimeSlice(text: string): TimeSlice | null {
    let [start, end] = text.split("-");
    if(!start || !end)
        return null;
    let startTime = parseTime(start);
    let endTime = parseTime(end);
    if(!startTime || !endTime)
        return null;
    return new TimeSlice(startTime, endTime);
}
