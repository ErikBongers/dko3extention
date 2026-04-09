import {FetchedTable} from "../table/tableFetcher";
import {GradeYear, Time, TimeSlice} from "../roster_diff/compare_roster";

export function scrapeLessenOverzicht(table: HTMLTableElement) {
    let body = table.tBodies[0];
    let lessen: Les[] = [];
    for (const row of body.rows) {
        let lesCell = row.cells[0];
        let studentsCell = row.cells[1];
        let les = scrapeLesInfo(lesCell);
        les.studentsTable = studentsCell.querySelectorAll("table")[0]; //for delayed student scraping.
        let meta = scrapeStudentsCellMeta(studentsCell);
        les.aantal = meta.aantal;
        les.maxAantal = meta.maxAantal;
        les.id = meta.id;
        les.wachtlijst = meta.wachtlijst;
        les.warnings = [...row.getElementsByClassName("text-warning")].map((el) => el.textContent);

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
        aantal = parseInt(matches[1]);
        maxAantal = parseInt(matches[2]);
    }
    //id
    let idTag = Array.from(smallTags).find((item) => item.classList.contains("float-right"));
    let id = idTag.textContent;
    //wachtlijst
    let wachtlijst = 0;
    let arrayWachtlijst = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("wachtlijst"));
    if (arrayWachtlijst.length > 0) {
        let reWachtlijst = /(\d+)/;
        let matches = arrayWachtlijst[0].match(reWachtlijst);
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
        let onclick = row.attributes['onclick'].value;
        return {naam, voornaam, vak, lesmoment, klasleerkracht, onclick, graadJaar};
    })
}

export function scrapeModules(table: HTMLTableElement, jaarToewijzingTable: FetchedTable) {
    let lessen = scrapeLessenOverzicht(table);
    return {
        trimesterModules: scrapeTrimesterModules(lessen),
        jaarModules: scrapeJaarModules(lessen),
        jaarToewijzingen: scrapeJaarToewijzingen(jaarToewijzingTable)};
}

function scrapeTrimesterModules(lessen: Les[] ) {
    let modules = lessen.filter((les) => les.lesType === LesType.TrimesterModule);

    let trimesterModules: Les[] = [];

    for (let module of modules) {
        module.students = scrapeStudents(module.studentsTable);

        //get name of instrument and trimester.
        const reInstrument = /.*\Snitiatie\s*(\S+).*(\d).*/;
        const match = module.naam.match(reInstrument);
        if (match?.length !== 3) {
            console.error(`Could not process trimester module "${module.naam}" (${module.id}).`);
            continue;
        }
        module.instrumentName = match[1];
        module.trimesterNo = parseInt(match[2]);
        trimesterModules.push(module);
    }

    return trimesterModules;
}

function scrapeJaarModules(lessen: Les[] ) {
    let modules = lessen.filter((les) => les.lesType === LesType.JaarModule);

    let jaarModules: Les[] = [];

    for (let module of modules) {
        module.students = scrapeStudents(module.studentsTable);

        //get name of instrument
        const reInstrument = /.*\Snitiatie\s*(\S+).*/;
        const match = module.naam.match(reInstrument);
        if (match?.length !== 2) {
            console.error(`Could not process jaar module "${module.naam}" (${module.id}).`);
            continue;
        }
        module.instrumentName = match[1];
        module.trimesterNo = parseInt(match[2]);
        jaarModules.push(module);
    }

    return jaarModules;
}

export class StudentInfo {
    graadJaar: string;
    name: string;
    trimesterInstruments: Les[][];
    jaarInstruments: Les[];
    allYearSame: boolean;
    naam: string;
    voornaam: string;
    id: number;
    info: string;
    notAllTrimsHaveAnInstrument: boolean;
}

function scrapeStudents(studentTable: HTMLTableElement) {
    let students: StudentInfo[] = [];
    if(studentTable.tBodies.length === 0) {
        return students;
    }
    for (const row of studentTable.tBodies[0].rows) {
        let studentInfo = new StudentInfo();
        studentInfo.graadJaar = row.cells[0].children[0].textContent;
        studentInfo.name = row.cells[0].childNodes[1].textContent;
        let names = studentInfo.name.split(", ");
        studentInfo.naam = names[0];
        studentInfo.voornaam = names[1];
        students.push(studentInfo);
    }
    return students;
}

export enum LesType { TrimesterModule, JaarModule, Les, UnknownModule}

