function addTrimesters(instrument, inputModules) {
    let mergedInstrument = [undefined, undefined, undefined];
    let modulesForInstrument = inputModules.filter((module) => module.instrumentName === instrument.instrumentName);
    for (let module of modulesForInstrument) {
        mergedInstrument[module.trimesterNo-1] = module;
    }
    instrument.trimesters = mergedInstrument;
}

function buildInstrumentList(inputModules) {
    //get all instruments
    let instrumentNames = inputModules.map((module) => module.instrumentName);
    let uniqueInstrumentNames = [...new Set(instrumentNames)];

    let instruments = [];
    for (let instrumentName of uniqueInstrumentNames) {
        //get module instrument info
        let instrumentInfo = {};
        let module = inputModules.find((module) => module.instrumentName === instrumentName)
        instrumentInfo.instrumentName = module.instrumentName;
        instrumentInfo.maxAantal = module.maxAantal; //TODO: could be different for each trim.
        instrumentInfo.teacher = module.teacher; //TODO: could be different for each trim.
        instrumentInfo.lesmoment = module.lesmoment; //TODO: could be different for each trim.
        instrumentInfo.vestiging = module.vestiging; //TODO: could be different for each trim.
        instruments.push(instrumentInfo);
        addTrimesters(instruments[instruments.length-1], inputModules);

        instrumentInfo.students = new Map();
        for (let trim of instrumentInfo.trimesters) {
            addTrimesterStudentsToMapAndCount(instrumentInfo.students, trim);
        }
    }
    db3(instruments);
    return instruments;
}

function addTrimesterStudentsToMapAndCount(students, trim) {
    if(!trim) return;
    for (let student of trim.students) {
        if (!students.has(student.name)) {
            students.set(student.name, student);
        }
        students.get(student.name).aantalTrims++;
    }
    //all trims must reference the students in the overall map.
    let newTrimStudents = trim.students.map((student) => students.get(student.name));
    trim.students = newTrimStudents;
}
