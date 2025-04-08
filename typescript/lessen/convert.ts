import {Les, LesType, StudentInfo} from "./scrape";
import {db3, distinct} from "../globals";
import {getSavedNameSorting, NameSorting} from "./build";

interface TagInfo {
    name: string,
    partial: boolean
}

export class BlockInfo {
    teacher: string;
    instrumentName: string;
    maxAantal: number;
    lesmoment: string;
    vestiging: string;
    trimesters: (Les| undefined)[][];
    jaarModules: Les[];
    tags: TagInfo[];
    errors: string;
    offline: boolean;

    static emptyBlock() {
        return <BlockInfo>{
            teacher: undefined,
            instrumentName: undefined,
            maxAantal: -1,
            lesmoment: undefined,
            vestiging: undefined,
            trimesters: [[], [], []],
            jaarModules: [],
            tags: [],
            errors: "",
            offline: false
        }
    }
}

interface MergeableBlocksGroop {
    blocks: BlockInfo[],
    mergedBlocks: Map<string, BlockInfo>
}
interface Teacher {
    name: string;
    blocks: BlockInfo[];
    mergedBlocks: Map<string, BlockInfo>;
    lesMomenten: Map<string, BlockInfo>;
}

interface Instrument {
    name: string;
    blocks: BlockInfo[];
    mergedBlocks: Map<string, BlockInfo>;
    lesMomenten: Map<string, BlockInfo>;
}

export interface TableData {
    students : Map<string, StudentInfo>,
    instruments : Map<string, Instrument>,
    teachers : Map<string, Teacher>,
    blocks: BlockInfo[]
}