export type DayUppercase = "MAANDAG" | "DINSDAG" | "WOENSDAG" | "DONDERDAG" | "VRIJDAG" | "ZATERDAG" | "ZONDAG" | "";
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
    studentsTable: HTMLTableElement;
    aantal: number;
    maxAantal: number;
    id: string;
    wachtlijst: number;
    students: StudentInfo[];
    instrumentName: string;
    trimesterNo: number;
    tags: string[];
    warnings: string[];
    gradeYears: GradeYear[] = [];
    day: DayUppercase;
    repeat: string; //wekelijks
    timeSlice: TimeSlice;
    linkedLessen: string[] = [];
}

export function scrapeLesInfo(tdLesInfo: HTMLTableCellElement) {
    let les = new Les();
    let [first] = tdLesInfo.getElementsByTagName("strong");
    les.vakNaam = first.textContent;
    let allBadges = tdLesInfo.getElementsByClassName("badge");
    let warningBadges = tdLesInfo.getElementsByClassName("badge-warning");
    les.alc = Array.from(allBadges).some((el) => el.textContent === "ALC");
    les.online = tdLesInfo.getElementsByClassName("fa-eye-slash").length === 0;
    les.tags = Array.from(warningBadges)
        .map((el) => el.textContent)
        .filter((txt) => txt !== "ALC")
        .filter((txt) => txt);
    let mutedSpans = tdLesInfo.querySelectorAll("span.text-muted");
    //muted spans contain:
    //  - class name (optional)
    //  - teacher name (always)
    if(mutedSpans.length > 1) {
        les.naam = mutedSpans.item(0).textContent;
    } else {
        les.naam = tdLesInfo.children[1].textContent;
    }
    les.naam = les.naam
        .replaceAll("(", "")
        .replaceAll(")", "")
        .trim();
    if(Array.from(allBadges).some((el) => el.textContent === "module")) {
        if(les.naam.includes("jaar"))
            les.lesType = LesType.JaarModule;
        else if(les.naam.includes("rimester"))
            les.lesType = LesType.TrimesterModule;
        else
            les.lesType = LesType.UnknownModule;
    }
    else{
        les.lesType = LesType.Les;
    }
    if (mutedSpans.length > 0) {
        les.teacher = Array.from(mutedSpans).pop().textContent;
    }
    les.teacher = les.teacher
        .replaceAll("  ", " ")
        .replaceAll(" ,", ",")
        .trim(); //clean up of names with additional spaces

    let textNodes = Array.from(tdLesInfo.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "");
    if (!textNodes) return les;

    les.lesmoment = textNodes[0].nodeValue;
    les.vestiging = textNodes[1].nodeValue;
    let infoSpansText = [...tdLesInfo.querySelectorAll("span.text-info")].map(e => e.textContent);
    les.gradeYears = textsToYearGrades(infoSpansText);
    splitLesMoment(les);
    return les;
}

function splitLesMoment(les: Les) {
    //"di 15:40-16:40 (wekelijks)"
    let first3 = les.lesmoment.substring(0,3);
    switch (first3) {
        case "ma ": les.day = "MAANDAG"; break;
        case "di ": les.day = "DINSDAG"; break;
        case "wo ": les.day = "WOENSDAG"; break;
        case "do ": les.day = "DONDERDAG"; break;
        case "vr ": les.day = "VRIJDAG"; break;
        case "za ": les.day = "ZATERDAG"; break;
        case "zo ": les.day = "ZONDAG"; break;
        default: les.day = ""; break;
    }
    let remaining = les.lesmoment.substring(3);
    if(remaining.includes("wekelijks"))
        les.repeat = "wekelijks";
    remaining = remaining
        .replaceAll("wekelijks", "")
        .replaceAll("(", "")
        .replaceAll(")", "")
        .trim();
    if(remaining.length < 11)
        return;
    let startAndEnd = remaining.split("-");
    if(startAndEnd.length < 2)
        return;
    let hourMinutes = startAndEnd[0].split(":");
    if(hourMinutes.length < 2)
        return;
    let hour = parseInt(hourMinutes[0]);
    let minutes = parseInt(hourMinutes[1]);
    if(isNaN(hour) || isNaN(minutes))
        return;
    let startTime: Time = {hour, minutes};
    hourMinutes = startAndEnd[1].split(":");
    if(hourMinutes.length < 2)
        return;
    hour = parseInt(hourMinutes[0]);
    minutes = parseInt(hourMinutes[1]);
    if(isNaN(hour) || isNaN(minutes))
        return;
    let endTime: Time = {hour, minutes};
    les.timeSlice = new TimeSlice(startTime,endTime);
}

function textsToYearGrades(texts: string[]){
    let yearGrades: GradeYear[] = [];
    texts.forEach(text => {
        let rxNumbersCommasDots = /^[\s\d,.]+$/gm;
        if(rxNumbersCommasDots.test(text)) {
            let commaSeparatedTexts = text.split(",");
            let rxDigitDotDigit = /(\d).(\d)/g;
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