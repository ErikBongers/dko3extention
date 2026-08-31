import {FetchChain} from "../table/fetchChain";
import * as def from "../def";
import {GradeYear} from "../roster_diff/calcDiff";
import {textsToYearGrades} from "../lessen/scrape";

export interface LesDetails {
    id: string;
    editableName: boolean;
    gradeYears: GradeYear[];
    vak: string;
    maxAantal: number;
    isIndividualLes: boolean;
}

export async function fetchLes(id: string): Promise<LesDetails> {
    let chain = new FetchChain();

    // await chain.fetch(def.DKO3_BASE_URL+"#" + hash);
    await chain.fetch("view.php?args=lessen-les?id=" + id);
    chain.findDocReadyLoadUrl();
    await chain.fetch(); //index.view.php
    let tab = "details";
    let lesDetails = await chain.fetch(`views/lessen/les/index.${tab}.tab.php`);
    let nameDiv = await chain.fetch("views/lessen/les/details/index.details.benaming.card.php");
    let rx = /vak:\s*<strong>(.*?)<\/strong>/g;
    let vakText = rx.exec(lesDetails)?.at(1);
    let vak = "";
    if(vakText)
        vak = vakText.trim();
    rx = /graden:\s*<strong>(.*?)<\/strong>/g;
    let gradeYearsText = rx.exec(lesDetails)?.at(1);
    let gradeYears: GradeYear[] = [];
    if (gradeYearsText)
        gradeYears = textsToYearGrades([gradeYearsText])
    let maxAantalDiv = await chain.fetch("views/lessen/les/details/index.details.maximum_aantal_leerlingen.card.php")
    rx = /\s*<strong>(.*?)<\/strong>/g;
    let maxAantalText = rx.exec(maxAantalDiv)?.at(1);
    let maxAantal = 0;
    if (maxAantalText) {
        maxAantal = parseInt(maxAantalText.trim());
    }
    return {
        id: id,
        editableName: nameDiv.includes("benaming_wijzigen"),
        gradeYears,
        vak,
        maxAantal,
        isIndividualLes: maxAantal == 0,
    };
}
