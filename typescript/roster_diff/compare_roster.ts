import {Table} from "./excel";

type TagDef = {
    tag: string,
    searchString: string
}

export type GradeYear = {
    grade: string,
    year: number
}

type ClassDef = {
    day: string,
    teacher: string,
    timeSlice: TimeSlice,
    subject: string,
    location: string,
    gradeYears: GradeYear[],
    description: string
}

type TimeSlice = {
    start: Time,
    end: Time
}

type Time = {
    hour: number,
    minutes: number
}

export class Roster{
    private table: Table;
    private errors: string[] = [];
    public constructor(table: Table) {
        this.table = table;
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
        let day = this.table.HeaderRowValue(0, column);
        let teacher = this.table.HeaderRowValue(1, column);
        for(let row = 0; row < this.table.RowCount; row++) {
            let cellValue = this.table.Cell(row, column)
            if (cellValue) {
                let rx = /\n/g;
                let description = cellValue
                    .replaceAll(rx, " ");
                let parseText = description
                    .replaceAll("(", " ( ") //force spaces around words or numbers
                    .replaceAll(")", " ) ");
                let timeSlice: TimeSlice = undefined;
                let mergedRange = this.table.RangeOfCell({row, column});
                let sliceStartText = this.table.HeaderColumnValue(mergedRange.Start.row, 0);
                let sliceEndText = this.table.HeaderColumnValue(mergedRange.End.row, 0);
                let sliceStart = timeSlices.get(sliceStartText);
                let sliceEnd = timeSlices.get(sliceEndText);
                timeSlice = {start: sliceStart.start, end: sliceEnd.end};
                let times = this.findTimes(parseText);
                if(times.length ===2) {
                    timeSlice = {
                        start: times[0],
                        end: times[1]
                    };
                } else if(times.length === 1) {
                    timeSlice = this.moveTimeSliceTo(timeSlice, times[0]);
                }
                let tags = this.findTags(parseText, this.defaultTagDefs); //todo: first try to find tagDefs in the sheet (table)
                let location = this.findLocation(tags);
                let subject = this.findSubject(tags);
                let classDef: ClassDef = {
                    teacher,
                    day,
                    timeSlice,
                    location,
                    subject,
                    gradeYears: this.findGradeYears(parseText),
                    description
                };
                classDefs.push(classDef);
                row = mergedRange.End.row+1;
            }
        }
        return classDefs;
    }

    private classDefToString(classDef: ClassDef) {
        return `${classDef.day}, ${classDef.teacher}, ${classDef.subject}, ${classDef.location}, [${classDef.gradeYears?.map(gy => this.gradeYearToString(gy)).join(", ")}], ${classDef.description}`;
    }

    private gradeYearToString(gradeYear: GradeYear) {
        return `${gradeYear.grade ? gradeYear.grade: "?"}.${gradeYear.year}`;
    }

    private classDefsToString(classDefs: ClassDef[]) {
        return classDefs.map(classDef => this.classDefToString(classDef)).join("\n");
    }

    private createTimeSlices(): Map<string, TimeSlice> {
        let timeSlices: Map<string, TimeSlice> = new Map<string, TimeSlice>();

        for(let row = 0; row < this.table.RowCount; row++) {
            let rx = /(\d?\d)[.:,](\d\d)\s*-\s*(\d?\d)[.:,](\d\d)/gm;
            let value = this.table.HeaderColumnValue(row, 0);
            let matches = rx.exec(value);
            if(matches) {
                let timeSlice: TimeSlice = {
                    start: {
                        hour: parseInt(matches[1]),
                        minutes: parseInt(matches[2])
                    },
                    end: {
                        hour: parseInt(matches[3]),
                        minutes: parseInt(matches[4])
                    }
                };
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
        let newSlice = timeSlice;
        let startMinutes = timeSlice.start.hour * 60 + timeSlice.start.minutes;
        let endMinutes = timeSlice.end.hour * 60 + timeSlice.end.minutes;
        let duration = endMinutes - startMinutes;
        timeSlice.start = newStart;
        let newEndMinutes = newStart.hour * 60 + newStart.minutes + duration;
        newSlice.end.hour = Math.trunc(newEndMinutes / 60);
        newSlice.end.minutes = newEndMinutes % 60;
        return newSlice;
    }

    private defaultTagDefs: TagDef[] = [
        { tag: "Sterrenkijker", searchString: "sterr"},
        { tag: "Sterrenkijker", searchString: "durlet"},
        { tag: "Kleine Stad", searchString: " stad"},
        { tag: "Kleine Wereld", searchString: " wereld"},
        { tag: "De Nieuwe Vrede", searchString: " vrede"},
        { tag: "De Nieuwe Vrede", searchString: "dnv"},
        { tag: "De Kosmos", searchString: " kosmos"},
        { tag: "De Schatkist", searchString: "schatk"},
        { tag: "De Kolibrie", searchString: " kolibri"},
        { tag: "Albereke", searchString: "albere"},
        { tag: "c o r s o", searchString: "corso"},
        { tag: "c o r s o", searchString: "c o r s o"},
        { tag: "Cabaret & Comedy", searchString: "cabaret"},
        { tag: "Woordatelier", searchString: "woordatelier"},
        { tag: "Woordatelier", searchString: "WA "}, //todo: searchString is assumed to be in lower case.
        { tag: "Woordlab", searchString: "woordlab"},
        { tag: "Woordlab", searchString: "WL "},
        { tag: "Literair atelier", searchString: "literair atelier"},
        { tag: "Literaire teksten", searchString: "literaire teksten"},
        { tag: "Willem Van Laarstraat", searchString: "bib"},
        { tag: "Spreken en presenteren", searchString: "presenteren"},
        { tag: "Kunstenbad", searchString: "kunstenbad"},
        { tag: "Musicalatelier", searchString: "musicalatelier"},
        { tag: "Musical koor", searchString: "musical koor"},
        { tag: "Musical zang", searchString: "musical zang"},
        { tag: "De Nieuwe Vrede", searchString: " tegel"},
        { tag: "De Nieuwe Vrede", searchString: " tango"},
    ];

    private locationDefs: string[] = [
        "Sterrenkijker",
        "Kleine Stad",
        "Kleine Wereld",
        "De Nieuwe Vrede",
        "De Kosmos",
        "De Schatkist",
        "De Kolibrie",
        "Albereke",
        "Albereke",
        "c o r s o",
        "Willem Van Laarstraat",
    ];

    private subjectDefs: string[] = [
        "Woordatelier",
        "Woordlab",
        "Cabaret & Comedy",
        "Literair atelier",
        "Literaire teksten",
        "Spreken en presenteren",
        "Kunstenbad",
        "Musicalatelier",
        "Musical koor",
        "Musical zang",
    ];

    private findLocation(tags: string[]) {
        return this.locationDefs.find(location => tags.includes(location));
    }

    private findSubject(tags: string[]) {
        return this.subjectDefs.find(subject => tags.includes(subject));
    }

    private findTags(text: string, tagDefs: TagDef[]) {
        let tags: string[] = [];
        for (let def of tagDefs) {
            if(text.toLowerCase().includes(def.searchString))
                tags.push(def.tag);
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
