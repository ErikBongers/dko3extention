import {FetchChain} from "../table/fetchChain";
import * as def from "../def";
import {GradeYear} from "../roster_diff/calcDiff";
import {textsToYearGrades} from "../lessen/scrape";

export interface LesDetails {
    id: string;
    editableName: boolean;
    gradeYears: GradeYear[];
    vak: string;
    aantal: number;
    maxAantal: number;
    isIndividualLes: boolean;
    lesMomenten: string[];
    vestiging: string;
}

export async function fetchLes(id: string, signal?: AbortSignal): Promise<LesDetails> {
    let chain = new FetchChain();
    await chain.fetch("view.php?args=lessen-les?id=" + id, signal);
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
    let vestigingDiv = await chain.fetch("/views/lessen/les/details/index.details.vestigingsplaats.card.php")
    vestigingDiv = vestigingDiv.replaceAll("<br>", "")
    rx = /vestigingsplaats:\s*<strong>(.*?)<\/strong>/g;
    let vestigingText = rx.exec(vestigingDiv)?.at(1);
    let vestiging = vestigingText??"";

    await chain.fetch("/views/lessen/les/index.lesmomenten.tab.php");
    let lesmomentenText = await chain.fetch("/views/lessen/les/lesmomenten/lesmomenten.card.php");
    rx = /<strong>(.*?)<\/strong>/g;
    let lesMomenten: string[] = [];
    let match;
    while(match = rx.exec(lesmomentenText)) {
        lesMomenten.push(match[1]);
    }

    await chain.fetch("/views/lessen/les/index.leerlingen.tab.php");
    await chain.fetch("/views/lessen/les/leerlingen/leerlingen.toolbar.php");
    const now = new Date();

    //use swedish formatting "2026-09-08 12:29:59"
    const timestamp = new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    })
        .format(now)
        .replace(' ', ' ');

    console.log(timestamp);

    //use URLparams to add params
    let params = new URLSearchParams();
    params.append("timestamp", timestamp);
    params.append("nu", "true");

    let leerlingenTableText = await chain.fetch(`/views/lessen/les/leerlingen/leerlingen.tabel.php?${params}`);
    rx = /<i>(.*?)<\/i>/g;
    let aantalText = rx.exec(leerlingenTableText)?.at(1)??"";
    let aantallen = aantalText
        .replace(" van ", ",")
        .replace("leerlingen", "")
        .trim()
        .split(",");

    return {
        id: id,
        editableName: nameDiv.includes("benaming_wijzigen"),
        gradeYears,
        vak,
        maxAantal,
        isIndividualLes: maxAantal == 0,
        lesMomenten,
        aantal: parseInt(aantallen[0]),
        vestiging,
    };
}
