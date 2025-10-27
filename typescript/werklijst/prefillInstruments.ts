import {CriteriumName, Domein, FIELD, Grouping, Operator} from "./criteria";
import * as def from "../def";
import {getGotoStateOrDefault, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {createTeacherHoursFileName, getDefaultHourSettings, saveHourSettings, TeacherHoursSetup} from "./hoursSettings";
import {createWerklijstBuilder} from "../table/werklijstBuilder";
import {cloud} from "../cloud";
import {Schoolyear} from "../globals";

export async function fetchHoursSettingsOrSaveDefault(schoolyearString: string, dko3_subjects: { name: string, value: string }[] = undefined) {
    let builder = await createWerklijstBuilder(schoolyearString, Grouping.LES);
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

export async function setCriteriaForTeacherHoursAndClickFetchButton(schooljaar: string, hourSettings?: TeacherHoursSetup) {
    let builder = await createWerklijstBuilder(schooljaar, Grouping.LES);
    let dko3_vakken = await builder.fetchAvailableSubjects();
    await builder.reset();
    if(!hourSettings)
        hourSettings = await fetchHoursSettingsOrSaveDefault(schooljaar, dko3_vakken);
    let selectedInstrumentNames  =  new Set(hourSettings.subjects.filter(i => i.checked).map(i => i.name));
    let validInstruments = dko3_vakken.filter((vak) => selectedInstrumentNames.has(vak.name));
    let vakNames = validInstruments.map(vak => vak.name);
    builder.addCriterium(CriteriumName.Domein, Operator.PLUS, [Domein.Muziek]);
    builder.addCriterium(CriteriumName.Vak, Operator.PLUS, vakNames); //todo: we already have the codes: Immediately add the codes?
    builder.addFields([FIELD.NAAM, FIELD.VOORNAAM, FIELD.VAK_NAAM, FIELD.GRAAD_LEERJAAR, FIELD.KLAS_LEERKRACHT]);
    let preparedWerklijst = await builder.sendSettings();
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    pageState.werklijstTableName = def.UREN_TABLE_STATE_NAME;
    saveGotoState(pageState);

    console.log("Werklijst prepared: reloading page (or changing hash). ");
    if(window.location.hash === "#leerlingen-werklijst$werklijst")
        location.reload();
    else
        location.hash = "#leerlingen-werklijst$werklijst";
}
