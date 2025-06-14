import {Domein, fetchAvailableSubjects, Grouping, resetWerklijst} from "./criteria";
import * as def from "../def";
import {getGotoStateOrDefault, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {fetchHoursSettingsOrSaveDefault, TeacherHoursSetup} from "./hoursSettings";
import {FIELD, WerklijstBuilder} from "../table/werklijstBuilder";

export async function setCriteriaForTeacherHoursAndClickFetchButton(schooljaar: string, hourSettings?: TeacherHoursSetup) {
    await resetWerklijst(schooljaar);
    let dko3_vakken = await fetchAvailableSubjects(schooljaar);
    if(!hourSettings)
        hourSettings = await fetchHoursSettingsOrSaveDefault(schooljaar);
    let selectedInstrumentNames  =  new Set(hourSettings.subjects.filter(i => i.checked).map(i => i.name));
    let validInstruments = dko3_vakken.filter((vak) => selectedInstrumentNames.has(vak.name));
    let values = validInstruments.map(vak => parseInt(vak.value));
    let valueString = values.join();

    let builder  =  new WerklijstBuilder(schooljaar);
    builder.addDomeinen([Domein.Muziek]);
    builder.addVakCodes( valueString);
    builder.addFields([FIELD.VAK_NAAM, FIELD.GRAAD_LEERJAAR, FIELD.KLAS_LEERKRACHT]);
    await builder.sendSettings(Grouping.VAK);
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    pageState.werklijstTableName = def.UREN_TABLE_STATE_NAME;
    saveGotoState(pageState);
    if(window.location.hash === "#leerlingen-werklijst$werklijst")
        location.reload();
    else
        location.hash = "#leerlingen-werklijst$werklijst";
}
