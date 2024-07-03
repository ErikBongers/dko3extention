import {fetchVakken, sendClearWerklijst, sendCriteria, sendFields, sendGrouping} from "./criteria.js";

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

export async function prefillInstruments() {
    await sendClearWerklijst();
    let vakken = await fetchVakken(false);
    let instruments = vakken.filter((vak) => isInstrument(vak[0]));
    let values = instruments.map(vak => parseInt(vak[1]));
    let valueString = values.join();

    let criteria = [
        {"criteria": "Schooljaar", "operator": "=", "values": "2024-2025"},
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
    console.log("Criteria sent.");
    await sendFields([
        {value: "vak_naam", text: "vak"},
        {value: "graad_leerjaar", text: "graad + leerjaar"},
        {value: "klasleerkracht", text: "klasleerkracht"}]
    );
    console.log("Fields sent.");
    await sendGrouping("vak_id");
    console.log("Grouping sent.");
    location.reload();
}

function isInstrument(text: string) {
    return instrumentSet.has(text);
}