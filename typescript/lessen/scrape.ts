import {FetchedTable} from "../table/tableFetcher";
import {dayToMinutes, Time, TimeSlice, timeToMinutes} from "../roster_diff/excelRoster";
import {GradeYear} from "../roster_diff/calcDiff";

export function scrapeLessenOverzicht(table: HTMLTableElement) {
    if(!table)
        return [];
    let body = table.tBodies[0];
    let lessen: HtmlLes[] = [];
    for (const row of body.rows) {
        let les = scrapeLesInfo(row);
        lessen.push(les);
    }
    return lessen;
}

export function scrapeStudentsCellMeta(studentsCell: HTMLTableCellElement) {
    let smallTags = studentsCell.querySelectorAll("small");
    //aantallen
    let aantal = 0;
    let maxAantal = 0;
    let arrayLeerlingenAantal = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("leerlingen"));
    if (arrayLeerlingenAantal.length > 0) {
        const reAantallen = /(\d+).\D+(\d+)/;
        let matches = arrayLeerlingenAantal[0].match(reAantallen);
        if(matches){
            aantal = parseInt(matches[1]);
            maxAantal = parseInt(matches[2]);
        }
    }
    //id
    let idTag = Array.from(smallTags).find((item) => item.classList.contains("float-right"))!;
    let id = idTag.textContent;
    //wachtlijst
    let wachtlijst = 0;
    let arrayWachtlijst = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("wachtlijst"));
    if (arrayWachtlijst.length > 0) {
        let reWachtlijst = /(\d+)/;
        let matches = arrayWachtlijst[0].match(reWachtlijst);
        if(matches)
            wachtlijst = parseInt(matches[1]);
    }
    return {aantal, maxAantal, id, wachtlijst};
}

export type JaarToewijzing = {
    naam: string,
    voornaam: string,
    vak: string,
    lesmoment: string,
    klasleerkracht: string,
    onclick: string,
    graadJaar: string,
};

function scrapeJaarToewijzingen(jaarToewijzingTable: (FetchedTable | undefined)): JaarToewijzing[] {
    if(jaarToewijzingTable === undefined)
        return [];
    return [...jaarToewijzingTable.getRows()].map((row) => {
        let naam = row.cells[0].textContent;
        let voornaam = row.cells[1].textContent;
        let vak = row.cells[2].textContent;
        let lesmoment = row.cells[3].textContent;
        let klasleerkracht = row.cells[4].textContent;
        let graadJaar = row.cells[5].textContent;
        // @ts-ignore
        let onclick = row.attributes['onclick'].value;
        return {naam, voornaam, vak, lesmoment, klasleerkracht, onclick, graadJaar};
    })
}

export function scrapeModules(table: HTMLTableElement, jaarToewijzingTable: FetchedTable | undefined) {
    let lessen = scrapeLessenOverzicht(table);
    return {
        trimesterModules: scrapeTrimesterModules(lessen),
        jaarModules: scrapeJaarModules(lessen),
        jaarToewijzingen: scrapeJaarToewijzingen(jaarToewijzingTable)};
}

function scrapeTrimesterModules(lessen: HtmlLes[] ) {
    let modules = lessen.filter((les) => les.les.lesType === LesType.TrimesterModule);

    let trimesterModules: Les[] = [];

    for (let module of modules) {
        module.les.students = scrapeStudents(module.studentsTable);

        //get name of instrument and trimester.
        const reInstrument = /.*\Snitiatie\s*(\S+).*(\d).*/;
        const match = module.les.naam.match(reInstrument);
        if (match?.length !== 3) {
            console.error(`Could not process trimester module "${module.les.naam}" (${module.les.id}).`);
            continue;
        }
        module.les.instrumentName = match[1];
        module.les.trimesterNo = parseInt(match[2]);
        trimesterModules.push(module.les);
    }

    return trimesterModules;
}

function scrapeJaarModules(lessen: HtmlLes[] ) {
    let modules = lessen.filter((les) => les.les.lesType === LesType.JaarModule);

    let jaarModules: Les[] = [];

    for (let module of modules) {
        module.les.students = scrapeStudents(module.studentsTable);

        //get name of instrument
        const reInstrument = /.*\Snitiatie\s*(\S+).*/;
        const match = module.les.naam.match(reInstrument);
        if (match?.length !== 2) {
            console.error(`Could not process jaar module "${module.les.naam}" (${module.les.id}).`);
            continue;
        }
        module.les.instrumentName = match[1];
        module.les.trimesterNo = parseInt(match[2]);
        jaarModules.push(module.les);
    }

    return jaarModules;
}

