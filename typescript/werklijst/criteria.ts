import * as def from "../def"

// noinspection JSUnusedGlobalSymbols
export enum Domein {
    Muziek = "Muziek (Mu)",
    Woord = "Woord (Wo)",
    Dans = "Dans (Da)",
    Overschrijdend = "DomeinOv (Do)",
}

export interface Veld {
    value: string;
    text: string;
}

// noinspection JSUnusedGlobalSymbols
export enum Grouping {
    LEERLING = "1",
    VAK = "2",
    LES = "3",
    INSCHRIJVING = "4",
}

export interface Criterium {
    name: CriteriumName
    operator: string
    values: string[]
}

export enum Operator {
    PLUS = "="
}

export type IsSelectedItem = (vak: string) => boolean;

export const FIELD = {
    DOMEIN: {value: "domein", text: "domein"},
    NAAM: {value: "naam", text: "naam"},
    VOORNAAM: {value: "voornaam", text: "voornaam"},
    VAK_NAAM: {value: "vak_naam", text: "vak: naam"},
    GRAAD_LEERJAAR: {value: "graad_leerjaar", text: "graad + leerjaar"},
    KLAS_LEERKRACHT: {value: "klasleerkracht", text: "klasleerkracht"},
    LESMOMENTEN: {value: "lesmomenten", text: "lesmomenten"},
}

export async function fetchAvailableSubjects(schoolyear: string) {
    await sendAddCriterium(schoolyear, "Vak");
    // TODO
    // let text = await fetchCritera(schoolyear);
    // await resetWerklijst(schoolyear, Grouping.LEERLING);  //todo:  try to restore the previous werklijst criteria.
    // const template = document.createElement('template');
    // template.innerHTML = text;
    // let vakken = template.content.querySelectorAll("#form_field_leerling_werklijst_criterium_vak option");
    return Array.from([]).map((vak: HTMLOptionElement) => {  return {name: vak.label, value: vak.value}; });
}

async function sendAddCriterium(schoolYear: string, criterium: string) {
    const formData = new FormData();
    formData.append(`criterium`, criterium);
    formData.append(`schooljaar`, schoolYear);
    await fetch(def.DKO3_BASE_URL+"views/leerlingen/werklijst/index.criteria.session_add.php", {
        method: "POST",
        body: formData,
    });
}

export function getDefaultCriteria(schoolYear: string) {
    return [
        {"criteria": "Schooljaar", "operator": "=", "values": schoolYear},
        {"criteria": "Status", "operator": "=", "values": "12"}, //inschrijvingen en toewijzingen
        {"criteria": "Uitschrijvingen", "operator": "=", "values": "0"}, // Zonder uitgeschreven leerlingen
    ];
}

export async function postNameValueList(url: string, criteria: { name: string; value: string }[]) {
    const formData = new FormData();

    criteria.forEach(c => {
        formData.append(c.name, c.value);
    })

    return fetch(url, {
        method: "POST",
        body: formData,
    });
}

export async function sendGrouping(grouping: Grouping) {
    const formData = new FormData();

    formData.append("groepering", grouping);
    await fetch("/views/leerlingen/werklijst/index.groeperen.session_add.php", {
        method: "POST",
        body: formData,
    });
}


export enum CriteriumName {
    Vak = "Vak",
    Vakgroep = "Vakgroep",
    Domein = "Domein",
}

export async function fetchTableRows(response:  Response) {
    let tableHtml = await response.text();
    let div = document.createElement('div');
    div.innerHTML = tableHtml;
    let table = div.querySelector("table");
    return table.querySelectorAll("tr");
}

