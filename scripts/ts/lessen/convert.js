function addTrimesters(instrument, inputModules) {
    let mergedInstrument = [undefined, undefined, undefined];
    let modulesForInstrument = inputModules.filter((module) => module.instrumentName === instrument.instrumentName);
    for (let module of modulesForInstrument) {
        mergedInstrument[module.trimesterNo - 1] = module;
    }
    instrument.trimesters = mergedInstrument;
}
class InstrumentInfo {
}
export function buildTableData(inputModules) {
    let tableData = {
        students: new Map(),
        instruments: []
    };
    //get all instruments
    let instrumentNames = inputModules.map((module) => module.instrumentName);
    let uniqueInstrumentNames = [...new Set(instrumentNames)];
    for (let instrumentName of uniqueInstrumentNames) {
        //get module instrument info
        let instrumentInfo = new InstrumentInfo();
        let modules = inputModules.filter((module) => module.instrumentName === instrumentName);
        instrumentInfo.instrumentName = instrumentName;
        instrumentInfo.maxAantal = modules
            .map((module) => module.maxAantal)
            .reduce((prev, next) => {
            return prev < next ? next : prev;
        });
        let teachers = modules.map((module) => module.teacher);
        let uniqueTeachers = [...new Set(teachers)];
        instrumentInfo.teacher = uniqueTeachers.toString();
        let reLesMoment = /.*(\w\w) (?:\d+\/\d+ )?(\d\d:\d\d)-(\d\d:\d\d).*/;
        let lesMomenten = modules.map((module) => {
            let matches = module.lesmoment.match(reLesMoment);
            if (matches?.length !== 4) {
                console.error(`Could not process lesmoment "${module.lesmoment}" for instrument "${instrumentName}".`);
                return "???";
            }
            return matches[1] + " " + matches[2] + "-" + matches[3];
        });
        let uniqueLesmomenten = [...new Set(lesMomenten)];
        instrumentInfo.lesmoment = uniqueLesmomenten.toString();
        let vestigingen = modules.map((module) => module.vestiging);
        let uniqueVestigingen = [...new Set(vestigingen)];
        instrumentInfo.vestiging = uniqueVestigingen.toString();
        tableData.instruments.push(instrumentInfo);
        addTrimesters(tableData.instruments[tableData.instruments.length - 1], inputModules);
        for (let trim of instrumentInfo.trimesters) {
            addTrimesterStudentsToMapAndCount(tableData.students, trim);
        }
    }
    for (let student of tableData.students.values()) {
        let trimmed = student.instruments.filter((instr) => instr !== undefined);
        if (trimmed.length < 3) {
            student.allYearSame = false;
            continue;
        }
        student.allYearSame = student.instruments
            .flat()
            .every((_instr) => student?.instruments[0][0]?.instrumentName ?? "---");
    }
    for (let instrument of tableData.instruments) {
        for (let trim of instrument.trimesters) {
            sortTrimesterStudents(trim);
        }
    }
    for (let student of tableData.students.values()) {
        student.info = "";
        for (let instrs of student.instruments) {
            if (instrs.length) {
                student.info += instrs[0].trimesterNo + ". " + instrs.map(instr => instr.instrumentName) + "\n";
            }
            else {
                student.info += "?. ---\n";
            }
        }
    }
    return tableData;
}
function addTrimesterStudentsToMapAndCount(students, trim) {
    if (!trim)
        return;
    for (let student of trim.students) {
        if (!students.has(student.name)) {
            student.instruments = [[], [], []];
            students.set(student.name, student);
        }
        let stud = students.get(student.name);
        stud.instruments[trim.trimesterNo - 1].push(trim);
    }
    //all trims must reference the students in the overall map.
    trim.students = trim.students
        .map((student) => students.get(student.name));
}
function sortTrimesterStudents(trim) {
    if (!trim)
        return;
    let comparator = new Intl.Collator();
    trim.students
        //sort full year students on top.
        .sort((a, b) => {
        if (a.allYearSame && (!b.allYearSame)) {
            return -1;
        }
        else if ((!a.allYearSame) && b.allYearSame) {
            return 1;
        }
        else {
            return comparator.compare(a.name, b.name);
        }
    });
}
//# sourceMappingURL=convert.js.map