function buildTrimesters(instrumentTeacherMomentModules: Les[]) {
    let mergedInstrument: (Les | undefined)[][] = [[], [], []];
    instrumentTeacherMomentModules
        .filter(module => module.lesType === LesType.TrimesterModule)
        .forEach(module => {
        mergedInstrument[module.trimesterNo-1].push(module);
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

function setStudentPopupInfo(student: StudentInfo) {
    student.info = "";
    if (!student.trimesterInstruments)
        return;
    for (let instrs of student.trimesterInstruments) {
        if (instrs.length) {
            student.info += instrs[0].trimesterNo + ". " + instrs.map(instr => instr.instrumentName) + "\n";
        } else {
            student.info += "?. ---\n";
        }
    }
}

function setStudentAllTrimsTheSameInstrument(student: StudentInfo) {
    if(!student.trimesterInstruments)
        return;
    let instruments = student.trimesterInstruments.flat();
    if (instruments.length < 3) {
        student.allYearSame = false;
        return; //skip the every() below if we haven't got 3 instruments.
    }
    student.allYearSame = instruments
        .every((instr: any) => instr.instrumentName === (student?.trimesterInstruments[0][0]?.instrumentName ?? "---"));
}

function setStudentNoInstrumentForAllTrims(student: StudentInfo) {
    if(!student.trimesterInstruments)
        return;
    student.notAllTrimsHaveAnInstrument = false;
    for(let trim of student.trimesterInstruments) {
        if(trim.length == 0)
            student.notAllTrimsHaveAnInstrument = true;
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
    let instruments = distinct(inputModules.map((module) => module.instrumentName));
    for (let instrumentName of instruments) {
        let instrumentModules = inputModules.filter((module) => module.instrumentName === instrumentName);

        // group by TEACHER
        let teachers = distinct(instrumentModules.map((module) => module.teacher));
        for(let teacher of teachers) {
            let instrumentTeacherModules = instrumentModules.filter(module => module.teacher === teacher);

            // group by LESMOMENT
            let lesmomenten = distinct(getLesmomenten(instrumentTeacherModules));
            for(let lesmoment of lesmomenten) {
                let instrumentTeacherMomentModules = instrumentTeacherModules.filter(module => module.formattedLesmoment === lesmoment);

                let block: BlockInfo = BlockInfo.emptyBlock();
                block.instrumentName = instrumentName;
                block.teacher = teacher;
                block.lesmoment = lesmoment;
                block.maxAantal = getMaxAantal(instrumentTeacherMomentModules);
                block.vestiging = getVestigingen(instrumentTeacherMomentModules);
                block.tags = distinct(instrumentTeacherMomentModules.map(les => les.tags).flat())
                    .map(tagName => {
                        return { name: tagName, partial : !tagFoundInAllModules(tagName, instrumentTeacherMomentModules) }
                    });
                // we could have both trimesters and jaar modules for this instrument/teacher/lesmoment
                block.trimesters = buildTrimesters(instrumentTeacherMomentModules);
                block.jaarModules = instrumentTeacherMomentModules.filter(module => module.lesType === LesType.JaarModule);
                block.offline = !instrumentTeacherMomentModules.find(module => module.online === false);
                checkBlockForErrors(block);
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

    for(let student of tableData.students.values()) {
        setStudentPopupInfo(student);
        setStudentAllTrimsTheSameInstrument(student);
        setStudentNoInstrumentForAllTrims(student);
    }

    //group by instrument/teacher/hour
    let instrumentNames = distinct(tableData.blocks.map(b => b.instrumentName)).sort((a,b) => { return a.localeCompare(b);});
    for(let instr of instrumentNames) {
        tableData.instruments.set(instr, <Instrument>{name: instr, blocks: []});
    }
    for(let block of tableData.blocks) {
        tableData.instruments.get(block.instrumentName).blocks.push(block);
    }

    //group by teacher/instrument/hour
    let teachers = distinct(tableData.blocks.map(b => b.teacher)).sort((a,b) => { return a.localeCompare(b);});
    for(let t of teachers) {
        tableData.teachers.set(t, <Teacher>{name: t, blocks: []});
    }
    for(let block of tableData.blocks) {
        tableData.teachers.get(block.teacher).blocks.push(block);
    }

    //group by teacher/lesmoment
    groupBlocksTwoLevels(
        tableData.teachers.values(),
        (block) => block.lesmoment,
        (primary: Teacher, secundary) => { primary.lesMomenten = secundary; }
    );

    //group by instrument/lesmoment
    groupBlocksTwoLevels(
        tableData.instruments.values(),
        (block) => block.lesmoment,
        (primary: Teacher, secundary) => { primary.lesMomenten = secundary; }
    );

    //group by teacher
    groupBlocks(
        tableData.teachers.values(),
        (block) => block.teacher
    );

    //group by instrument
    groupBlocks(
        tableData.instruments.values(),
        (block) => block.instrumentName
    );

    return tableData;
}

function tagFoundInAllModules(tag: string, modules: Les[]) {
    for(let module of modules) {
        if(!module.tags.includes(tag))
            return false;
    }
    return true;
}

function groupBlocksTwoLevels(primaryGroups: Iterable<MergeableBlocksGroop>, getSecondaryKey: (block: BlockInfo) => string, setSecondaryGroup: (primary: MergeableBlocksGroop, group: Map<string, BlockInfo>) => void) {
    for (let primary of primaryGroups) {
        let blocks = primary.blocks;
        let secondaryKeys = distinct(blocks.map(getSecondaryKey));
        let secondaryGroup = new Map(secondaryKeys.map(key => [key, BlockInfo.emptyBlock()]));
        //bundle the blocks per secondary
        for (let block of blocks) {
            mergeBlock(secondaryGroup.get(getSecondaryKey(block)), block);
        }
        secondaryGroup.forEach(block => {
            updateMergedBlock(block);
        });
        setSecondaryGroup(primary, secondaryGroup);
    }
}

function groupBlocks(primaryGroups: Iterable<MergeableBlocksGroop>, getPrimaryKey: (block: BlockInfo) => string) {
    for (let primary of primaryGroups) {
        let blocks = primary.blocks;
        let keys = distinct(blocks.map(getPrimaryKey));
        primary.mergedBlocks = new Map(keys.map(key => [key, BlockInfo.emptyBlock()]));
        //bundle the blocks per secondary
        for (let block of blocks) {
            mergeBlock(primary.mergedBlocks.get(getPrimaryKey(block)), block);
        }
        primary.mergedBlocks.forEach(block => {
            updateMergedBlock(block);
        });
    }
}

function mergeBlock(blockToMergeTo: BlockInfo, block2: BlockInfo) {{
    blockToMergeTo.jaarModules.push(...block2.jaarModules);
    for (let trimNo of [0, 1, 2]) {
        blockToMergeTo.trimesters[trimNo].push(...block2.trimesters[trimNo]);
    }
    blockToMergeTo.errors += block2.errors;
    return blockToMergeTo;
}}

function updateMergedBlock(block: BlockInfo) {
    let allLessen = block.trimesters.flat().concat(block.jaarModules);
    block.lesmoment = [...new Set(allLessen.filter(les => les).map(les => les.lesmoment))].join(", ");
    block.teacher = [...new Set(allLessen.filter(les => les).map(les => les.teacher))].join(", ");
    block.vestiging = [...new Set(allLessen.filter(les => les).map(les => les.vestiging))].join(", ");
    block.instrumentName =  [...new Set(allLessen.filter(les => les).map(les => les.instrumentName))].join(", ");
    block.tags = distinct(allLessen.filter(les => les).map(les => les.tags).flat())
        .map(tagName => {
            return { name: tagName, partial : false }
        });
    //all Lessen should have these tags.
    for(let tag of block.tags) {
        tag.partial = !allLessen.every(les => les.tags.includes(tag.name));
    }
    block.offline = !allLessen.find(les => !les.online);
}

function checkBlockForErrors(block: BlockInfo) {
    let maxMoreThan100 = block.jaarModules
        .map(module => module.maxAantal > TOO_LARGE_MAX)
        .includes(true);
    if(!maxMoreThan100) {
        maxMoreThan100 = block.trimesters.flat()
            .map(module => module?.maxAantal > TOO_LARGE_MAX)
            .includes(true);
    }
    if(maxMoreThan100)
        block.errors += "Max aantal lln > " + TOO_LARGE_MAX;
}

function addTrimesterStudentsToMapAndCount(allStudents: Map<string, StudentInfo>, blockTrimModules: Les[]) {
    for(let blockTrimModule of blockTrimModules) {
        if (!blockTrimModule)
            continue;
        for (let student of blockTrimModule.students) {
            if (!allStudents.has(student.name)) {
                student.trimesterInstruments = [[], [], []];
                allStudents.set(student.name, student);
            }
            let stud = allStudents.get(student.name);
            stud.trimesterInstruments[blockTrimModule.trimesterNo - 1].push(blockTrimModule);
        }
        //all trims must reference the students in the overall map.
        blockTrimModule.students = blockTrimModule.students
            .map((student) => allStudents.get(student.name));
    }
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

export function sortStudents(students: StudentInfo[]) {
    if(!students) return;
    let comparator = new Intl.Collator();
    let sorting = getSavedNameSorting();
    students
        //sort full year students on top.
        .sort((a,b) => {
            if (a.allYearSame && (!b.allYearSame)) {
                return -1;
            } else if ((!a.allYearSame) && b.allYearSame) {
                return 1;
            } else {
                let aName = sorting === NameSorting.LastName ? a.naam + a.voornaam : a.voornaam + a.naam;
                let bName = sorting === NameSorting.LastName ? b.naam + b.voornaam : b.voornaam + b.naam;
                return comparator.compare(aName, bName);
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
                .reduce((a,b) => a+b);
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
