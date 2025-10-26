import {cloud} from "../cloud";
import {Schoolyear} from "../globals";
import {Grouping} from "./criteria";
import {createWerklijstBuilder} from "../table/werklijstBuilder";

export type SubjectDef = {
    checked: boolean,
    name: string,
    alias: string,
    stillValid: boolean
}

export type TranslationDef = {
    find: string,
    replace: string,
    prefix: string,
    suffix: string,
}

export type TeacherHoursSetup = {
    version: 1,
    schoolyear: string,
    subjects: SubjectDef[];
    translations: TranslationDef[];
}

export type TeacherHoursSetupMapped = TeacherHoursSetup & {
    subjectsMap: Map<string, SubjectDef>,
}

export function mapHourSettings(hourSettings: TeacherHoursSetup) {
    let mapped = {...hourSettings} as TeacherHoursSetupMapped;
    mapped.subjectsMap = new Map(hourSettings.subjects.map(s => [s.name, s]));
    return mapped;
}

let defaultInstruments = [
    {checked:  true, name:  "Aaaaa", alias: "bbb", stillValid: true},
    {checked:  true, name:  "Accordeon", alias: "", stillValid: false},
    {checked:  true, name:  "Altfluit", alias: "Dwarsfluit", stillValid: false},
    {checked:  true, name:  "Althoorn", alias: "", stillValid: false},
    {checked:  true, name:  "Altklarinet", alias: "", stillValid: false},
    {checked:  true, name:  "Altsaxofoon", alias: "", stillValid: false},
    {checked:  true, name:  "Altsaxofoon (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Altviool", alias: "", stillValid: false},
    {checked:  true, name:  "Baglama/saz (wereldmuziek)", alias: "", stillValid: false},
    {checked:  true, name:  "Bariton", alias: "", stillValid: false},
    {checked:  true, name:  "Baritonsaxofoon", alias: "", stillValid: false},
    {checked:  true, name:  "Baritonsaxofoon (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Basfluit", alias: "", stillValid: false},
    {checked:  true, name:  "Basgitaar (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Basklarinet", alias: "Klarinet", stillValid: false},
    {checked:  true, name:  "Bastrombone", alias: "", stillValid: false},
    {checked:  true, name:  "Bastuba", alias: "Koper", stillValid: false},
    {checked:  true, name:  "Bugel", alias: "Koper", stillValid: false},
    {checked:  true, name:  "Cello", alias: "", stillValid: false},
    {checked:  true, name:  "Contrabas (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Contrabas (klassiek)", alias: "", stillValid: false},
    {checked:  true, name:  "Dwarsfluit", alias: "", stillValid: false},
    {checked:  true, name:  "Engelse hoorn", alias: "", stillValid: false},
    {checked:  true, name:  "Eufonium", alias: "Koper", stillValid: false},
    {checked:  true, name:  "Fagot", alias: "", stillValid: false},
    {checked:  true, name:  "Gitaar", alias: "", stillValid: false},
    {checked:  true, name:  "Gitaar (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Harp", alias: "", stillValid: false},
    {checked:  true, name:  "Hobo", alias: "", stillValid: false},
    {checked:  true, name:  "Hoorn", alias: "Koper", stillValid: false},
    {checked:  true, name:  "Keyboard (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Klarinet", alias: "", stillValid: false},
    {checked:  true, name:  "Kornet", alias: "", stillValid: false},
    {checked:  true, name:  "Orgel", alias: "", stillValid: false},
    {checked:  true, name:  "Piano", alias: "", stillValid: false},
    {checked:  true, name:  "Piano (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Pianolab", alias: "", stillValid: false},
    {checked:  true, name:  "Piccolo", alias: "Dwarsfluit", stillValid: false},
    {checked:  true, name:  "Slagwerk", alias: "", stillValid: false},
    {checked:  true, name:  "Slagwerk (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Sopraansaxofoon", alias: "", stillValid: false},
    {checked:  true, name:  "Sopraansaxofoon (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Tenorsaxofoon", alias: "", stillValid: false},
    {checked:  true, name:  "Tenorsaxofoon (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Trombone", alias: "Koper", stillValid: false},
    {checked:  true, name:  "Trompet", alias: "Koper", stillValid: false},
    {checked:  true, name:  "Trompet (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Ud (wereldmuziek)", alias: "", stillValid: false},
    {checked:  true, name:  "Viool", alias: "", stillValid: false},
    {checked:  true, name:  "Zang", alias: "", stillValid: false},
    {checked:  true, name:  "Zang (jazz pop rock)", alias: "", stillValid: false},
    {checked:  true, name:  "Zang (musical 2e graad)", alias: "", stillValid: false},
    {checked:  true, name:  "Zang (musical)", alias: "", stillValid: false},
];

