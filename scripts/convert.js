function addTrimesters(instrument, inputModules) {
    let mergedInstrument = [undefined, undefined, undefined];
    let modulesForInstrument = inputModules.filter((module) => module.instrumentName === instrument.instrumentName);
    for (let module of modulesForInstrument) {
        mergedInstrument[module.trimesterNo-1] = module;
    }
    instrument.trimesters = mergedInstrument;
}

function mergeTrimesters(inputModules) {
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
        instruments.push(instrumentInfo);
        addTrimesters(instruments[instruments.length-1], inputModules);
    }
    db3(instruments);
    return instruments;
}