export class StudentInfo {
    graadJaar: string;
    name: string;
    trimesterInstruments: ((Les[][]) | undefined);
    jaarInstruments?: Les[];
    allYearSame?: boolean;
    naam: string;
    voornaam: string;
    id?: number;
    info: string = "";
    notAllTrimsHaveAnInstrument?: boolean;

    constructor(name: string, naam: string, voornaam: string, graadJaar: string) {
        this.name = name;
        this.naam = naam;
        this.voornaam = voornaam;
        this.graadJaar = graadJaar;
    }
}

function scrapeStudents(studentTable: HTMLTableElement) {
    let students: StudentInfo[] = [];
    if(studentTable.tBodies.length === 0) {
        return students;
    }
    for (const row of studentTable.tBodies[0].rows) {
        let graadJaar = row.cells[0].children[0].textContent;
        let name = row.cells[0].childNodes[1].textContent!;
        let names = name.split(", ");
        let naam = names[0];
        let voornaam = names[1];
        let studentInfo = new StudentInfo(name, naam, voornaam, graadJaar);
        students.push(studentInfo);
    }
    return students;
}

export enum LesType { TrimesterModule, JaarModule, Les, UnknownModule}

export type DayUppercase = "MAANDAG" | "DINSDAG" | "WOENSDAG" | "DONDERDAG" | "VRIJDAG" | "ZATERDAG" | "ZONDAG" | "";
export function toDay(text: string) {
    text = text.toUpperCase().trim();
    switch (text.toUpperCase()) {
        case "MAANDAG":
        case "DINSDAG":
        case "WOENSDAG":
        case "DONDERDAG":
        case "VRIJDAG":
        case "ZATERDAG":
        case "ZONDAG":
            return text as DayUppercase;
        default:
            return null;
    }
}
export class HtmlLes {
    public les: Les;
    studentsTable: HTMLTableElement;

    constructor(les: Les, studentsTable: HTMLTableElement) {
        this.les = les;
        this.studentsTable = studentsTable;
    }
}

export class Les {
    vakNaam: string;
    lesType: LesType;
    alc: boolean;
    online: boolean;
    naam: string;
    teacher: string;
    lesmoment: string;
    formattedLesmoment: string;
    vestiging: string;
    aantal: number;
    maxAantal: number;
    id: string;
    wachtlijst: number;
    students: StudentInfo[];
    instrumentName: string;
    trimesterNo: number = -1;
    tags: string[];
    warnings: string[];
    gradeYears: GradeYear[] = [];
    day: DayUppercase = "";
    repeat: string = ""; //wekelijks
    dayTimeSlices: DayTimeSlice[] = [];
    linkedLessenIds: string[] = [];

    constructor(id: string, lesType: LesType, instrumentName: string, teacher: string, formattedLesmoment: string, maxAantal: number, aantal: number, vestiging: string, tags: string[], online: boolean, wachtlijst: number, alc: boolean, lesmoment: string, naam: string, students: StudentInfo[], vakNaam: string, warnings: string[]) {
        this.id = id;
        this.lesType = lesType;
        this.instrumentName = instrumentName;
        this.teacher = teacher;
        this.formattedLesmoment = formattedLesmoment;
        this.maxAantal = maxAantal;
        this.aantal = aantal;
        this.vestiging = vestiging;
        this.tags = tags;
        this.online = online;
        this.wachtlijst = wachtlijst;
        this.alc = alc;
        this.lesmoment = lesmoment;
        this.naam = naam;
        this.students = students;
        this.vakNaam = vakNaam;
        this.warnings = warnings;

    }

    public static getHash(les: Les) {
        return les.id+ les.teacher + les.naam+les.vakNaam+les.lesmoment+les.vestiging+les.online;
    }
    public static getNewHash(les: Les) {
        return les.id+ les.teacher + les.naam+les.vakNaam+les.lesmoment+les.vestiging+les.online+GradeYear.toString(les.gradeYears);
    }

}

