import {fetchVakken, sendClearWerklijst, sendCriteria, sendFields, sendGrouping} from "./criteria.js";
import * as def from "../def.js";
import {getPageStateOrDefault, PageName, savePageState, WerklijstPageState} from "../pageState.js";

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

// noinspection JSUnusedGlobalSymbols
enum Domein {
    Muziek = 3,
    Woord = 4,
    Dans = 2,
    Overschrijdend = 5
}

interface Veld {
    value: string;
    text: string;
}

const VELDEN = {
    VAK_NAAM: {value: "vak_naam", text: "vak"},
    GRAAD_LEERJAAR: {value: "graad_leerjaar", text: "graad + leerjaar"},
    KLAS_LEERKRACHT: {value: "klasleerkracht", text: "klasleerkracht"},
}

enum Grouping {
    LEERLING = "persoon_id",
    VAK = "vak_id",
    LES = "les_id",
    INSCHRIJVING = "inschrijving_id",
}

type isSelectedVak = (vak: string) => boolean;
interface WerklijstCriteria {
    vakken: string[] | isSelectedVak;
    domein:Domein[];
    velden: Veld[];
    grouping: Grouping;
}

export async function setWerklijstCriteria(criteria: WerklijstCriteria) {
    await sendClearWerklijst();

    //DEFAULT CRITERIA
    let criteriaString = [
        {"criteria": "Schooljaar", "operator": "=", "values": "2024-2025"},
        {"criteria": "Status", "operator": "=", "values": "12"}, //inschrijvingen en toewijzingen
        {"criteria": "Uitschrijvingen", "operator": "=", "values": "0"}, // Zonder uitgeschreven leerlingen
    ];

    //DOMEIN
    if(criteria.domein.length) {
        criteriaString.push({"criteria": "Domein", "operator": "=", "values": criteria.domein.join()});
    }

    //VAKKEN
    if(criteria.vakken) {
        let vakken = await fetchVakken(false);
        if (typeof criteria.vakken === 'function') {
            let isVak = criteria.vakken;
            let instruments = vakken.filter((vak) => isVak(vak[0]));
            let values = instruments.map(vak => parseInt(vak[1]));
            criteriaString.push({ "criteria": "Vak", "operator": "=", "values": values.join()});
        }
    }

    await sendCriteria(criteriaString);
    await sendFields(criteria.velden);
    await sendGrouping(criteria.grouping);
    let pageState = getPageStateOrDefault(PageName.Werklijst) as WerklijstPageState;
    pageState.werklijstTableName = def.UREN_TABLE_STATE_NAME;
    savePageState(pageState);
    (document.querySelector("#btn_werklijst_maken") as HTMLButtonElement).click();
}

export async function prefillInstruments() {
    let crit: WerklijstCriteria = {
        vakken: isInstrument,
        domein: [Domein.Muziek],
        velden: [VELDEN.VAK_NAAM, VELDEN.GRAAD_LEERJAAR, VELDEN.KLAS_LEERKRACHT],
        grouping: Grouping.VAK
    };
    return setWerklijstCriteria(crit);
}

function isInstrument(text: string) {
    return instrumentSet.has(text);
}