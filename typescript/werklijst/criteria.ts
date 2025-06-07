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

export const VELD = {
    DOMEIN:  {value: "domein", text: "domein"},
    VAK_NAAM: {value: "vak_naam", text: "vak"},
    GRAAD_LEERJAAR: {value: "graad_leerjaar", text: "graad + leerjaar"},
    KLAS_LEERKRACHT: {value: "klasleerkracht", text: "klasleerkracht"},
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

export class WerklijstCriteria {
    criteria: Criterium[] = [];
    private schoolYear: string;

    constructor(schoolYear: string) {
        this.schoolYear = schoolYear;
        this.criteria = [
            {"criteria": "Schooljaar", "operator": "=", "values": schoolYear},
            {"criteria": "Status", "operator": "=", "values": "12"}, //inschrijvingen en toewijzingen
            {"criteria": "Uitschrijvingen", "operator": "=", "values": "0"}, // Zonder uitgeschreven leerlingen
        ];
    }

    toCriteriaString() {
        return JSON.stringify(this.criteria);
    }

    #addCriterium(criteria: string, operator: Operator, values: string) {
        this.criteria.push({criteria, operator, values});
    }

    addDomeinen(domeinen: Domein[])  {
        this.#addCriterium("Domein", Operator.PLUS, domeinen.join());
    }

    async addVakken(vakken: string[]) {
        await this.addCodesForCriterium("Vak", vakken);
    }

    async addVakGroep(vakGroep: string) {
        await this.addCodesForCriterium("Vakgroep", [vakGroep]);
    }

    addVakCodes(vakken: string) {
        this.#addCriterium("Vak", Operator.PLUS, vakken);
    }

    async addCodesForCriterium(criterium: string, items: (string[] | IsSelectedItem)) {
        let defs = await fetchMultiSelectDefinitions(this.schoolYear, criterium, false);
        let codes = textToCodes(items, defs);
        if(codes.length)
            this.criteria.push({"criteria": criterium, "operator": "=", "values": codes.join()}); //todo: replace with addCriterium()
    }

    async fetchVakGroepDefinitions(clear: boolean) {
        return fetchMultiSelectDefinitions(this.schoolYear, "Vakgroep", clear);
    }

}

export async function fetchAvailableSubjects(schoolyear: string) {
    await sendAddCriterium(schoolyear, "Vak");
    let text = await fetchCritera(schoolyear);
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

export async function sendCriteria(criteria: WerklijstCriteria) {
    const formData = new FormData();

    let critString = JSON.stringify(criteria.criteria);
    formData.append("criteria", critString);
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

export async function sendFields(fields: { value: string, text: string }[]) {
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

function textToCodes(items: (string[] | IsSelectedItem), vakDefs: string[][]) {
    let filtered: string[][];
    if (typeof items === 'function') {
        let isIncluded = items;
        filtered = vakDefs.filter((vakDef) => isIncluded(vakDef[0]));
    } else {
        filtered = vakDefs.filter((vakDef) => (items as string[]).includes(vakDef[0]));
    }
    return filtered.map(vakDefe => parseInt(vakDefe[1]));
}
