import {fetchVakken, sendClearWerklijst, sendCriteria, sendFields, sendGrouping} from "./criteria";
import * as def from "../def";
import {getPageStateOrDefault, PageName, savePageState, WerklijstPageState} from "../pageState";

export let instrumentSet = new Set([
    "Accordeon",
    "Altfluit",
    "Althoorn",
    "Altklarinet",
    "Altsaxofoon",
    "Altsaxofoon (jazz pop rock)",
    "Altviool",
    "Baglama/saz (wereldmuziek)",
    "Bariton",
    "Baritonsaxofoon",
    "Baritonsaxofoon (jazz pop rock)",
    "Basfluit",
    "Basgitaar (jazz pop rock)",
    "Basklarinet",
    "Bastrombone",
    "Bastuba",
    "Bugel",
    "Cello",
    "Contrabas (jazz pop rock)",
    "Contrabas (klassiek)",
    "Dwarsfluit",
    "Engelse hoorn",
    "Eufonium",
    "Fagot",
    "Gitaar",
    "Gitaar (jazz pop rock)",
    "Harp",
    "Hobo",
    "Hoorn",
    "Keyboard (jazz pop rock)",
    "Klarinet",
    "Kornet",
    "Orgel",
    "Piano",
    "Piano (jazz pop rock)",
    "Pianolab",
    "Piccolo",
    "Slagwerk",
    "Slagwerk (jazz pop rock)",
    "Sopraansaxofoon",
    "Sopraansaxofoon (jazz pop rock)",
    "Tenorsaxofoon",
    "Tenorsaxofoon (jazz pop rock)",
    "Trombone",
    "Trompet",
    "Trompet (jazz pop rock)",
    "Ud (wereldmuziek)",
    "Viool",
    "Zang",
    "Zang (jazz pop rock)",
    "Zang (musical 2e graad)",
    "Zang (musical)",
]);

export async function prefillInstruments(schooljaar: string) {
    await sendClearWerklijst();
    let vakken = await fetchVakken(false, schooljaar);
    let instruments = vakken.filter((vak) => isInstrument(vak[0]));
    let values = instruments.map(vak => parseInt(vak[1]));
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
    let pageState = getPageStateOrDefault(PageName.Werklijst) as WerklijstPageState;
    pageState.werklijstTableName = def.UREN_TABLE_STATE_NAME;
    savePageState(pageState);
    (document.querySelector("#btn_werklijst_maken") as HTMLButtonElement).click();
}

function isInstrument(text: string) {
    return instrumentSet.has(text);
}