let defaultInstrumentsMap = new Map<string, SubjectDef>();
defaultInstruments.forEach(i => defaultInstrumentsMap.set(i.name, i));

let defaultTranslationDefs: TranslationDef[] = [
    {find: "Altsaxofoon", replace: "Saxofoon", prefix: "", suffix: ""},
    {find: "Sopraansaxofoon", replace: "Saxofoon", prefix: "", suffix: ""},
    {find: "Baritonsaxofoon", replace: "Saxofoon", prefix: "", suffix: ""},
    {find: "Tenorsaxofoon", replace: "Saxofoon", prefix: "", suffix: ""},

    {find: "(klassiek)", replace: "", prefix: "K ", suffix: ""},
    {find: "(jazz pop rock)", replace: "", prefix: "JPR ", suffix: ""},
    {find: "(musical)", replace: "", prefix: "M ", suffix: ""},
    {find: "(musical 2e graad)", replace: "(2e graad)", prefix: "M ", suffix: ""},
    {find: "(wereldmuziek)", replace: "", prefix: "WM ", suffix: ""},
    {find: "instrumentinitiatie", replace: "init", prefix: "", suffix: ""},
    {find: "", replace: "", prefix: "K ", suffix: ""},
    {find: "K JPR ", replace: "JPR ", prefix: "", suffix: ""},
    {find: "K M ", replace: "M ", prefix: "", suffix: ""},
    {find: "K WM ", replace: "WM ", prefix: "", suffix: ""},
    {find: "K K ", replace: "K ", prefix: "", suffix: ""},
];

function getDefaultHourSettings(schoolyear: string): TeacherHoursSetup {
    return {
        version: 1,
        schoolyear,
        subjects: [...defaultInstruments],
        translations: [...defaultTranslationDefs]
    };
}

export async function fetchHoursSettingsOrSaveDefault(schoolyearString: string, dko3_subjects: {name: string, value: string}[] = undefined) {
    let builder = await createWerklijstBuilder(schoolyearString, Grouping.LES);
    if(!dko3_subjects)
        dko3_subjects = await builder.fetchAvailableSubjects();
    let subjectNames = dko3_subjects.map(vak => vak.name);
    let availableSubjectSet = new Set(subjectNames);

    let cloudSettings = await cloud.json.fetch(createTeacherHoursFileName(schoolyearString)).catch(_ => {}) as TeacherHoursSetup;
    if(!cloudSettings) {
        let prevYearString = Schoolyear.toFullString(Schoolyear.toNumbers(schoolyearString).startYear-1);
        cloudSettings = await cloud.json.fetch(createTeacherHoursFileName(prevYearString)).catch(_ => {}) as TeacherHoursSetup;
        if (!cloudSettings) {
            cloudSettings = getDefaultHourSettings(schoolyearString);
        } else {
            cloudSettings.schoolyear = schoolyearString;
        }
        await saveHourSettings(cloudSettings); //save unmerged settings. It's up to the user to review and change these defaults.
    }

    //invalidate obsolete subjects
    cloudSettings.subjects.forEach(s => s.stillValid = availableSubjectSet.has(s.name));
    let cloudSubjectMap = new Map(cloudSettings.subjects.map(s => [s.name, s]));
    //add new subjects
    for(let name of availableSubjectSet) {
        if(!cloudSubjectMap.has(name)) {
            cloudSubjectMap.set(name, {
                checked: false,
                name,
                alias: "",
                stillValid: true
            });
        }
    }
    cloudSettings.subjects = [...cloudSubjectMap.values()].sort((a, b) => a.name.localeCompare(b.name));

    return cloudSettings;
}

export function createTeacherHoursFileName(schoolyear: string) {
    return "teacherHoursSetup_" + schoolyear + ".json";
}

export async function saveHourSettings(hoursSetup: TeacherHoursSetup) {
    let fileName = createTeacherHoursFileName(hoursSetup.schoolyear);
    return cloud.json.upload(fileName, hoursSetup);
}