export function scrapeLesInfo(row: HTMLTableRowElement): HtmlLes {
    let lesCell = row.cells[0];
    let studentsCell = row.cells[1];
    let meta = scrapeStudentsCellMeta(studentsCell);

    let warnings = [...row.getElementsByClassName("text-warning")].map((el) => el.textContent);

    let [first] = lesCell.getElementsByTagName("strong");
    let allBadges = lesCell.getElementsByClassName("badge");
    let warningBadges = lesCell.getElementsByClassName("badge-warning");
    let tags = Array.from(warningBadges)
        .map((el) => el.textContent)
        .filter((txt) => txt !== "ALC")
        .filter((txt) => txt);
    let mutedSpans = lesCell.querySelectorAll("span.text-muted");
    let lesName = "";
    //className is in the span on the 1st line (before BR)
    for (const el of lesCell.children) {
        if (el.tagName === 'BR') break;
        if(el.tagName == "SPAN")
            lesName = el.textContent;
    }

    let naam = lesName
        .replaceAll("(", "")
        .replaceAll(")", "")
        .trim();
    let lesType: LesType;
    if(Array.from(allBadges).some((el) => el.textContent === "module")) {
        if(naam.includes("jaar"))
            lesType = LesType.JaarModule;
        else if(naam.includes("rimester"))
            lesType = LesType.TrimesterModule;
        else
            lesType = LesType.UnknownModule;
    }
    else{
        lesType = LesType.Les;
    }
    let teacher: string = "";
    if (mutedSpans.length > 0) {
        teacher = Array.from(mutedSpans).pop()!.textContent;
    }
    teacher = teacher
        .replaceAll("  ", " ")
        .replaceAll(" ,", ",")
        .trim(); //clean up of names with additional spaces
    if (teacher == "(geen klasleerkracht)")
        teacher = "";
    let textNodes = Array.from(lesCell.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent!.trim() !== "");

    let infoSpansText = [...lesCell.querySelectorAll("span.text-info")].map(e => e.textContent);
    let gradeYears = textsToYearGrades(infoSpansText);

    let les: Les = new Les(meta.id,
        lesType,
        "no instrument",
        teacher,
        textNodes[0].nodeValue!,
        meta.maxAantal,
        meta.aantal,
        textNodes[1].nodeValue!,
        tags,
        lesCell.getElementsByClassName("fa-eye-slash").length === 0, meta.wachtlijst,
        Array.from(allBadges).some((el) => el.textContent === "ALC"),
        textNodes[0].nodeValue!,
        naam,
        [],
        first.textContent,
        warnings
    );
    les.gradeYears = gradeYears;
    let htmlLes = {
        les,
        studentsTable: studentsCell.querySelectorAll("table")[0] //for delayed student scraping.
    }
    splitLesMoment(les);
    return htmlLes;
}

function splitLesMoment(les: Les): void {
    //di 15:40-16:40 (wekelijks)
    //di en vr 16:00-17:00 (wekelijks)
    //wo 13:00-14:00 en za 09:00-10:00 (wekelijks)
    //"(geen volgende les)"
    //"(geen lesmomenten)"
    //"volgende les: di 21/4 19:00-20:00"
    if(les.lesmoment == "(geen volgende les)")
        return;
    if(les.lesmoment == "(geen lesmomenten)")
        return;
    let remaining = les.lesmoment;
    if(remaining.startsWith("volgende les: ")) {
        remaining = remaining.substring(14, 17) + remaining.substring(22);
    }
    if(remaining.includes("wekelijks"))
        les.repeat = "wekelijks";
    remaining = remaining
        .replaceAll("wekelijks", "")
        .replaceAll("(", "")
        .replaceAll(")", "")
        .trim();
    if(remaining.length < 11)
        return;
    les.dayTimeSlices = parseLesMomenten(remaining);
}

function parseLesMomenten(text: string) {
    //di 15:40-16:40
    //di en vr 16:00-17:00
    //wo 13:00-14:00 en za 09:00-10:00
    //ma  19:00-20:00 en 20:00-21:00
    let dayTimeSliceTexts = text.split(" en ");
    let dayTimeSlices = dayTimeSliceTexts.map(text => parseLesMoment(text));
    //if the day or the hour is the same, these are not repeated in the string, so copy them to the other slices.
    if(dayTimeSlices.some(slice => slice.timeSlice == null)) {
        let firstTime = dayTimeSlices.find(lesMoment => lesMoment.timeSlice !== null)!.timeSlice;
        dayTimeSlices.forEach(lesMoment => lesMoment.timeSlice = firstTime);
    } else if(dayTimeSlices.some(slice => slice.day == "")) {
        let firstDay = dayTimeSlices.find(lesMoment => lesMoment.day != "")!.day;
        dayTimeSlices.forEach(lesMoment => lesMoment.day = firstDay);
    }
    return dayTimeSlices;
}

