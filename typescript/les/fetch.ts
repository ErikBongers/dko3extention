import {FetchChain} from "../table/fetchChain";
import {textsToYearGrades} from "../lessen/scrape";
import {GradeYear} from "../gradeYear";

export interface LesDetails {
    id: string;
    name: string;
    editableName: boolean;
    gradeYears: GradeYear[];
    vak: string;
    aantal: number;
    maxAantal: number;
    isIndividualLes: boolean;
    lesMomenten: string[];
    vestiging: string;
    teachers: TeacherRole[];
}

interface TeacherRole {
    name: string;
    role: string;
    id: string;
}

export interface FetchLesOptions {
    teachers?: boolean;
    maxStudents?: boolean;
    locations?: boolean;
    name?: boolean;
    moments?: boolean;
    studentCount?: boolean;
}

export async function fetchLes(id: string, signal?: AbortSignal, options?: FetchLesOptions): Promise<LesDetails> {
    if(!options)
        options = {
            teachers: true,
            maxStudents: true,
            locations: true,
            name: true,
            moments: true,
            studentCount: true
        };
    let defaultOptions: FetchLesOptions = {
        teachers: false,
        maxStudents: false,
        locations: false,
        name: false,
        moments: false,
        studentCount: false
    };
    options = {...defaultOptions, ...options};
    let chain = new FetchChain();
    await chain.fetch("view.php?args=lessen-les?id=" + id, signal);
    chain.findDocReadyLoadUrl();
    await chain.fetch(); //index.view.php
    let tab = "details";
    let lesDetails = await chain.fetch(`views/lessen/les/index.${tab}.tab.php`);

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

    let name = "";
    let editableName = false;
    if(options.name) {
        let nameDiv = await chain.fetch("views/lessen/les/details/index.details.benaming.card.php");
        name = "todo";
        editableName = nameDiv.includes("benaming_wijzigen");
    }

    let maxAantal = 0;
    if(options.maxStudents) {
        let maxAantalDiv = await chain.fetch("views/lessen/les/details/index.details.maximum_aantal_leerlingen.card.php")
        rx = /\s*<strong>(.*?)<\/strong>/g;
        let maxAantalText = rx.exec(maxAantalDiv)?.at(1);
        if (maxAantalText) {
            maxAantal = parseInt(maxAantalText.trim());
        }
    }

    let vestiging = "";
    if(options.locations) {
        let vestigingDiv = await chain.fetch("/views/lessen/les/details/index.details.vestigingsplaats.card.php")
        vestigingDiv = vestigingDiv.replaceAll("<br>", "")
        rx = /vestigingsplaats:\s*<strong>(.*?)<\/strong>/g;
        let vestigingText = rx.exec(vestigingDiv)?.at(1);
        vestiging = vestigingText??"";
    }

    let teachers: TeacherRole[] = [];
    if(options.teachers) {
        let teachersDivText = await chain.fetch("views/lessen/les/details/index.details.leerkrachten.card.php");
        let tempDiv: HTMLDivElement = document.createElement("div");
        tempDiv.innerHTML = teachersDivText;
        for (let tr of tempDiv.querySelectorAll("tr:has(strong)")) {
            let name = tr.querySelector("strong")?.textContent.trim() ?? "";
            let role = tr.querySelector("small.text-muted")?.textContent.trim() ?? "";
            let linkText = tr.querySelector("a")?.href ?? "";
            let id = linkText.split("=").at(-1) ?? "";
            teachers.push({name, role, id});
        }
        console.log(teachers);
    }

    let lesMomenten: string[] = [];
    if(options.moments) {
        await chain.fetch("/views/lessen/les/index.lesmomenten.tab.php");
        let lesmomentenText = await chain.fetch("/views/lessen/les/lesmomenten/lesmomenten.card.php");
        rx = /<strong>(.*?)<\/strong>/g;
        let match;
        while (match = rx.exec(lesmomentenText)) {
            lesMomenten.push(match[1]);
        }
    }

    let aantallen: number[] = [0, 0];
    if(options.studentCount) {
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

        let params = new URLSearchParams();
        params.append("timestamp", timestamp);
        params.append("nu", "true");

        let leerlingenTableText = await chain.fetch(`/views/lessen/les/leerlingen/leerlingen.tabel.php?${params}`);
        rx = /<i>(.*?)<\/i>/g;
        let aantalText = rx.exec(leerlingenTableText)?.at(1)??"";
        aantallen = aantalText
            .replace(" van ", ",")
            .replace("leerlingen", "")
            .trim()
            .split(",")
            .map((x) => parseInt(x));
    }

    return {
        id,
        name,
        editableName,
        gradeYears,
        vak,
        maxAantal,
        isIndividualLes: maxAantal == 0,
        lesMomenten,
        aantal: aantallen[0],
        vestiging,
        teachers
    };
}
