import {ExcelPos, Table, TablePos} from "./excel";

type TagDef = {
    tag: string,
    searchString: string
}

export type GradeYear = {
    grade: string,
    year: number
}

export type ClassDef = {
    day: string,
    teacher: string,
    timeSlice: TimeSlice,
    subjects: string[],
    location: string,
    gradeYears: GradeYear[],
    description: string,
    excelRow: number;
    excelColumn: number;
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
}

export type Time = {
    hour: number,
    minutes: number
}

export class Roster{
    private readonly table: Table;
    private locationDefs: string[];
    private errors: string[] = [];
    public constructor(table: Table, locations: string[]) {
        this.table = table;
        this.locationDefs = locations;
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
                };
                classDefs.push(classDef);
                row = mergedRange.End.row+1;
            }
        }
        return classDefs;
    }

    private gradeYearToString(gradeYear: GradeYear) {
        return `${gradeYear.grade ? gradeYear.grade: "?"}.${gradeYear.year}`;
    }

    private createTimeSlices(): Map<string, TimeSlice> {
        let timeSlices: Map<string, TimeSlice> = new Map<string, TimeSlice>();

        for(let row = 0; row < this.table.RowCount; row++) {
            let rx = /(\d?\d)[.:,](\d\d)\s*-\s*(\d?\d)[.:,](\d\d)/gm;
            let value = this.table.HeaderColumnValue(row, 0);
            let matches = rx.exec(value);
            if(matches) {
                let timeSlice= new TimeSlice(
                    {
                        hour: parseInt(matches[1]),
                        minutes: parseInt(matches[2])
                    },
                    {
                        hour: parseInt(matches[3]),
                        minutes: parseInt(matches[4])
                    }
                );
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
        { tag: "Vestiging Prins Dries", searchString: " prins "},
        { tag: "Vestiging Prins Dries", searchString: " dries "},
        { tag: "Vestiging Groenhout Kasteelstraat", searchString: " groenhout "},
        { tag: "Vestiging Groenhout Kasteelstraat", searchString: " kasteel"},
        { tag: "Vestiging Het Fonkelpad", searchString: " fonkel "},
        { tag: "Vestiging OLV Pulhof", searchString: " pulhof "},
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
        { tag: "Spreken en vertellen", searchString: " spreken "},
        { tag: "Kunstenbad", searchString: " kunstenbad "},
        { tag: "Musicalatelier", searchString: " musicalatelier "},
        { tag: "Musical koor", searchString: " musical koor "},
        { tag: "Musical zang", searchString: " musical zang "},
        { tag: "Theater", searchString: " acteren "},
    ];

    // private locationDefs: string[] = [
    //     "Academie Willem Van Laarstraat, Berchem",
    //     "Vestiging c o r s o",
    //     "Vestiging De Kleine Wereld",
    //     "Vestiging De Kolibrie",
    //     "Vestiging De Schatkist",
    //     "Vestiging Groenhout Kasteelstraat",
    //     "Vestiging Het Fonkelpad",
    //     "Vestiging OLV Pulhof",
    //     "Vestiging Via Louiza",
    //     "Vestiging Alberreke",
    //     "Vestiging De Kleine Stad",
    //     "Vestiging De Kosmos",
    //     "Vestiging De Nieuwe Vrede",
    //     "Vestiging Frans Van Hombeeck",
    //     "Vestiging Klavertje Vier",
    //     "Vestiging Prins Dries",
    //     "Vestiging Sterrenkijker/SL Durlet",
    //     "Wijkafdeling Lageweg, Hoboken",
    //     "Wijkafdeling Louizastraat, Antwerpen",
    //     "Wijkafdeling Mechelseplein, Antwerpen",
    //     "Wijkafdeling Sint Hubertusstraat, Berchem",
    //     "Wijkafdeling Sint-Hubertusstraat",
    //     "Wijkafdeling Walburgis, Volkstraat",
    // ];

    private subjectDefs: string[] = [
        "Woordatelier",
        "Woordlab",
        "Cabaret en comedy",
        "Schrijflab",
        "Literair atelier",
        "Literaire teksten",
        "Spreken en vertellen",
        "Kunstenbad",
        "Musicalatelier",
        "Musical koor",
        "Musical zang",
        "Theater",
        "Speltheater",
        "Theater maken",
        "Storytelling",
        "Woordstudio",
        "Dramastudio",
    ];

    private findLocation(tags: string[]) {
        return this.locationDefs.find(location => tags.includes(location));
    }

    private findSubjects(tags: string[]) {
        return this.subjectDefs.filter(subject => tags.includes(subject));
    }

    public static findTeacher(searchString: string) {
        let lowerCase = searchString.toLowerCase();
        for(let teacherDef of leraren){
            if(lowerCase.includes(teacherDef.firstName.toLowerCase()))
                return teacherDef.name;
        }
        return searchString;
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

export const leraren = [
        {name: "Bavin, Jeroen", firstName: "Jeroen"},
        {name: "Benoot, Joke", firstName: "Joke"},
        {name: "De Moudt, Runa", firstName: "Runa"},
        {name: "Beurghs, Lieve", firstName: "Lieve"},
        {name: "Boonen, Tim", firstName: "Tim"},
        {name: "Verpoten, Kristel", firstName: "Kristel"},
        {name: "Boot, Cornelia", firstName: "Cornelia"},
        {name: "Braem, Veerle", firstName: "Veerle"},
        {name: "Bruneel, Janos", firstName: "Janos"},
        {name: "Buyl, Lotte", firstName: "Lotte"},
        {name: "Cardoen, Edwige", firstName: "Edwige"},
        {name: "Celis, Naomi", firstName: "Naomi"},
        {name: "Cuypers, Joost", firstName: "Joost"},
        {name: "D'Haese, Sofie", firstName: "Sofie"},
        {name: "Daans, Tom", firstName: "Tom"},
        {name: "De Cock, Winter", firstName: "Winter"},
        {name: "Derijcke, Sophie", firstName: "Sophie"},
        {name: "De Feyter, Moya", firstName: "Moya"},
        {name: "Demirbas, Serdar", firstName: "Serdar"},
        {name: "Denys, Stijn", firstName: "Stijn"},
        {name: "Wijckmans, Thierry", firstName: "Thierry"},
        {name: "Dergent, Danielle", firstName: "Danielle"},
        {name: "Desmet, Robbe", firstName: "Robbe"},
        {name: "Dias, Lindsy", firstName: "Lindsy"},
        {name: "Spee, Marlijn", firstName: "Marlijn"},
        {name: "Dyck, Sebastiaan", firstName: "Sebastiaan"},
        {name: "Erbstösser, Christoph", firstName: "Christoph"},
        {name: "Geris, Maartje", firstName: "Maartje"},
        {name: "Giron, Rudi", firstName: "Rudi"},
        {name: "Gratchev, Serguei", firstName: "Serguei"},
        {name: "Gys, Jasmien", firstName: "Jasmien"},
        {name: "Haché, Govaart", firstName: "Govaart"},
        {name: "Segers, Mieke", firstName: "Mieke"},
        {name: "Haesebeyt, Joram", firstName: "Joram"},
        {name: "Hinnekens, Sam", firstName: "Sam"},
        {name: "Vitacolonna, Toni", firstName: "Toni"},
        {name: "Hubrechts, Tine", firstName: "Tine"},
        {name: "Vanhellemont, Rhea", firstName: "Rhea"},
        {name: "Ip, Daisy", firstName: "Daisy"},
        {name: "Maerevoet, Tina", firstName: "Tina"},
        {name: "Janssens, Luna", firstName: "Luna"},
        {name: "Janssens, Rani", firstName: "Rani"},
        {name: "Praet, Tahnee", firstName: "Tahnee"},
        {name: "Janssens, Veerle", firstName: "Veerle"},
        {name: "Joris, Sam", firstName: "Sam"},
        {name: "Lauwers, Anke", firstName: "Anke"},
        {name: "Leiva Sepulveda, Maria", firstName: "Maria"},
        {name: "Van de Meirssche, Lieve", firstName: "Lieve"},
        {name: "Storms, Isabelle", firstName: "Isabelle"},
        {name: "Van Goethem, Robert", firstName: "Robert"},
        {name: "Lejeune, Joris", firstName: "Joris"},
        {name: "Westra Hoekzema, Maarten", firstName: "Maarten"},
        {name: "Meerbergen, Johan", firstName: "Johan"},
        {name: "Meermans, Sander", firstName: "Sander"},
        {name: "Melaerts, Jan", firstName: "Jan"},
        {name: "Pauwels, Kim", firstName: "Kim"},
        {name: "Pavlidi, Ntiana", firstName: "Ntiana"},
        {name: "Pecnik, Ivan", firstName: "Ivan"},
        {name: "Quintens, Yanate", firstName: "Yanate"},
        {name: "Reekmans, Stan", firstName: "Stan"},
        {name: "Reusens, Oliver", firstName: "Oliver"},
        {name: "Rosquete Márquez, Juan Carlos", firstName: "Juan Carlos"},
        {name: "Scheir, Katleen", firstName: "Katleen"},
        {name: "Schoonis, Lien", firstName: "Lien"},
        {name: "Shütte, Katrin", firstName: "Katrin"},
        {name: "Tiest, Tom", firstName: "Tom"},
        {name: "Truyman, Evy", firstName: "Evy"},
        {name: "Vaerendonck, Joeri", firstName: "Joeri"},
        {name: "Van Abbenyen, Emma", firstName: "Emma"},
        {name: "Van Acker, Andrea", firstName: "Andrea"},
        {name: "Wynants, Femke", firstName: "Femke"},
        {name: "Van Assche, Jurgen", firstName: "Jurgen"},
        {name: "Van Casteren, Bart", firstName: "Bart"},
        {name: "Van Kerckhoven, Katelijn", firstName: "Katelijn"},
        {name: "Van Laere, Hannah", firstName: "Hannah"},
        {name: "Van Reeth, Peter", firstName: "Peter"},
        {name: "Van de Velde, Samuel", firstName: "Samuel"},
        {name: "Vandekerckhove, Elvira", firstName: "Elvira"},
        {name: "Vandenbussche, Christina", firstName: "Christina"},
        {name: "Verhaegen, Dieter", firstName: "Dieter"},
        {name: "Verhelst, Peter", firstName: "Peter"},
        {name: "Wellens, Florian", firstName: "Florian"},
        {name: "Wong, Maureen", firstName: "Maureen"}
    ];