import {Les, LesType, StudentInfo} from "./scrape";


export class BlockInfo {
    teacher: string;
    instrumentName: string;
    maxAantal: number;
    lesmoment: string;
    vestiging: string;
    trimesters: (Les| undefined)[][];
    jaarModules: Les[];
}

interface LesMoment {
    moment: string;
    trimesterLessen: Les[][];
    jaarModules: Les[];

}
interface Teacher {
    name: string;
    blocks: BlockInfo[];
    lesMomenten: Map<string, BlockInfo>;
}

export interface TableData {
    students : Map<string, StudentInfo>,
    instruments : Map<string, BlockInfo[]>,
    teachers : Map<string, Teacher>,
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
        instruments: new Map(),
        teachers: new Map(),
        blocks: [],
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
                block.trimesters = [[], [], []];
                let trims = buildTrimesters(instrumentTeacherMomentModules);
                if(trims[0])
                    block.trimesters[0].push(trims[0]);
                if(trims[1])
                    block.trimesters[1].push(trims[1]);
                if(trims[2])
                    block.trimesters[2].push(trims[2]);
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
            sortStudents(trim[0]?.students);
        }
        for (let jaarModule of instrument.jaarModules) {
            sortStudents(jaarModule?.students);
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

    //group by instrument
    let instrumentNames = [...new Set(tableData.blocks.map(b => b.instrumentName))].sort((a,b) => { return a.localeCompare(b);});
    for(let instr of instrumentNames) {
        tableData.instruments.set(instr, []);
    }
    for(let block of tableData.blocks) {
        tableData.instruments.get(block.instrumentName).push(block);
    }

    //group by teacher
    let teachers = [...new Set(tableData.blocks.map(b => b.teacher))].sort((a,b) => { return a.localeCompare(b);});
    for(let t of teachers) {
        tableData.teachers.set(t, <Teacher>{name: t, blocks: []});
    }
    for(let block of tableData.blocks) {
        tableData.teachers.get(block.teacher).blocks.push(block);
    }

    for(let [teacherName, teacher] of tableData.teachers) {
        // merge blocks per teachter/hour
        // for jaarmodules: merge all students
        // for trimestermodules: merge all students
        //add the maxAantal, even though they may not be meant to be added.
        // add a row with the total amount of students (per trimester, including jaarstudents)


        let hours = [...new Set(teacher.blocks.map(b => b.lesmoment))];
        //TODO: convert LesMoment into a block so that buildBlock() can still be used.
        //> first convert BlockInfo.trimesters to a 2-dim array of trimester lessen. (like LesMoment
        teacher.lesMomenten = new Map(hours.map(moment =>
            [moment,
                <BlockInfo>{
                    teacher: teacherName,
                    vestiging: undefined,
                    maxAantal: -1,
                    instrumentName: undefined,
                    lesmoment: undefined, //avoid that it gets displayed in info row as well.
                    trimesters: [[], [], []],
                    jaarModules: []
                }]));
        //bundle the blocks per hour
        for(let block of teacher.blocks) {
            teacher.lesMomenten.get(block.lesmoment).jaarModules.push(...block.jaarModules);
            for(let trimNo of [0,1,2] ) {
                teacher.lesMomenten.get(block.lesmoment).trimesters[trimNo].push(block.trimesters[trimNo][0]);
            }
        }
        teacher.lesMomenten.forEach(hour => {
            hour.vestiging = [...new Set(hour.trimesters.flat().filter(les => les).map(les => les.vestiging))].join(", ");
        });

    }
    console.log(tableData);
    return tableData;
}

function addTrimesterStudentsToMapAndCount(students: Map<string, StudentInfo>, trimModules: Les[]) {
    //for now, only looking ath the first module. Could be expanded if more modues are added to the block.
    if(!trimModules[0]) return;
    for (let student of trimModules[0].students) {
        if (!students.has(student.name)) {
            student.trimesterInstruments = [[], [], []];
            students.set(student.name, student);
        }
        let stud = students.get(student.name);
        stud.trimesterInstruments[trimModules[0].trimesterNo-1].push(trimModules[0]);
    }
    //all trims must reference the students in the overall map.
    trimModules[0].students = trimModules[0].students
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

function sortStudents(students: StudentInfo[]) {
    if(!students) return;
    let comparator = new Intl.Collator();
    students
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

interface MergedBlockStudents {
    jaarStudents: StudentInfo[],
    trimesterStudents: StudentInfo[][],
    maxAantallen: number[],
    blockNeededRows: number,
    wachtlijsten: number[],
    hasWachtlijst: boolean,
    maxJaarStudentCount: number
}

export const TOO_LARGE_MAX = 100;

export function mergeBlockStudents(block: BlockInfo) {
    let jaarStudents = block.jaarModules.map(les => les.students).flat();
    let trimesterStudents = [
        block.trimesters[0].map(les => les?.students ?? []).flat(),
        block.trimesters[1].map(les => les?.students ?? []).flat(),
        block.trimesters[2].map(les => les?.students ?? []).flat(),
    ];

    trimesterStudents.forEach( trim => sortStudents(trim));

    let maxAantallen = block.trimesters
        .map((trimLessen) => {
            if(trimLessen.length === 0)
                return 0;
            return trimLessen
                .map(les => les?.maxAantal ?? 0)
                .map(maxAantal => maxAantal > TOO_LARGE_MAX ? 4 : maxAantal)
                .reduce((a,b) => a+b); //TODO: this is dangerous as it assumes that the hours can be summed.
        });

    let blockNeededRows = Math.max(
        ...maxAantallen,
        ...trimesterStudents.map(stud => stud.length)
    );
    let wachtlijsten = block.trimesters
        .map((trimLessen) => {
            if(trimLessen.length === 0)
                return 0;
            return trimLessen
                .map(les => les?.wachtlijst ?? 0)
                .reduce((a,b) => a + b);
        });

    let hasWachtlijst = wachtlijsten
        .some(wachtLijst => wachtLijst>0);
    if (hasWachtlijst) {
        blockNeededRows++;
    }

    let maxJaarStudentCount = block.jaarModules
        .map(mod => mod.maxAantal)
        .reduce((a, b) => Math.max(a, b), 0);
    return {
        jaarStudents,
        trimesterStudents,
        maxAantallen,
        blockNeededRows,
        wachtlijsten,
        hasWachtlijst,
        maxJaarStudentCount
    } as MergedBlockStudents;

}
