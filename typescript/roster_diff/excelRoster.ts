import {ExcelPos, Table, TablePos} from "./excel";
import {RosterFactory} from "./rosterFactory";
import {DayUppercase} from "../lessen/scrape";

type TagDef = {
    tag: string,
    searchString: string
}

export type GradeYear = {
    grade: string,
    year: number
}

export type ClassDef = {
    day: DayUppercase,
    teacher: string,
    timeSlice: TimeSlice,
    subjects: string[],
    location: string,
    gradeYears: GradeYear[],
    description: string,
    excelRow: number;
    excelColumn: number;
    cellValue: string,
}

export class TimeSlice {
    start: Time;
    end: Time;

    public constructor(start: Time, end: Time) {
        this.start = start;
        this.end = end;
    }

    public equal(timeslice2: TimeSlice): boolean {
        return this.start.hour == timeslice2.start.hour
            && this.start.minutes == timeslice2.start.minutes
            && this.end.hour == timeslice2.end.hour
            && this.end.minutes == timeslice2.end.minutes;
    }

    public toString() {
        return `${this.start.hour}:${this.start.minutes}-${this.end.hour}:${this.end.minutes}`;
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
    private readonly table: Table;
    private locationDefs: string[];
    private readonly subjectDefs: string[];
    private errors: string[] = [];
    public constructor(table: Table, locations: string[], subjects: string[]) {
        this.table = table;
        this.locationDefs = locations;
        this.subjectDefs = subjects;
    }

    public scrapeUurrooster() {
        let timeSlices = this.createTimeSlices();
        if(this.errors.length > 0)
            return;

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
                let timeSlice: TimeSlice = undefined;
                let mergedRange = this.table.RangeOfCell({row, column});
                let sliceStartText = this.table.HeaderColumnValue(mergedRange.Start.row, 0);
                let sliceEndText = this.table.HeaderColumnValue(mergedRange.End.row, 0);
                let sliceStart = timeSlices.get(sliceStartText);
                let sliceEnd = timeSlices.get(sliceEndText);
                timeSlice = new TimeSlice(sliceStart.start, sliceEnd.end);
                let times = this.findTimes(parseText);
                if(times.length ===2) {
                    timeSlice = new TimeSlice(times[0], times[1]);
                } else if(times.length === 1) {
                    timeSlice = this.moveTimeSliceTo(timeSlice, times[0]);
                }
                let tags = this.findTags(parseText, this.defaultTagDefs); //todo: first try to find tagDefs in the sheet (table)
                let location = this.findLocation(tags);
                let subjects = this.findSubjects(tags);
                let tablePos: TablePos = {row, column};
                let excelPos: ExcelPos = TablePos.toExcel(tablePos, this.table);
                let classDef: ClassDef = {
                    teacher,
                    day,
                    timeSlice,
                    location,
                    subjects,
                    gradeYears: this.findGradeYears(parseText),
                    description,
                    excelRow: excelPos.row,
                    excelColumn: excelPos.column,
                    cellValue,
                };
                classDefs.push(classDef);
                row = mergedRange.End.row+1;
            }
        }
        return classDefs;
    }

    private gradeYearToString(gradeYear: GradeYear) { //todo: parse and check this as well.
        return `${gradeYear.grade ? gradeYear.grade: "?"}.${gradeYear.year}`;
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

    public defaultTagDefs: TagDef[] = [
        { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " sterr"},
        { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " durlet"},
        { tag: "Vestiging De Kleine Stad", searchString: " kleine stad "}, //"stad" could be a word in a different context.
        { tag: "Vestiging De Kleine Wereld", searchString: " wereld "},
        { tag: "Vestiging De Nieuwe Vrede", searchString: " vrede "},
        { tag: "Vestiging De Nieuwe Vrede", searchString: " dnv "},
        { tag: "Vestiging De Nieuwe Vrede", searchString: " tegel"},
        { tag: "Vestiging De Nieuwe Vrede", searchString: " tango "},
        { tag: "Vestiging De Nieuwe Vrede", searchString: " vergaderzaal "},
        { tag: "Vestiging De Kosmos", searchString: " kosmos "},
        { tag: "Vestiging De Schatkist", searchString: " schatk"},
        { tag: "Vestiging De Kolibrie", searchString: " kolibri"},
        { tag: "Vestiging Het Fonkelpad", searchString: " fonkel"},
        { tag: "Vestiging Alberreke", searchString: " alber"},
        { tag: "Vestiging c o r s o", searchString: " corso "},
        { tag: "Vestiging c o r s o", searchString: "c o r s o"},
        { tag: "Vestiging c o r s o", searchString: " studio 3 "},
        { tag: "Vestiging Prins Dries", searchString: " prins "},
        { tag: "Vestiging Prins Dries", searchString: " dries "},
        { tag: "Vestiging Groenhout Kasteelstraat", searchString: " groenhout "},
        { tag: "Vestiging Groenhout Kasteelstraat", searchString: " kasteel"},
        { tag: "Vestiging Het Fonkelpad", searchString: " fonkel "},
        { tag: "Vestiging OLV Pulhof", searchString: " pulhof "},
        { tag: "Vestiging OLV Pulhof", searchString: " 1p "},
        { tag: "Vestiging OLV Pulhof", searchString: " 2p "},
        { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " 1d "},
        { tag: "Vestiging Sterrenkijker/SL Durlet", searchString: " 2d "},
        { tag: "Vestiging Via Louiza", searchString: " louiza "},
        { tag: "Vestiging Frans Van Hombeeck", searchString: " hombee"},
        { tag: "Vestiging Klavertje Vier", searchString: " klaver"},
        { tag: "Academie Willem Van Laarstraat, Berchem", searchString: " bib "},
        { tag: "Academie Willem Van Laarstraat, Berchem", searchString: "laarstr"},
        { tag: "Academie Willem Van Laarstraat, Berchem", searchString: " wvl "},
        { tag: "Vestiging Frans Van Hombeeck", searchString: " beeld "},

        { tag: "Cabaret en comedy", searchString: " cabaret "},
        { tag: "Woordatelier", searchString: " woordatelier "},
        { tag: "Woordatelier", searchString: " wa "}, //todo: searchString is assumed to be in lower case.
        { tag: "Woordlab", searchString: " woordlab "},
        { tag: "Woordlab", searchString: " wl "},
        { tag: "Literair atelier", searchString: " literair atelier "},
        { tag: "Literaire teksten", searchString: " literaire teksten "},
        { tag: "Schrijven", searchString: " basiscursus "},
        { tag: "Spreken en vertellen", searchString: " spreken "},
        { tag: "Kunstenbad muziek/woord", searchString: " kunstenbad "},
        { tag: "Musicalatelier", searchString: " musicalatelier "},
        { tag: "Musical koor", searchString: " musical koor "},
        { tag: "Musical zang", searchString: " musical zang "},
        { tag: "Theater", searchString: " acteren "},
        { tag: "Muziekatelier", searchString: " 1p "},
        { tag: "Muziekatelier", searchString: " 2p "},
        { tag: "Muziekatelier", searchString: " 1d "},
        { tag: "Muziekatelier", searchString: " 2d "},
        { tag: "Muziekatelier", searchString: " 1va "},
        { tag: "Muziekatelier", searchString: " 1vb "},
        { tag: "Muziekatelier", searchString: " 1vc "},
        { tag: "Muziekatelier", searchString: " 2va "},
        { tag: "Muziekatelier", searchString: " 2vb "},
        { tag: "Muziekatelier", searchString: " 3v "},
        { tag: "Muziekatelier", searchString: " 1t "},
        { tag: "Muziekatelier", searchString: " 2t "},
        { tag: "Robert", searchString: " bert "},
        { tag: "Groepsmusiceren (klassiek)", searchString: " gm "},
        { tag: "Atelier (musical)", searchString: " musicalatelier "},
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
    }
}


export interface TeacherDef {
    name: string;
    firstName: string;
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
