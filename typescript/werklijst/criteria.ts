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

export const VELDEN = {
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

export type IsSelectedItem = (vak: string) => boolean;
export interface WerklijstCriteria {
    vakken: string[] | IsSelectedItem;
    vakGroepen: string[] | IsSelectedItem;
    domein:Domein[];
    velden: Veld[];
    grouping: Grouping;
}

export async function fetchVakDefinitions(clear: boolean) {
    return fetchMultiSelectDefinitions("Vak", clear);
}

export async function fetchVakGroepDefinitions(clear: boolean) {
    return fetchMultiSelectDefinitions("Vakgroep", clear);
}

export async function fetchMultiSelectDefinitions(criterium: string, clear: boolean) {
    if (clear) {
        await sendClearWerklijst();
    }
    await sendAddCriterium("2024-2025", criterium);
    let text = await fetchCritera("2024-2025");
    const template = document.createElement('template');
    template.innerHTML = text;
    let defs = template.content.querySelectorAll("#form_field_leerling_werklijst_criterium_"+ criterium.toLowerCase() +" option");
    return Array.from(defs).map((def: HTMLOptionElement) => [def.label, def.value]);
}

export async function fetchCritera(schoolYear: string) {
    return (await fetch("https://administratie.dko3.cloud/views/leerlingen/werklijst/index.criteria.php?schooljaar=" + schoolYear, {
        method: "GET"
    })).text();
}

async function sendAddCriterium(schoolYear: string, criterium: string) {
    const formData = new FormData();
    formData.append(`criterium`, criterium);
    formData.append(`schooljaar`, schoolYear);
    await fetch("https://administratie.dko3.cloud/views/leerlingen/werklijst/index.criteria.session_add.php", {
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

export async function sendCriteria(criteria: object) {
    const formData = new FormData();

    formData.append("criteria", JSON.stringify(criteria));
    await fetch("/views/leerlingen/werklijst/index.criteria.session_reload.php", {
        method: "POST",
        body: formData,
    });
}

export async function sendGrouping(grouping: string) {
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

export async function setWerklijstCriteria(criteria: WerklijstCriteria) {
    await sendClearWerklijst();

    //DEFAULT CRITERIA
    let criteriaString = [
        {"criteria": "Schooljaar", "operator": "=", "values": "2024-2025"},
        {"criteria": "Status", "operator": "=", "values": "12"}, //inschrijvingen en toewijzingen
        {"criteria": "Uitschrijvingen", "operator": "=", "values": "0"}, // Zonder uitgeschreven leerlingen
    ];

    //DOMEIN
    if (criteria.domein.length) {
        criteriaString.push({"criteria": "Domein", "operator": "=", "values": criteria.domein.join()});
    }

    async function addCodesForCriterium(criterium: string, items: (string[] | IsSelectedItem)) {
        let defs = await fetchMultiSelectDefinitions(criterium, false);
        let codes = textToCodes(items, defs);
        if(codes.length)
            criteriaString.push({"criteria": criterium, "operator": "=", "values": codes.join()});
    }

    if (criteria.vakken) {
        await addCodesForCriterium("Vak", criteria.vakken);
    }
    if (criteria.vakGroepen) {
        await addCodesForCriterium("Vakgroep", criteria.vakGroepen);
    }

    await sendCriteria(criteriaString);
    await sendFields(criteria.velden);
    await sendGrouping(criteria.grouping);
}

