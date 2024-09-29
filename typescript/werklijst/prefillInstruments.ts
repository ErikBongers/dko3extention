import {getPageStateOrDefault, PageName, savePageState, WerklijstPageState} from "../pageState";
import * as def from "../def";
import {Domein, Grouping, setWerklijstCriteria, VELDEN, WerklijstCriteria} from "./criteria";

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

export function isInstrument(text: string) {
    return instrumentSet.has(text);
}

export async function prefillInstruments() {
    let crit: WerklijstCriteria = {
        vakken: isInstrument,
        domein: [Domein.Muziek],
        velden: [VELDEN.VAK_NAAM, VELDEN.GRAAD_LEERJAAR, VELDEN.KLAS_LEERKRACHT],
        grouping: Grouping.VAK
    };
    await setWerklijstCriteria(crit);
    let pageState = getPageStateOrDefault(PageName.Werklijst) as WerklijstPageState;
    pageState.werklijstTableName = def.UREN_TABLE_STATE_NAME;
    savePageState(pageState);
    (document.querySelector("#btn_werklijst_maken") as HTMLButtonElement).click();
}