import {Domein, fetchAvailableSubjects, Grouping, sendClearWerklijst, sendCriteria, sendFields, sendGrouping, WerklijstCriteria} from "./criteria";
import * as def from "../def";
import {getGotoStateOrDefault, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {fetchHoursSettingsOrSaveDefault, TeacherHoursSetup} from "./hoursSettings";

export async function setCriteriaForTeacherHoursAndClickFetchButton(schooljaar: string, hourSettings?: TeacherHoursSetup) {
    await sendClearWerklijst();
    let dko3_vakken = await fetchAvailableSubjects(schooljaar);
    if(!hourSettings)
        hourSettings = await fetchHoursSettingsOrSaveDefault(schooljaar);
    let selectedInstrumentNames  =  new Set(hourSettings.subjects.filter(i => i.checked).map(i => i.name));
    let validInstruments = dko3_vakken.filter((vak) => selectedInstrumentNames.has(vak.name));
    let values = validInstruments.map(vak => parseInt(vak.value));
    let valueString = values.join();

    let criteria  =  new WerklijstCriteria(schooljaar);
    criteria.addDomeinen([Domein.Muziek]);
    criteria.addVakCodes( valueString);
    await sendCriteria(criteria);
    await sendFields([
        {value: "vak_naam", text: "vak"},
        {value: "graad_leerjaar", text: "graad + leerjaar"},
        {value: "klasleerkracht", text: "klasleerkracht"}]
    );
    await sendGrouping(Grouping.VAK);
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    pageState.werklijstTableName = def.UREN_TABLE_STATE_NAME;
    saveGotoState(pageState);
    if(window.location.hash === "#leerlingen-werklijst$werklijst")
        location.reload();
    else
        location.hash = "#leerlingen-werklijst$werklijst";
}
