import {CriteriumName, Domein, FIELD, Grouping, Operator} from "./criteria";
import * as def from "../def";
import {getGotoStateOrDefault, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {createTeacherHoursFileName, getDefaultHourSettings, saveHourSettings, TeacherHoursSetup, TeacherHoursSetupMapped} from "./hoursSettings";
import {cloud} from "../cloud";
import {Schoolyear} from "../globals";
import {createWerklijstBuilderWithReset} from "../table/werklijstBuilder";
import {NamedCellTableFetchListener} from "../pageHandlers";

export async function fetchHoursSettingsOrSaveDefault(schoolyearString: string, dko3_subjects?: { name: string, value: string }[]) {
    let builder = await createWerklijstBuilderWithReset(schoolyearString, Grouping.LES);
    if (!dko3_subjects)
        dko3_subjects = await builder.fetchAvailableSubjects();
    let subjectNames = dko3_subjects.map(vak => vak.name);
    let availableSubjectSet = new Set(subjectNames);

    let cloudSettings = await cloud.json.fetch(createTeacherHoursFileName(schoolyearString)).catch(_ => {
    }) as TeacherHoursSetup;
    if (!cloudSettings) {
        let prevYearString = Schoolyear.toFullString(Schoolyear.toNumbers(schoolyearString).startYear - 1);
        cloudSettings = await cloud.json.fetch(createTeacherHoursFileName(prevYearString)).catch(_ => {
        }) as TeacherHoursSetup;
        if (!cloudSettings) {
            cloudSettings = await getDefaultHourSettings(schoolyearString);
        } else {
            cloudSettings.schoolyear = schoolyearString;
        }
        await saveHourSettings(cloudSettings); //save unmerged settings. It's up to the user to review and change these defaults.
    }

    //invalidate obsolete subjects
    cloudSettings.subjects.forEach(s => s.stillValid = availableSubjectSet.has(s.name));
    let cloudSubjectMap = new Map(cloudSettings.subjects.map(s => [s.name, s]));
    //add new subjects
    for (let name of availableSubjectSet) {
        if (!cloudSubjectMap.has(name)) {
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

