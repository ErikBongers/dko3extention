import {Les, LesType, StudentInfo} from "./scrape";


export class BlockInfo {
    teacher: string;
    instrumentName: string;
    maxAantal: number;
    lesmoment: string;
    vestiging: string;
    trimesters: (Les| undefined)[];
    jaarModules: Les[];
}

export interface TableData {
    students : Map<string, StudentInfo>,
    blocks: BlockInfo[]
}

function buildTrimesters(modules: Les[]) {
    let mergedInstrument: (Les | undefined)[] = [undefined, undefined, undefined];
    modules
        .filter(module => module.lesType === LesType.TrimesterModule)
        .forEach(module => {
        mergedInstrument[module.trimesterNo-1] = module;
    });
    return mergedInstrument;
}

function getLesmomenten(modules: Les[]) {
    let lesMomenten = modules.map((module) => module.formattedLesmoment);
    return [...new Set(lesMomenten)];
}

function getMaxAantal(modules: Les[]) {
    return modules
        .map((module) => module.maxAantal)
        .reduce((prev, next) => {
                return prev < next ? next : prev
            }
        );
}

function getVestigingen(modules: Les[]) {
    let vestigingen = modules.map((module) => module.vestiging);
    let uniqueVestigingen = [...new Set(vestigingen)];
    return uniqueVestigingen.toString();
}

export function prepareLesmomenten(inputModules: Les[]) {
    let reLesMoment = /.*(\w\w) (?:\d+\/\d+ )?(\d\d:\d\d)-(\d\d:\d\d).*/;
    for(let module of inputModules){
        if(module.lesmoment === "(geen volgende les)") {
            module.formattedLesmoment = module.lesmoment;
            continue;
        }
        let matches = module.lesmoment.match(reLesMoment);
        if (matches?.length !== 4) {
            console.error(`Could not process lesmoment "${module.lesmoment}" for instrument "${module.instrumentName}".`);
            module.formattedLesmoment =  "???";
        } else {
            module.formattedLesmoment = matches[1] + " " + matches[2] + "-" + matches[3];
        }

        module.formattedLesmoment =  matches[1] + " " + matches[2] + "-" + matches[3];
    }
}

export function buildTableData(inputModules: Les[]) : TableData {
    prepareLesmomenten(inputModules);

    let tableData: TableData = {
        students: new Map(),
        blocks: []
    };

    //create a block per instrument/teacher/lesmoment
    // group by INSTRUMENT
    let instruments = inputModules.map((module) => module.instrumentName);
    instruments = [...new Set(instruments)] as [string];
    for (let instrumentName of instruments) {
        let instrumentModules = inputModules.filter((module) => module.instrumentName === instrumentName);

        // group by TEACHER
        let teachers = instrumentModules.map((module) => module.teacher);
        teachers = [...new Set(teachers)];
        for(let teacher of teachers) {
            let instrumentTeacherModules = instrumentModules.filter(module => module.teacher === teacher);

            // group by LESMOMENT
            let lesmomenten = getLesmomenten(instrumentTeacherModules);
            lesmomenten = [...new Set(lesmomenten)];
            for(let lesmoment of lesmomenten) {
                let instrumentTeacherMomentModules = instrumentTeacherModules.filter(module => module.formattedLesmoment === lesmoment);

                let block: BlockInfo = new BlockInfo();
                block.instrumentName = instrumentName;
                block.teacher = teacher;
                block.lesmoment = lesmoment;
                block.maxAantal = getMaxAantal(instrumentTeacherMomentModules);
                block.vestiging = getVestigingen(instrumentTeacherMomentModules);
                // we could have both trimesters and jaar modules for this instrument/teacher/lesmoment
                block.trimesters = buildTrimesters(instrumentTeacherMomentModules);
                block.jaarModules = instrumentTeacherMomentModules.filter(module => module.lesType === LesType.JaarModule);

                tableData.blocks.push(block);

                for (let trim of block.trimesters) {
                    addTrimesterStudentsToMapAndCount(tableData.students, trim);
                }
                for (let jaarModule of block.jaarModules) {
                    addJaarStudentsToMapAndCount(tableData.students, jaarModule);
                }
            }
        }
    }

    //set flag if all 3 trims the same instrumt for a student.
    for(let student of tableData.students.values()) {
        if(!student.trimesterInstruments)
            continue;
        let instruments = student.trimesterInstruments.flat();
        if (instruments.length < 3) {
            student.allYearSame = false;
            continue; //skip the every() below if we haven't got 3 instruments.
        }
        student.allYearSame = instruments
            .every((instr: any) => instr.instrumentName === (student?.trimesterInstruments[0][0]?.instrumentName ?? "---"));
    }

    //sort students, putting allYearSame studetns on top. (will be in bold).
    for(let instrument of tableData.blocks) {
        for (let trim of instrument.trimesters) {
            sortModuleStudents(trim);
        }
        for (let jaarModule of instrument.jaarModules) {
            sortModuleStudents(jaarModule);
        }
    }

    for(let student of tableData.students.values()) {
        student.info = "";
        if(!student.trimesterInstruments)
            continue;
        for(let instrs of student.trimesterInstruments) {
            if(instrs.length) {
                student.info += instrs[0].trimesterNo + ". " + instrs.map(instr => instr.instrumentName) + "\n";
            } else {
                student.info += "?. ---\n";
            }
        }
    }
    return tableData;
}

function addTrimesterStudentsToMapAndCount(students: Map<string, StudentInfo>, trimModule: Les) {
    if(!trimModule) return;
    for (let student of trimModule.students) {
        if (!students.has(student.name)) {
            student.trimesterInstruments = [[], [], []];
            students.set(student.name, student);
        }
        let stud = students.get(student.name);
        stud.trimesterInstruments[trimModule.trimesterNo-1].push(trimModule);
    }
    //all trims must reference the students in the overall map.
    trimModule.students = trimModule.students
        .map((student) => students.get(student.name));
}

function addJaarStudentsToMapAndCount(students: Map<string, StudentInfo>, jaarModule: Les) {
    if(!jaarModule) return;
    for (let student of jaarModule.students) {
        if (!students.has(student.name)) {
            student.jaarInstruments = [];
            students.set(student.name, student);
        }
        let stud = students.get(student.name);
        stud.jaarInstruments.push(jaarModule);
    }
    //all jaarModules must reference the students in the overall map.
    jaarModule.students = jaarModule.students
        .map((student) => students.get(student.name));
}

function sortModuleStudents(les: Les) {
    if(!les) return;
    let comparator = new Intl.Collator();
    les.students
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
