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

export enum Grouping {
    LEERLING = "persoon_id",
    VAK = "vak_id",
    LES = "les_id",
    INSCHRIJVING = "inschrijving_id",
}

export type isSelectedVak = (vak: string) => boolean;
export interface WerklijstCriteria {
    vakken: string[] | isSelectedVak;
    domein:Domein[];
    velden: Veld[];
    grouping: Grouping;
}

export async function fetchVakken(clear: boolean) {
    if (clear) {
        await sendClearWerklijst();
    }
    await sendAddCriterium("2024-2025", "Vak");
    let text = await fetchCritera("2024-2025");
    const template = document.createElement('template');
    template.innerHTML = text;
    let vakken = template.content.querySelectorAll("#form_field_leerling_werklijst_criterium_vak option");
    return Array.from(vakken).map((vak: HTMLOptionElement) => [vak.label, vak.value]);
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

    //VAKKEN
    if (criteria.vakken) {
        let vakken = await fetchVakken(false);
        if (typeof criteria.vakken === 'function') {
            let isVak = criteria.vakken;
            let instruments = vakken.filter((vak) => isVak(vak[0]));
            let values = instruments.map(vak => parseInt(vak[1]));
            criteriaString.push({"criteria": "Vak", "operator": "=", "values": values.join()});
        }
    }

    await sendCriteria(criteriaString);
    await sendFields(criteria.velden);
    await sendGrouping(criteria.grouping);
}

