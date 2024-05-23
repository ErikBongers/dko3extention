function addTrimesters(instrument, inputModules) {
    let mergedInstrument = [undefined, undefined, undefined];
    let modulesForInstrument = inputModules.filter((module) => module.instrumentName === instrument.instrumentName);
    for (let module of modulesForInstrument) {
        mergedInstrument[module.trimesterNo-1] = module;
    }
    instrument.trimesters = mergedInstrument;
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
        let instrumentInfo = {};
        let module = inputModules.find((module) => module.instrumentName === instrumentName)
        instrumentInfo.instrumentName = module.instrumentName;
        instrumentInfo.maxAantal = module.maxAantal; //TODO: could be different for each trim.
        instrumentInfo.teacher = module.teacher; //TODO: could be different for each trim.
        instrumentInfo.lesmoment = module.lesmoment; //TODO: could be different for each trim.
        instrumentInfo.vestiging = module.vestiging; //TODO: could be different for each trim.
        tableData.instruments.push(instrumentInfo);
        addTrimesters(tableData.instruments[tableData.instruments.length-1], inputModules);

       for (let trim of instrumentInfo.trimesters) {
            addTrimesterStudentsToMapAndCount(tableData.students, trim);
        }
    }

    db3(tableData.students);
    for(let student of tableData.students.values()) {
        let trimmed = student.instruments.filter((instr) => instr !== undefined);
        if(trimmed.length < 3) {
            student.allYearSame = false;
            continue;
        }
        student.allYearSame = student.instruments.every((instr) => instr.instrumentName === student.instruments[0].instrumentName);
    }

    for(let instrument of tableData.instruments) {
        for (let trim of instrument.trimesters) {
            sortTrimesterStudents(trim);
        }
    }

    for(let student of tableData.students.values()) {
        student.info = "";
        for(let instr of student.instruments) {
            if(instr) {
                student.info += instr.trimesterNo + ". " + instr.instrumentName + "\n";
            } else {
                student.info += "?. ---\n";
            }
        }
    }

    db3(tableData);
    return tableData;
}

function addTrimesterStudentsToMapAndCount(students, trim) {
    if(!trim) return;
    for (let student of trim.students) {
        if (!students.has(student.name)) {
            student.instruments = [undefined, undefined, undefined];
            students.set(student.name, student);
        }
        let stud = students.get(student.name);
        stud.instruments[trim.trimesterNo-1] = trim;
    }
    //all trims must reference the students in the overall map.
    trim.students = trim.students
        .map((student) => students.get(student.name));
}

function sortTrimesterStudents(trim) {
    if(!trim) return;
    let comparator = new Intl.Collator();
    trim.students
        //sort full year students on top.
        .sort((a,b) => {
            if (a.allYearSame && (!b.allYearSame)) {
                return -1;
            } else if ((!a.allYearSame) && b.allYearSame) {
                return 1;
            } else {
                return comparator.compare(a.name, b.name);
            }
        });
}
