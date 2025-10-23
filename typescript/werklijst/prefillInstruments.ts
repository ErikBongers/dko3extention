import {CriteriumName, Domein, FIELD, Grouping, Operator} from "./criteria";
import * as def from "../def";
import {getGotoStateOrDefault, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {fetchHoursSettingsOrSaveDefault, TeacherHoursSetup} from "./hoursSettings";
import {WerklijstBuilder} from "../table/werklijstBuilder";

export async function setCriteriaForTeacherHoursAndClickFetchButton(schooljaar: string, hourSettings?: TeacherHoursSetup) {
    let builder = await WerklijstBuilder.fetch(schooljaar, Grouping.LES);
    let dko3_vakken = await builder.fetchAvailableSubjects();
    if(!hourSettings)
        hourSettings = await fetchHoursSettingsOrSaveDefault(schooljaar);
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
