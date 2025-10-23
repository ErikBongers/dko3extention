import * as def from "../def";
import {Criterium, CriteriumName, Domein, fetchTableRows, Grouping, IsSelectedItem, Operator, postNameValueList, Veld} from "../werklijst/criteria";
import {getTable, getWerklijstTableRef} from "./loadAnyTable";
import {getImmediateText} from "../globals";
import {FetchedTable} from "./tableFetcher";

interface WerklijstItemDefinition {
    id: string;
    name: string;
}

export interface PreparedWerklijst {
    fetchTable(): Promise<FetchedTable>;
}

export interface CriteriaBuilder {
    addCriterium(name: CriteriumName, operator: Operator, values: string[]): void;
    addFields(fields: Veld[]): void;
    sendSettings(): Promise<PreparedWerklijst>;
    fetchAvailableSubjects(): Promise<{name: string, value: string}[]>;
}

export class WerklijstBuilder {
    private readonly schoolYear: string;
    private grouping: Grouping;
    criteria: Criterium[] = [];
    fields: Veld[];
    private criteriaDefs: WerklijstItemDefinition[];
    private fieldDefs: WerklijstItemDefinition[];

    private constructor(schoolYear: string, grouping: Grouping, criteriaDefs: WerklijstItemDefinition[], fieldDefs: WerklijstItemDefinition[]) {
        this.schoolYear = schoolYear;
        this.grouping = grouping;
        this.criteria = [];
        this.fields = [];
        this.criteriaDefs = criteriaDefs;
        this.fieldDefs = fieldDefs;
    }

    static async fetch(schoolYear: string, grouping: Grouping) {
        await WerklijstBuilder.resetWerklijst(schoolYear, grouping);
        let critDefs = await this.fetchCriteriumDefinitions();
        let fieldDefs = await this.fetchFieldDefinitions();
        return new WerklijstBuilder(schoolYear, grouping, critDefs, fieldDefs) as CriteriaBuilder;
    }

    static async resetWerklijst(schoolYear: string, grouping: Grouping) { //todo: make this the constructor or a static create method that returs the Builder.
        await fetch("view.php?args=leerlingen-werklijst");
        await fetch("views/leerlingen/werklijst/index.view.php"); //get header block (schooljaar, 1 lijn per..., criteria, velden)

        await postNameValueList("/views/leerlingen/werklijst/session.opslaan.php", [{name:"reset", value:"1"}]);

        await postNameValueList("/views/leerlingen/werklijst/session.opslaan.php", [{name:"schooljaar", value:schoolYear}, {name:"groepering", value:grouping}]);
    }

    static async fetchFieldDefinitions() {
        let daFetch = await fetch("/views/leerlingen/werklijst/velden/toevoegen/velden.results.php");
        let rows = await fetchTableRows(daFetch);
        let defs: { id: string; name: string }[] = [];
        for (let row of rows) {
            let id = row.dataset.veld_id;
            if(id) {
                let col = row.querySelector("td:nth-child(2)") as HTMLElement;
                let name = getImmediateText(col).trim();
                defs.push({id, name});
            }
        }
        return defs;
    }

    private static async fetchCriteriumDefinitions() {
        let rows = await fetchTableRows(await fetch("/views/leerlingen/werklijst/criteria/toevoegen/criteria.results.php"));
        let defs: { id: string; name: string }[] = [];
        for (let row of rows) {
            let id = row.dataset.criterium_id;
            if(id) {
                let col = row.querySelector("td");
                let name = getImmediateText(col).trim();
                defs.push({id, name});
            }
        }
        return defs;
    }



    async sendCriteria() {
        for (const c of this.criteria) {
            let codes = await this.addCodesForCriterium(c.name, c.values);
            //todo: send operator
            await postNameValueList("/views/leerlingen/werklijst/criteria/wijzigen.opslaan.php", [
                {name: "criterium_id", value: codes.postId},
                {name: "value", value: codes.values.join()}
            ]);
        }
    }

    async sendSettings() {
        await this.sendFields(this.fields);
        await this.sendCriteria();
        return this as PreparedWerklijst;
    }

    async fetchTable() {
        let tableRef = await getWerklijstTableRef();
        return getTable(tableRef, undefined, true);
        //todo: keep state of builder: table fetched.
    }

    toCriteriaString() {
        return JSON.stringify(this.criteria);
    }

    addCriterium(name: CriteriumName, operator: Operator, values: string[]) {
        this.criteria.push({name, operator, values});
    }

    addFields(fields: Veld[]) {
        this.fields.push(...fields);
    }

    private async addCodesForCriterium(criterium: CriteriumName, items: (string[] | IsSelectedItem)) {
        let defs = await this.fetchMultiSelectDefinitions(criterium);
        let codes = textToCodes(items, defs.defs);
        return {postId: defs.postId, operator: "TDOO", values: codes};
    }

    async fetchAvailableSubjects() {
        let defs = await this.fetchMultiSelectDefinitions(CriteriumName.Vak);
        debugger;
        return Array.from(defs.defs).map((vak) => {  return {name: vak[0], value: vak[1]}; });
    }

    async fetchVakGroepDefinitions() {
        return this.fetchMultiSelectDefinitions(CriteriumName.Vakgroep);
    }

    async fetchMultiSelectDefinitions(criterium: CriteriumName) {
        let critId = this.criteriaDefs.find(c => c.name === criterium).id;
        await postNameValueList("/views/leerlingen/werklijst/criteria/toevoegen/toevoegen.opslaan.php", [{name:"criterium_id", value:critId}]);
        let text = await fetch("/views/leerlingen/werklijst/criteria/criteria.div.php").then(res => res.text());
        const template = document.createElement('template');
        template.innerHTML = text;
        let tr = template.content.querySelector(`tr[data-criterium_id="${critId}"]`);
        let select = tr.querySelector(`td:nth-child(3) select`) as HTMLSelectElement;
        let defs = select.querySelectorAll(`option`);
        return {
            postId: select.dataset.postId,
            defs: Array.from(defs).map((def: HTMLOptionElement) => [def.label, def.value]),
        };
    }

    async sendFields(fields: Veld[]) {
        for (let field of fields) {
            let fieldDef = this.fieldDefs.find(f => f.name === field.text);
            if (fieldDef) {
                await postNameValueList("/views/leerlingen/werklijst/velden/toevoegen/wijzigen.opslaan.php", [{name:"veld_id", value:fieldDef.id}, {name:"selected", value:"1"}]);
            }
        }
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

