import {Les, StudentInfo} from "./scrape";


export class RowInfo {
    teacher: string;
    instrumentName: string;
    maxAantal: number;
    lesmoment: string;
    vestiging: string;
    trimesters: (Les| undefined)[];
}

export interface TableData {
    students : Map<string, StudentInfo>,
    rows: RowInfo[]
}

function buildTrimesters(modules: Les[]) {
    let mergedInstrument: (Les | undefined)[] = [undefined, undefined, undefined];
    for (let module of modules) {
        mergedInstrument[module.trimesterNo-1] = module;
    }
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

export function buildTableData(inputModules: Les[]) : TableData {
    let tableData: TableData = {
        students: new Map(),
        rows: []
    };
    //prepare data
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

    let instrumentNames = inputModules.map((module) => module.instrumentName);
    instrumentNames = [...new Set(instrumentNames)] as [string];

    for (let instrumentName of instrumentNames) {
        let instrumentModules = inputModules.filter((module) => module.instrumentName === instrumentName);

        let teachers = instrumentModules.map((module) => module.teacher);
        teachers = [...new Set(teachers)];

        for(let teacher of teachers) {
            let instrumentTeacherModules = instrumentModules.filter(module => module.teacher === teacher);

            let lesmomenten = getLesmomenten(instrumentTeacherModules);
            lesmomenten = [...new Set(lesmomenten)];

            for(let lesmoment of lesmomenten) {
                let instrumentTeacherMomentModules = instrumentTeacherModules.filter(module => module.formattedLesmoment === lesmoment);

                let rowInfo: RowInfo = new RowInfo();
                rowInfo.instrumentName = instrumentName;
                rowInfo.teacher = teacher;
                rowInfo.lesmoment = lesmoment;
                rowInfo.maxAantal = getMaxAantal(instrumentTeacherMomentModules);
                rowInfo.vestiging = getVestigingen(instrumentTeacherMomentModules);
                rowInfo.trimesters = buildTrimesters(instrumentTeacherMomentModules);

                tableData.rows.push(rowInfo);

                for (let trim of rowInfo.trimesters) {
                    addTrimesterStudentsToMapAndCount(tableData.students, trim);
                }
            }
        }
    }

    for(let student of tableData.students.values()) {
        let instruments = student.instruments.flat();
        if (instruments.length < 3) {
            student.allYearSame = false;
            continue; //skip the every() below if we haven't got 3 instruments.
        }
        student.allYearSame = instruments
            .every((instr: any) => instr.instrumentName === (student?.instruments[0][0]?.instrumentName ?? "---"));
    }

    for(let instrument of tableData.rows) {
        for (let trim of instrument.trimesters) {
            sortTrimesterStudents(trim);
        }
    }

    for(let student of tableData.students.values()) {
        student.info = "";
        for(let instrs of student.instruments) {
            if(instrs.length) {
                student.info += instrs[0].trimesterNo + ". " + instrs.map(instr => instr.instrumentName) + "\n";
            } else {
                student.info += "?. ---\n";
            }
        }
    }
    return tableData;
}

function addTrimesterStudentsToMapAndCount(students: Map<string, StudentInfo>, trim: Les) {
    if(!trim) return;
    for (let student of trim.students) {
        if (!students.has(student.name)) {
            student.instruments = [[], [], []];
            students.set(student.name, student);
        }
        let stud = students.get(student.name);
        stud.instruments[trim.trimesterNo-1].push(trim);
    }
    //all trims must reference the students in the overall map.
    trim.students = trim.students
        .map((student) => students.get(student.name));
}

function sortTrimesterStudents(trim: Les) {
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