export class DayTimeSlice {
    day: DayUppercase;
    timeSlice: TimeSlice | null;

    constructor(day: DayUppercase, timeSlice: TimeSlice | null) {
        this.day = day;
        this.timeSlice = timeSlice;
    }

    private toString() {}
    public static toString(dayTimeSlice: DayTimeSlice) {
        if(dayTimeSlice.timeSlice === null)
            return "null";
        return `${dayTimeSlice.day} ${TimeSlice.toString(dayTimeSlice.timeSlice)}`;
    }

    public static startToNumber(dayTimeSlice: DayTimeSlice) {
        if(dayTimeSlice.timeSlice === null)
            return -1;
        return dayToMinutes(dayTimeSlice.day) + timeToMinutes(dayTimeSlice.timeSlice.start);
    }

    public static endToNumber(dayTimeSlice: DayTimeSlice) {
        if(dayTimeSlice.timeSlice === null)
            return -1;
        return dayToMinutes(dayTimeSlice.day) + timeToMinutes(dayTimeSlice.timeSlice.end);
    }

    public static equal(dayTimeSlice1: DayTimeSlice, dayTimeSlice2: DayTimeSlice) {
        if(dayTimeSlice1.day != dayTimeSlice2.day)
            return false;
        if(!dayTimeSlice1.timeSlice)
            return false;
        if(!dayTimeSlice2.timeSlice)
            return false;
        return TimeSlice.equal(dayTimeSlice1.timeSlice, dayTimeSlice2.timeSlice);
    }
}

function parseLesMoment(text: string): DayTimeSlice {
    //di 15:40-16:40
    //15:40-16:40
    let first2 = text.substring(0,2);
    let day: DayUppercase = "";
    switch (first2) {
        case "ma": day = "MAANDAG"; break;
        case "di": day = "DINSDAG"; break;
        case "wo": day = "WOENSDAG"; break;
        case "do": day = "DONDERDAG"; break;
        case "vr": day = "VRIJDAG"; break;
        case "za": day = "ZATERDAG"; break;
        case "zo": day = "ZONDAG"; break;
        default: day = ""; break;
    }
    if(day != "")
        text = text.substring(3);
    let startAndEnd = text.split("-");
    if(startAndEnd.length < 2)
        return new DayTimeSlice(day, null);
    let hourMinutes = startAndEnd[0].split(":");
    if(hourMinutes.length < 2)
        return new DayTimeSlice(day, null);
    let hour = parseInt(hourMinutes[0]);
    let minutes = parseInt(hourMinutes[1]);
    if(isNaN(hour) || isNaN(minutes))
        return new DayTimeSlice(day, null);
    let startTime: Time = {hour, minutes};
    hourMinutes = startAndEnd[1].split(":");
    if(hourMinutes.length < 2)
        return new DayTimeSlice(day, null);
    hour = parseInt(hourMinutes[0]);
    minutes = parseInt(hourMinutes[1]);
    if(isNaN(hour) || isNaN(minutes))
        return new DayTimeSlice(day, null);
    let endTime: Time = {hour, minutes};
    return new DayTimeSlice(day, new TimeSlice(startTime,endTime));
}

function textsToYearGrades(texts: string[]){
    let yearGrades: GradeYear[] = [];
    texts.forEach(text => {
        let rxNumbersCommasDots = /^[\s\d,.SC]+$/gm;
        if(rxNumbersCommasDots.test(text)) {
            let commaSeparatedTexts = text.split(",");
            let rxDigitDotDigit = /([\dSC]).(\d)/g;
            for(let candidate of commaSeparatedTexts) {
                let matches = [...candidate.matchAll(rxDigitDotDigit)];
                if(matches.length < 1)
                    continue;//meh...
                let grade = matches[0][1];
                let year =parseInt(matches[0][2]);
                yearGrades.push({grade, year});
            }
        }
    });
    return yearGrades;
}