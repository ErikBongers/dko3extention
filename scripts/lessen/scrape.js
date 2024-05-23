export function scrapeLessenOverzicht() {
    let table = document.getElementById("table_lessen_resultaat_tabel");
    let body = table.tBodies[0];
    let lessen = [];
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
    db3(lessen);

    return lessen;
}

export function scrapeModules() {
    let lessen = scrapeLessenOverzicht();
    let modules = lessen.filter((les) => les.module);

    for (let module of modules) {
        module.students = scrapeStudents(module.studentsTable);

        //get name of instrument and trimester.
        const reInstrument = /.*\Snitiatie\s*(\S+).*(\d).*/;
        const match = module.naam.match(reInstrument);
        if (match?.length !== 3) {
            console.log(`Could not process module "${module.naam}" (${module.id}).`);
            continue;
        }
        module.instrumentName = match[1];
        module.trimesterNo = parseInt(match[2]);
    }

    db3(modules);
    return modules;
}

function scrapeStudents(studentTable) {
    let students = [];
    if(studentTable.tBodies.length === 0) {
        return students;
    }
    for (const row of studentTable.tBodies[0].rows) {
        let studentInfo = {};
        studentInfo.graadJaar = row.cells[0].children[0].textContent;
        studentInfo.name = row.cells[0].childNodes[1].textContent;
        students.push(studentInfo);
    }
    return students;
}

function scrapeLesInfo(lesInfo) {
    let les = {};
    let vakStrong = lesInfo.firstChild;
    les.vakNaam = vakStrong.textContent;
    let badges = lesInfo.getElementsByClassName("badge");
    les.module = Array.from(badges).some((el) => el.textContent === "module");
    les.alc = Array.from(badges).some((el) => el.textContent === "ALC");
    les.visible = lesInfo.getElementsByClassName("fa-eye-slash").length === 0;
    let mutedSpans = lesInfo.getElementsByClassName("text-muted");
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
