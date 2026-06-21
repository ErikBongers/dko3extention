import {ExcelPos, Table, TablePos} from "./excel";
import {RosterFactory} from "./rosterFactory";
import {DayUppercase} from "../lessen/scrape";
import {TagDef} from "./diffSettings";
import {PreparedDiffSettings, PreparedDko3DiffData} from "./buildDiff";
import {GradeYear} from "./calcDiff";

export class ClassDef {
    day: DayUppercase;
    teacher: string;
    timeSlice: TimeSlice;
    subjects: string[];
    className: string | null;
    location: string;
    gradeYears: GradeYear[];
    excelRow: number;
    excelColumn: number;
    cellValue: string;
    table: Table;
    hash: string;
    // ignore: boolean;

    constructor(day: DayUppercase, teacher: string, timeSlice: TimeSlice, subjects: string[], location: string, gradeYears: GradeYear[], excelRow: number, excelColumn: number, cellValue: string, table: Table, className: string | null) {
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
        this.className = className;
        this.hash = "excel:"+cellValue + day + teacher + TimeSlice.toString(timeSlice); //cellvalue + table headers should be defining enough.
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

    public static parseTime(timeString: string): Time | null {
        let timeParts = timeString.split(/[:;,.]/gm);
        if(timeParts.length == 2) {
            return {hour: parseInt(timeParts[0]), minutes: parseInt(timeParts[1])};
        }
        if(timeParts.length == 1) {
            return { hour: parseInt(timeParts[0]), minutes: 0};
        }
        return null;
    }

    public static parseTimes(text: string) { //todo: merge with above and below?
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

    //Allow for strings like "12 - 13", without the minutes. Avoid this function as it may catch false positives - any number is considered an hour.
    public static parseShortTimes(text: string) {
        text = " " + text + " ";
        let times = TimeSlice.parseTimes(text);

        let rx = /\s+(\d?\d)[u\s]/gm;
        let matches = rx.exec(text);
        while(matches) {
            let time: Time = {
                hour: parseInt(matches[1]),
                minutes: 0
            };
            times.push(time);
            matches = rx.exec(text);
        }
        return times;
    }

    public static parseTimeSlice(text: string): TimeSlice | null {
        let [start, end] = text.split("-");
        if(!start || !end)
            return null;
        let startTime = TimeSlice.parseTime(start);
        let endTime = TimeSlice.parseTime(end);
        if(!startTime || !endTime)
            return null;
        return new TimeSlice(startTime, endTime);
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
    private errors: string[] = [];
    private dko3Data: PreparedDko3DiffData;
    private tagDefs: TagDef[];
    public ignoreList: string[];
    public constructor(table: Table, dko3Data: PreparedDko3DiffData, diffSettings: PreparedDiffSettings) {
        this.table = table;
        this.dko3Data = dko3Data;
        this.tagDefs = diffSettings.preparedDiffSettings.tagDefs;
        this.ignoreList = diffSettings.preparedDiffSettings.ignoreList;
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

    public static makeParsable(text: string, leaveENalone?: "leave 'en' alone") {
        if(leaveENalone == undefined)
            text = text.replaceAll(" en ", " , ");
        return " "+ text
                .replaceAll("(", " ( ") //force spaces around words or numbers
                .replaceAll(")", " ) ")
                .replaceAll(",", " , ")
                .replaceAll("+", " + ")
                .replaceAll("  ", " ") //dedup spaces //" Woordatelier 3 + 4 DNV Tegelzaal Minimum 7 lln "
                .replaceAll("  ", " ") //dedup spaces
            + " ";
    }

    private scrapeColumn(column: number, timeSlices: Map<string, TimeSlice>) {
        let classDefs: ClassDef[] = [];
        let day = RosterFactory.toDayName(this.table.HeaderRowValue(0, column));
        let teacher = this.table.HeaderRowValue(1, column).trim();
        for(let row = 0; row < this.table.RowCount; row++) {
            let cellValue = this.table.Cell(row, column)
            if (cellValue) {
                let rx = /\n/g;
                let description = cellValue
                    .replaceAll(rx, " ");
                let parseText = ExcelRoster.makeParsable(description);
                let timeSlice: TimeSlice | undefined = undefined;
                let mergedRange = this.table.RangeOfCell({row, column});
                let sliceStartText = this.table.HeaderColumnValue(mergedRange.Start.row, 0);
                let sliceEndText = this.table.HeaderColumnValue(mergedRange.End.row, 0);
                let sliceStart = timeSlices.get(sliceStartText)!;
                let sliceEnd = timeSlices.get(sliceEndText)!;
                timeSlice = new TimeSlice(sliceStart.start, sliceEnd.end);
                let times = TimeSlice.parseTimes(parseText);
                if(times.length ===2) {
                    timeSlice = new TimeSlice(times[0], times[1]);
                } else if(times.length === 1) {
                    timeSlice = this.moveTimeSliceTo(timeSlice, times[0]);
                }
                let tags = ExcelRoster.findTags(parseText, this.tagDefs);
                let tagStrings = tags.map(t => t.tag);
                let location = ExcelRoster.findLocation(tagStrings, this.dko3Data.preparedDko3DiffData.locations); //todo: move these functions to a DKo3data class
                let subjects = ExcelRoster.findSubjects(parseText, tagStrings, this.dko3Data);
                let className = ExcelRoster.findClassName(parseText, this.dko3Data);
                let tablePos: TablePos = new TablePos(row, column);
                let excelPos: ExcelPos = TablePos.toExcel(tablePos, this.table);
                let gradeYears = ExcelRoster.findGradeYears(parseText);
                if(gradeYears.length == 0) {
                    gradeYears = ExcelRoster.getGradeYearsFromTags(tags);
                }
                let classDef= new ClassDef(
                    day,
                    teacher,
                    timeSlice,
                    subjects,
                    location ?? "Academie Willem Van Laarstraat, Berchem",
                    gradeYears,
                    excelPos.row,
                    excelPos.column,
                    cellValue,
                    this.table,
                    className
                );
                classDefs.push(classDef);
                row = mergedRange.End.row;
            }
        }
        return classDefs;
    }

    private createTimeSlices(): Map<string, TimeSlice> {
        let timeSlices: Map<string, TimeSlice> = new Map<string, TimeSlice>();

        for(let row = 0; row < this.table.RowCount; row++) {
            let value = this.table.HeaderColumnValue(row, 0);
            let timeSlice = TimeSlice.parseTimeSlice(value);
            if(timeSlice) {
                timeSlices.set(value, timeSlice);
            } else {
                this.errors.push(`Could not parse time slice: ${value}`);
            }
        }
        return timeSlices;
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

    public static findLocation(tags: string[], locations: string[]) {
        let location = locations.find(location => tags.includes(location));
        if(location)
            return location;
        else
            return null;
    }

    public static findSubjects(text: string, tags: string[], dko3Data: PreparedDko3DiffData) {
        let allSearchStrings = [...tags];
        let lowerCase = " " + text.toLowerCase() + " ";
        for (let subject of dko3Data.preparedDko3DiffData.subjects) {
            if(lowerCase.includes(" " + subject.toLowerCase() + " "))
                allSearchStrings.push(subject);
        }

        return dko3Data.preparedDko3DiffData.subjects.filter(subject => allSearchStrings.includes(subject));
    }

    public static findClassName(text: string, dko3Data: PreparedDko3DiffData) {
        let lowerCase = text.toLowerCase();
        for (let name of dko3Data.preparedDko3DiffData.classNames) {
            if(lowerCase.includes(" " + name.toLowerCase() + " "))
                return name;
        }

        return null;
    }

    public static findTags(text: string, tagDefs: TagDef[]) {
        let tags: TagDef[] = [];
        let lowerCase = text.toLowerCase();
        for (let def of tagDefs) {
            if(lowerCase.includes(def.searchString))
                tags.push(def);
        }
        return tags;
    }

    public static findGradeYears(text: string) {
        let gradeYears: GradeYear[] = [];
        const rx = /\s+(?:(\d)\.(\d)|([SC])(\d))(?:\s?[,+\/]\s?(?:(\d)\.(\d)|([SC])(\d)))?(?:\s?[,+\/]\s?(?:(\d)\.(\d)|([SC])(\d)))?(?:\s?[,+\/]\s?(?:(\d)\.(\d)|([SC])(\d)))?(?:\s?[,+\/]\s?(?:(\d)\.(\d)|([SC])(\d)))?/gm;
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

    private static parseGradeYears(tagDef: TagDef): GradeYear[] {
        if(tagDef.gradeYears == "")
            return [];
        let split = (tagDef.gradeYears??"").split(",")
            .map(t => t.trim().toUpperCase());
        let gradeYears: GradeYear[] = [];
        for(let yearGrade of split) {
            let yearParts = yearGrade.split(".");
            if(yearParts.length == 2) {
                gradeYears.push({
                    grade: yearParts[0],
                    year: parseInt(yearParts[1])
                });
            } else if(yearParts.length == 1) {
                console.error(`Syntax error in gradeYears for tag search text "${tagDef.searchString}": "${tagDef.gradeYears}"`);
            }
        }
        return gradeYears;
    }
    public static getGradeYearsFromTags(tags: TagDef[]) {
        let gradeYears: GradeYear[] = [];
        for(let tagDef of tags) {
            gradeYears.push(...this.parseGradeYears(tagDef));
        }
        //make distinct
        gradeYears = gradeYears.filter((value, index, self) => self.findIndex(t => GradeYear.equals(t, value)) === index);
        return gradeYears;
    }
}


export interface TeacherDef {
    fullName: string;
    firstName: string;
    lastName: string;
    callName?: string;
}

