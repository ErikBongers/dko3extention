import {LesType} from "../roster_diff/calcDiff";
import {FetchChain} from "../table/fetchChain";
import {DKO3_BASE_URL, LESSEN_TABLE_ID} from "../def";
import {fetchLessen} from "./observer";
import {scrapeLessenOverzicht} from "./scrape";
import {TokenScanner} from "../tokenScanner";

export enum LessenFilterDomein {Muziek = "3", Woord = "4", DomeinOV = "5", Dans = "2"}

export async function scrapeLessen(domein: LessenFilterDomein, type: LesType, schoolYear: string) {
    let chain = new FetchChain();
    let hash = "lessen-overzicht";
    await chain.fetch(DKO3_BASE_URL + "#lessen-overzicht" + hash);
    await chain.fetch("view.php?args=" + hash); // call to changeView() - assuming this is always the same, so no parsing here.
    let params = new URLSearchParams({
        schooljaar: schoolYear,
        domein,
        vestigingsplaats: "",
        vak: "",
        graad: "",
        leerkracht: "",
        ag: "",
        lesdag: "",
        verberg_online: "-1",
        soorten_lessen: type,
        volzet: "-1"
    });
    let tableText = await fetchLessen(params);
    let div = document.createElement("div");
    div.innerHTML = tableText;
    let table = div.querySelector("#" + LESSEN_TABLE_ID) as HTMLTableElement;
    return scrapeLessenOverzicht(table);
}

/*

Lessen filter:

https://administratie.dko3.cloud/view.php?args=lessen-overzicht
> document ready: https://administratie.dko3.cloud/views/lessen/overzicht/index.view.php
https://administratie.dko3.cloud/views/lessen/overzicht/filters/index.selectie_na_schooljaar.php?schooljaar=2026-2027
https://administratie.dko3.cloud/views/lessen/overzicht/filters/index.selectie_na_domein.php?domein=3
> content:
  <select class="select2  " id="lessen_overzicht_vestigingsplaats" data-post-id="vestigingsplaats" multiple='multiple'>
        <option value="417">Academie Willem Van ...
        ...
  </select>
  ...
  <select class="select2  " id="lessen_overzicht_vak" data-post-id="vak" multiple='multiple'>
        <option value="995">Arrangeren
  <select class="select2  " id="lessen_overzicht_graad" data-post-id="graad" multiple='multiple'>
        <option value="08">1e graad (1.*)</option>
        <option value="09">2e graad (2.*)</option>
        <option value="10">3e graad (3.*)</option>
        <option value="11">4e graad (4.*)</option>
        <option value="SG">specialisatie (S.*)</option>
        <option value="08_1">1.1</option>
  <select class="select2  " id="lessen_overzicht_ag" data-post-id="ag" multiple='multiple'>
        <option value="2479">39693 - MU 1voTG3 muziek</option>
  <select class="select2  " id="lessen_overzicht_leerkracht" data-post-id="leerkracht" multiple='multiple'>
        <option value="8389">Bavin, Jeroen</option>
  <div class="form-group ">
    <select class="select2  " id="lessen_overzicht_lesdag" data-post-id="lesdag" multiple='multiple'>
        <option value="1">maandag</option>
 */

export type DomeinString = "Muziek" | "Woord" | "DomeinOV" | "Dans";
export interface CriteriaCode {
    code: string;
    name: string;
}

export class LessenFilterBuilder {
    private readonly schoolYear: string;
    private readonly domein: LessenFilterDomein;
    private vakCodes: CriteriaCode[] = [];
    private graadCodes: CriteriaCode[] = [];
    private vakken: string[] = [];
    private graden: string[] = [];

    private constructor(schoolYear: string, domein: DomeinString) {
        this.schoolYear = schoolYear;
        this.domein = LessenFilterDomein[domein];
    }

    static async create(schoolYear: string, domein: DomeinString) {
        let builder = new LessenFilterBuilder(schoolYear, domein);
        await builder.initialize();
        return builder;
    }

    async initialize() {
        let chain = new FetchChain();
        await chain.fetch("view.php?args=lessen-overzicht");
        chain.findDocReadyLoadUrl();
        await chain.fetch();
        await chain.fetch(`views/lessen/overzicht/filters/index.selectie_na_schooljaar.php?schooljaar=${this.schoolYear}`);
        await chain.fetch(`views/lessen/overzicht/filters/index.selectie_na_domein.php?domein=${this.domein}`);
        this.vakCodes = this.getCodesForCriteria("lessen_overzicht_vak", chain.get()!); //! should have text.
        this.graadCodes = this.getCodesForCriteria("lessen_overzicht_graad", chain.get()!); //! should have text.
    }

    private getCodesForCriteria(selectId: string, text: string): CriteriaCode[] {
        let scanner = new TokenScanner(text);
        //find id="...id..."
        scanner.find(`"${selectId}"`);
        scanner.find("<option");
        scanner.clipTo("</select>");
        let rawOptions = scanner.result();
        // console.log(text);
        let options = rawOptions?.split("</option>")
            .map(opt => opt
                .replace("<option", "")
                .replace("value=\"", "")
                .trim()
                .split(/"\s*>/)
            )??[];
        return options.map(opt => {
            return { code: opt[0], name: opt[1] }
        });
    }

    async fetch() {
        let chain = new FetchChain();
        let params = new URLSearchParams({
            schooljaar: this.schoolYear,
            domein: this.domein,
            vestigingsplaats: "",
            vak: this.vakken.join(),
            graad: this.graden.join(),
            leerkracht: "",
            ag: "",
            lesdag: "",
            verberg_online: "-1",
            soorten_lessen: "1", //todo: hard coded "gewone lessen"
            volzet: "-1"
        });
        let tableText = await fetchLessen(params);
        let div = document.createElement("div");
        div.innerHTML = tableText;
        let table = div.querySelector("#" + LESSEN_TABLE_ID) as HTMLTableElement;
        return scrapeLessenOverzicht(table);
    }

    addVak(vak: string) {
        let vakCode = this.vakCodes.find(v => v.name === vak);
        if (!vakCode) {
            console.error("vak not found: " + vak);
            return;
        }
        this.vakken.push(vakCode.code);

    }

    addGraad(graad: string) {
        let graadCode = this.graadCodes.find(v => v.name === graad);
        if (!graadCode) {
            console.error("graad not found: " + graad);
            return;
        }
        this.graden.push(graadCode.code);
    }
}
