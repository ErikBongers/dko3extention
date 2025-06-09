import * as def from "../def";
import {Criterium, Domein, fetchMultiSelectDefinitions, Grouping, IsSelectedItem, Operator, sendClearWerklijst, sendCriteria, sendFields, sendGrouping, Veld} from "../werklijst/criteria";
import {getTable, getWerklijstTableRef} from "./loadAnyTable";
import {FetchedTable} from "./tableFetcher";

export const FIELD = {
    DOMEIN:  {value: "domein", text: "domein"},
    VAK_NAAM: {value: "vak_naam", text: "vak"},
    GRAAD_LEERJAAR: {value: "graad_leerjaar", text: "graad + leerjaar"},
    KLAS_LEERKRACHT: {value: "klasleerkracht", text: "klasleerkracht"},
    LESMOMENTEN: {value: "lesmomenten", text: "lesmomenten"},
}

export class WerklijstBuilder {
    private readonly schoolYear: string;
    criteria: Criterium[] = [];
    fields: Veld[];
    vakken: string[] = [];
    vakGroep: string;

    constructor(schoolYear: string) {
        this.schoolYear = schoolYear;
        this.criteria = [
            {"criteria": "Schooljaar", "operator": "=", "values": schoolYear},
            {"criteria": "Status", "operator": "=", "values": "12"}, //inschrijvingen en toewijzingen
            {"criteria": "Uitschrijvingen", "operator": "=", "values": "0"}, // Zonder uitgeschreven leerlingen
        ];
        this.fields = [];
    }

    async sendSettings(grouping: Grouping) {
        await sendClearWerklijst();
        if(this.vakken.length)
            await this.addCodesForCriterium("Vak", this.vakken);
        if(this.vakGroep)
            await this.addCodesForCriterium("Vakgroep", [this.vakGroep]);
        await sendCriteria(this.toCriteriaString());
        await sendGrouping(grouping); //mandatory!!!
        await sendFields(this.fields);
        //todo: keep state of builder: settings have been set. getTable() should not send it again or throw an error? Force sequence at compile time?
        // return PreparedWerklijst interface. Refactor WerklijstBuilder to be a Partial<FullBlownBuilder> that has no access to getTable() yet.
        // FullBlownBuilder: all functions
        // WerklijstBuilder: minus getTable()
        // PreparedWerklijst: only getTable()
    }

    async getTable(grouping: Grouping) {
        await fetch(def.DKO3_BASE_URL+"#leerlingen-werklijst"); //only once!
        await this.sendSettings(grouping);
        let tableRef = await getWerklijstTableRef();
        return getTable(tableRef, undefined, true);
        //todo: keep state of builder: table fetched.
    }

    toCriteriaString() {
        return JSON.stringify(this.criteria);
    }

    private addCriterium(criteria: string, operator: Operator, values: string) {
        this.criteria.push({criteria, operator, values});
    }

    addFields(fields: Veld[]) {
        this.fields.push(...fields);
    }

    addDomeinen(domeinen: Domein[])  {
        this.addCriterium("Domein", Operator.PLUS, domeinen.join());
    }

    addVakken(vakken: string[]) {
        this.vakken.push(...vakken);
    }

    async addVakGroep(vakGroep: string) {
        await this.addCodesForCriterium("Vakgroep", [vakGroep]);
    }

    addVakCodes(vakken: string) {
        this.addCriterium("Vak", Operator.PLUS, vakken);
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

