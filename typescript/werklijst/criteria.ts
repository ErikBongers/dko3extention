import * as def from "../def"

// noinspection JSUnusedGlobalSymbols
export enum Domein {
    Muziek = 3,
    Woord = 4,
    Dans = 2,
    Overschrijdend = 5
}

export interface Veld {
    value: string;
    text: string;
}

// noinspection JSUnusedGlobalSymbols
export enum Grouping {
    LEERLING = "persoon_id",
    VAK = "vak_id",
    LES = "les_id",
    INSCHRIJVING = "inschrijving_id",
}

export interface Criterium {
    criteria: string
    operator: string
    values: string
}

export enum Operator {
    PLUS = "="
}

export type IsSelectedItem = (vak: string) => boolean;

export async function fetchAvailableSubjects(schoolyear: string) {
    await sendAddCriterium(schoolyear, "Vak");
    let text = await fetchCritera(schoolyear);
    await sendClearWerklijst();  //todo:  try to restore the previous werklijst criteria.
    const template = document.createElement('template');
    template.innerHTML = text;
    let vakken = template.content.querySelectorAll("#form_field_leerling_werklijst_criterium_vak option");
    return Array.from(vakken).map((vak: HTMLOptionElement) => {  return {name: vak.label, value: vak.value}; });
}

export async function fetchCritera(schoolYear: string) {
    return (await fetch(def.DKO3_BASE_URL+"views/leerlingen/werklijst/index.criteria.php?schooljaar=" + schoolYear, {
        method: "GET"
    })).text();
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

export async function sendClearWerklijst() {
    const formData = new FormData();

    formData.append("session", "leerlingen_werklijst");

    await fetch("/views/util/clear_session.php", {
        method: "POST",
        body: formData,
    });

    //needed to prefill the default fields.
    await fetch("views/leerlingen/werklijst/index.velden.php", {
        method: "GET"
    });
}

export async function sendCriteria(criteria: string) {
    const formData = new FormData();

    formData.append("criteria", criteria);
    await fetch("/views/leerlingen/werklijst/index.criteria.session_reload.php", {
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

export async function sendFields(fields: Veld[]) {
    if (fields.length  ===  0)
        return;

    const formData = new FormData();

    let fieldCnt = 0;
    for (let field of fields) {
        formData.append(`velden[${fieldCnt}][value]`, field.value);
        formData.append(`velden[${fieldCnt}][text]`, field.text);
        fieldCnt++;
    }
    await fetch("/views/leerlingen/werklijst/index.velden.session_add.php", {
        method: "POST",
        body: formData,
    });
}

export async function fetchVakDefinitions(schoolYear: string, clear: boolean) {
    return fetchMultiSelectDefinitions(schoolYear,"Vak", clear);
}

export async function fetchVakGroepDefinitions(schoolYear: string, clear: boolean) {
    return fetchMultiSelectDefinitions(schoolYear, "Vakgroep", clear);
}

export async function fetchMultiSelectDefinitions(schoolYear: string, criterium: string, clear: boolean) {
    if (clear) {
        await sendClearWerklijst();
    }
    await sendAddCriterium(schoolYear, criterium);
    let text = await fetchCritera(schoolYear);
    const template = document.createElement('template');
    template.innerHTML = text;
    let defs = template.content.querySelectorAll("#form_field_leerling_werklijst_criterium_"+ criterium.toLowerCase() +" option");
    return Array.from(defs).map((def: HTMLOptionElement) => [def.label, def.value]);
}

