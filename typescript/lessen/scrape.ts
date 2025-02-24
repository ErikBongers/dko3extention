import { db3 } from "../globals";

export function scrapeLessenOverzicht() {
    let table = document.getElementById("table_lessen_resultaat_tabel") as HTMLTableElement;
    let body = table.tBodies[0];
    let lessen: Les[] = [];
    for (const row of body.rows) {
        let lesInfo = row.cells[0];
        let studentsCell = row.cells[1];
        let les = scrapeLesInfo(lesInfo);
        les.tableRow = row;
        les.studentsTable = studentsCell.querySelectorAll("table")[0]; //for delayed student scraping.
        let smallTags = studentsCell.querySelectorAll("small");
        //aantallen
        let arrayLeerlingenAantal = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("leerlingen"));
        if (arrayLeerlingenAantal.length > 0) {
            let reAantallen = /(\d+).\D+(\d+)/;
            let matches = arrayLeerlingenAantal[0].match(reAantallen);
            les.aantal = parseInt(matches[1]);
            les.maxAantal = parseInt(matches[2]);
        }
        //id
        let idTag = Array.from(smallTags).find((item) => item.classList.contains("float-right"));
        les.id = idTag.textContent;
        //wachtlijst
        les.wachtlijst = 0;
        let arrayWachtlijst = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("wachtlijst"));
        if (arrayWachtlijst.length > 0) {
            let reWachtlijst = /(\d+)/;
            let matches = arrayWachtlijst[0].match(reWachtlijst);
            les.wachtlijst = parseInt(matches[1]);
        }

        lessen.push(les);
    }
    return lessen;
}

export function scrapeModules() {
    let lessen = scrapeLessenOverzicht();
    let modules = lessen.filter((les) => les.isModule);

    let trimesterModules: Les[] = [];

    for (let module of modules) {
        module.students = scrapeStudents(module.studentsTable);

        //get name of instrument and trimester.
        const reInstrument = /.*\Snitiatie\s*(\S+).*(\d).*/;
        const match = module.naam.match(reInstrument);
        if (match?.length !== 3) {
            console.error(`Could not process module "${module.naam}" (${module.id}).`);
            continue;
        }
        module.instrumentName = match[1];
        module.trimesterNo = parseInt(match[2]);
        trimesterModules.push(module);
    }

    db3(trimesterModules);
    return trimesterModules;
}

export class StudentInfo {
    graadJaar: string;
    name: string;
    instruments: Les[][];
    allYearSame: boolean;
    naam: string;
    voornaam: string;
    id: number;
    info: string;
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
        students.push(studentInfo);
    }
    return students;
}

export class Les {
    tableRow: HTMLTableRowElement;
    vakNaam: string;
    isModule: boolean;
    alc: boolean;
    visible: boolean;
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
}

function scrapeLesInfo(lesInfo: HTMLElement) {
    let les = new Les();
    let [first] = lesInfo.getElementsByTagName("strong");
    les.vakNaam = first.textContent;
    let badges = lesInfo.getElementsByClassName("badge");
    les.isModule = Array.from(badges).some((el) => el.textContent === "module");
    les.alc = Array.from(badges).some((el) => el.textContent === "ALC");
    les.visible = lesInfo.getElementsByClassName("fa-eye-slash").length === 0;
    let mutedSpans = lesInfo.querySelectorAll("span.text-muted");
    //muted spans contain:
    //  - class name (optional)
    //  - teacher name (always)
    if(mutedSpans.length > 1) {
        les.naam = mutedSpans.item(0).textContent;
    } else {
        les.naam = lesInfo.children[1].textContent;
    }
    if (mutedSpans.length > 0) {
        les.teacher = Array.from(mutedSpans).pop().textContent;
    }
    let textNodes = Array.from(lesInfo.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
    if (!textNodes) return les;

    les.lesmoment = textNodes[0].nodeValue;
    les.vestiging = textNodes[1].nodeValue;
    return les;
}
