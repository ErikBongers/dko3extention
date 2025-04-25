import {fetchVakken, sendClearWerklijst, sendCriteria, sendFields, sendGrouping} from "./criteria";
import * as def from "../def";
import {getGotoStateOrDefault, PageName, saveGotoState, WerklijstGotoState} from "../gotoState";
import {defaultInstruments} from "./hoursSettings";

export async function setCriteriaForTeacherHours(schooljaar: string) {
    await sendClearWerklijst();
    let dko3_vakken = await fetchVakken(false, schooljaar);
    let selectedInstrumentNames  =  new Set(defaultInstruments.map(i => i.name));
    let instruments = dko3_vakken.filter((vak) => selectedInstrumentNames.has(vak.name));
    let values = instruments.map(vak => parseInt(vak.value));
    let valueString = values.join();

    let criteria = [
        {"criteria": "Schooljaar", "operator": "=", "values": schooljaar},
        {"criteria": "Status", "operator": "=", "values": "12"},
        {"criteria": "Uitschrijvingen", "operator": "=", "values": "0"},
        {"criteria": "Domein", "operator": "=", "values": "3"},
        {
            "criteria": "Vak",
            "operator": "=",
            "values": valueString
        }
    ];
    await sendCriteria(criteria);
    await sendFields([
        {value: "vak_naam", text: "vak"},
        {value: "graad_leerjaar", text: "graad + leerjaar"},
        {value: "klasleerkracht", text: "klasleerkracht"}]
    );
    await sendGrouping("vak_id");
    let pageState = getGotoStateOrDefault(PageName.Werklijst) as WerklijstGotoState;
    pageState.werklijstTableName = def.UREN_TABLE_STATE_NAME;
    saveGotoState(pageState);
    (document.querySelector("#btn_werklijst_maken") as HTMLButtonElement).click();
}
