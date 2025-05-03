import {createValidId} from "../globals";
import {getColumnText, NamedCellTableFetchListener} from "../pageHandlers";
import {TeacherHoursSetupMapped} from "./hoursSettings";
import {FetchedTable} from "../table/tableFetcher";

export interface CountStudentsPerJaar {
    count: number,
    students: StudentUrenRow[]
}
export interface VakLeraar {
    vak: string,
    leraar: string,
    id: string,
    countMap: Map<string, CountStudentsPerJaar>
}

export interface StudentUrenRow {
    naam: string,
    voornaam: string,
    id: number,
    leraar: string,
    vak: string,
    graadLeerjaar: string
}

export function scrapeStudent(headerIndices: Map<string, number>, tr: HTMLTableRowElement): StudentUrenRow {
    let naam = getColumnText(tr, headerIndices, "naam");
    let voornaam = getColumnText(tr, headerIndices, "voornaam");
    let id = parseInt(tr.attributes['onclick'].value.replace("showView('leerlingen-leerling', '', 'id=", ""));
    let leraar = getColumnText(tr, headerIndices, "klasleerkracht");
    let vak = getColumnText(tr, headerIndices, "vak");
    let graadLeerjaar = getColumnText(tr, headerIndices, "graad + leerjaar");

    if (leraar === "") leraar = "{nieuw}";
    return {
        naam,
        voornaam,
        id,
        leraar,
        vak,
        graadLeerjaar
    };
}

export function addStudentToVakLeraarsMap(studentRow: StudentUrenRow, vakLeraars: Map<string, VakLeraar>, hourSettings: TeacherHoursSetupMapped) {
    let vakLeraarKey = translateVak(studentRow.vak, hourSettings) + "_" + studentRow.leraar;

    if (!vakLeraars.has(vakLeraarKey)) {
        let countMap: Map<string, CountStudentsPerJaar> = new Map();
        countMap.set("2.1", {count: 0, students: []});
        countMap.set("2.2", {count: 0, students: []});
        countMap.set("2.3", {count: 0, students: []});
        countMap.set("2.4", {count: 0, students: []});
        countMap.set("3.1", {count: 0, students: []});
        countMap.set("3.2", {count: 0, students: []});
        countMap.set("3.3", {count: 0, students: []});
        countMap.set("4.1", {count: 0, students: []});
        countMap.set("4.2", {count: 0, students: []});
        countMap.set("4.3", {count: 0, students: []});
        countMap.set("S.1", {count: 0, students: []});
        countMap.set("S.2", {count: 0, students: []});
        let vakLeraarObject: VakLeraar = {
            vak: translateVak(studentRow.vak, hourSettings),
            leraar: studentRow.leraar,
            id: createValidId(vakLeraarKey),
            countMap: countMap
        };
        vakLeraars.set(vakLeraarKey, vakLeraarObject);
    }
    let vakLeraar = vakLeraars.get(vakLeraarKey);
    if (!vakLeraar.countMap.has(studentRow.graadLeerjaar)) {
        vakLeraar.countMap.set(studentRow.graadLeerjaar, {count: 0, students: []});
    }
    let graadLeraarObject = vakLeraars.get(vakLeraarKey).countMap.get(studentRow.graadLeerjaar);
    graadLeraarObject.count += 1;
    graadLeraarObject.students.push(studentRow);
}

function translateVak(vak: string, settings: TeacherHoursSetupMapped) {
    // simple alias replacements
    let alias  =  settings.subjectsMap.get(vak)?.alias;
    if(alias)
        vak =  alias;

    // fragment replacements
    settings.translations
        .forEach(translation => {
            if(translation.find) {
                if (vak.includes(translation.find)) {
                    vak = translation.prefix + vak.replace(translation.find, translation.replace) + translation.suffix;
                }
            }
            else
                vak = translation.prefix + vak + translation.suffix;
        });
    return vak;
}

export function scrapeUren(rows: NodeListOf<HTMLTableRowElement>, headerIndices: Map<string, number>) {
    return [...rows].map(tr => scrapeStudent(headerIndices, tr));
}