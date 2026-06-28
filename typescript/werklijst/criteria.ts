import * as def from "../def"

// noinspection JSUnusedGlobalSymbols
export enum Domein {
    Muziek = "Muziek (Mu)",
    Woord = "Woord (Wo)",
    Dans = "Dans (Da)",
    Overschrijdend = "DomeinOv (Do)",
}

export interface Veld {
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
    operator: Operator
    values: string[]
}

export enum Operator {
    PLUS = "+",
    EQUALS = "=",
    NOT_EQUALS = "!=",
}

export type IsSelectedItem = (vak: string) => boolean;

type FieldTypes = {
    [key: string]: Veld
}

export namespace FIELD {
 export const DOMEIN: Veld = {text: "domein"} as const;
 export const GRAAD: Veld = {text: "graad"} as const;
 export const LEERJAAR: Veld = {text: "leerjaar"} as const;
 export const BENAMING_LES: Veld = {text: "benaming les"} as const;
 export const VESTIGINGSPLAATS: Veld = {text: "vestigingsplaats"} as const;
 export const NAAM: Veld = {text: "naam"} as const;
 export const STAMNUMMER: Veld = {text: "stamnummer"} as const;
 export const VOORNAAM: Veld = {text: "voornaam"} as const;
 export const VAK_NAAM: Veld = {text: "vak: naam"} as const;
 export const GRAAD_LEERJAAR: Veld = {text: "graad + leerjaar"} as const;
 export const KLAS_LEERKRACHT: Veld = {text: "klasleerkracht"} as const;
 export const LESMOMENTEN: Veld = {text: "lesmomenten"} as const;
 export const LEEFTIJD_31_DEC: Veld = {text: "leeftijd op 31 dec"} as const;
 export const EMAIL_PUNTCOMMA: Veld = {text: "e-mailadressen (gescheiden door puntkomma)"} as const;
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
    Graad = "Graad",
}

export async function fetchTableRows(response:  Response) {
    let tableHtml = await response.text();
    let div = document.createElement('div');
    div.innerHTML = tableHtml;
    let table = div.querySelector("table")!;
    return table.querySelectorAll("tr");
}

export function scrapeCriteria() {
    let rows = document.querySelectorAll("#tbody_leerlingen_werklijst_criteria > tr") as NodeListOf<HTMLTableRowElement>;
    let criteria: string[] = [...rows].map(tr => {
        let id = tr.dataset.criterium_id;
        let select = tr.cells[1].querySelector("select") as HTMLSelectElement;
        let operator = select?.value ?? "";
        let value = "-null-";
        let selectionRenderedSpan = tr.cells[2].querySelector("span.select2-selection__rendered") as HTMLSpanElement;
        if (selectionRenderedSpan) {
            value = selectionRenderedSpan.getAttribute("title") ?? "-null-";
            let options = tr.cells[2].querySelectorAll(".select2 option") as NodeListOf<HTMLOptionElement>;
            let selectedOption = [...options].find(option => option.textContent === value);
            value = selectedOption?.getAttribute("value") ?? "-null-";
        } else {
            let selectionRenderedUl = tr.cells[2].querySelector("ul.select2-selection__rendered") as HTMLUListElement;
            value = [...selectionRenderedUl.querySelectorAll("li.select2-selection__choice") as NodeListOf<HTMLLIElement>].map(li => li.title).join(",");
        }
        return id + "_" + operator + "_" + value;
    });
    return criteria.join("_");
}

export function scrapeSelectedFieldIndexes() {
    let rows = document.querySelectorAll("#tbody_leerlingen_werklijst_velden > tr");
    return [...rows].map(row => {
        let cells = row.querySelectorAll("td");
        return cells[1].textContent.trim();
    });
}

export function hasWerklijstNoCriteria() {
    let rows = document.querySelectorAll("#tbody_leerlingen_werklijst_criteria > tr") as NodeListOf<HTMLTableRowElement>;
    let ids = [...rows].map(tr => tr.dataset.criterium_id);
    return ids.length === 2 && ["1", "2"].every(value => ids.includes(value));
}