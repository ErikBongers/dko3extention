function scrapeModules() {
    let table = document.getElementById("table_lessen_resultaat_tabel");
    let body = table.tBodies[0];
    let lessen = [];
    for (const row of body.rows) {
        let lesInfo = row.cells[0];
        let studentsCell = row.cells[1];
        let studentsTable = studentsCell.querySelectorAll("table")[0];
        let les = scrapeLesInfo(lesInfo);
        les.students = scrapeStudents(studentsTable);
        let smallTags = studentsCell.querySelectorAll("small");
        let arrayLeerlingenAantal = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("leerlingen"));
        if (arrayLeerlingenAantal.length > 0) {
            let reAantallen = /(\d+).\D+(\d+)/;
            let matches = arrayLeerlingenAantal[0].match(reAantallen);
            les.aantal = matches[1];
            les.maxAantal = matches[2];
        }
        let idTag = Array.from(smallTags).find((item) => item.classList.contains("float-right"));
        les.id = idTag.textContent;
        lessen.push(les);
    }
    let modules = lessen.filter((les) => les.module);

    for (let module of modules) {
        //get name of instrument and trimester.
        const reInstrument = /.*\Snitiatie\s*(\w+).*(\d).*/;
        const match = module.naam.match(reInstrument);
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
    les.naam = lesInfo.children[1].textContent;
    let badges = lesInfo.getElementsByClassName("badge");
    les.module = Array.from(badges).some((el) => el.textContent === "module");
    let mutedSpans = lesInfo.getElementsByClassName("text-muted");
    if (mutedSpans.length > 0) {
        les.teacher = Array.from(mutedSpans).pop().textContent;
    }

    return les;
}
