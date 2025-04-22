import {createValidId} from "../globals";
import {TableFetcher} from "../table/tableFetcher";
import {NamedCellTableFetchListener} from "../pageHandlers";
import {StudentInfo} from "../lessen/scrape";

export interface CountStudentsPerJaar {
    count: number,
    students: StudentInfo[]
}
export interface VakLeraar {
    vak: string,
    leraar: string,
    id: string,
    countMap: Map<string, CountStudentsPerJaar>
}

export function scrapeStudent(_tableDef: TableFetcher, fetchListener: NamedCellTableFetchListener, tr: HTMLTableRowElement, collection: any) {
    let student: StudentInfo = new StudentInfo();
    student.naam = fetchListener.getColumnText(tr, "naam");
    student.voornaam = fetchListener.getColumnText(tr,"voornaam");
    student.id = parseInt(tr.attributes['onclick'].value.replace("showView('leerlingen-leerling', '', 'id=", ""));
    let leraar = fetchListener.getColumnText(tr,"klasleerkracht");
    let vak = fetchListener.getColumnText(tr,"vak");
    let graadLeerjaar = fetchListener.getColumnText(tr,"graad + leerjaar");

    if (leraar === "") leraar = "{nieuw}";

    if (!isInstrument(vak)) {
        console.error("vak is geen instrument!!!");
        return `Vak "${vak}" is geen instrument.`;
    }
    let vakLeraarKey = translateVak(vak) + "_" + leraar;

    if (!collection.has(vakLeraarKey)) {
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
        let vakLeraarObject = {
            vak: translateVak(vak),
            leraar: leraar,
            id: createValidId(vakLeraarKey),
            countMap: countMap
        };
        collection.set(vakLeraarKey, vakLeraarObject);
    }
    let vakLeraar = collection.get(vakLeraarKey);
    if (!vakLeraar.countMap.has(graadLeerjaar)) {
        vakLeraar.countMap.set(graadLeerjaar, {count: 0, students: []});
    }
    let graadLeraarObject = collection.get(vakLeraarKey).countMap.get(graadLeerjaar);
    graadLeraarObject.count += 1;
    graadLeraarObject.students.push(student);
    return null;
}

function isInstrument(vak: string) {
    switch (vak) {
        case "Muziekatelier": 
        case "Groepsmusiceren (jazz pop rock)": 
        case "Groepsmusiceren (klassiek)": 
        case "Harmonielab": 
        case "Instrumentinitiatie - elke trimester een ander instrument": 
        case "instrumentinitiatie – piano het hele jaar": 
        case "Klanklab elektronische muziek": 
        case "Muziektheorie": 
        case "Koor (jazz pop rock)": 
        case "Koor (musical)": 
        case "Arrangeren": 
        case "Groepsmusiceren (opera)": 
            return false;
    }
    return true;
}

type SubjectAlias = {
    name: string,
    alias: string
}

let subjectAliases: SubjectAlias[] = [
    {name: "Basklarinet", alias: "Klarinet"},
    {name: "Altfluit", alias: "Dwarsfluit"},
    {name: "Piccolo", alias: "Dwarsfluit"},

    {name: "Trompet", alias: "Koper"},
    {name: "Hoorn", alias: "Koper"},
    {name: "Trombone", alias: "Koper"},
    {name: "Bugel", alias: "Koper"},
    {name: "Eufonium", alias: "Koper"},

    {name: "Altsaxofoon", alias: "Saxofoon"},
    {name: "Sopraansaxofoon", alias: "Saxofoon"},
    {name: "Tenorsaxofoon", alias: "Saxofoon"},
];

function translateVak(vak: string) {
    function renameInstrument(instrument: string) {
        return subjectAliases.find(alias => alias.name === instrument)?.alias ?? instrument;
    }

    if(vak.includes("(jazz pop rock)")) {
        return "JPR " + renameInstrument(vak).replace("(jazz pop rock)", "");
    }
    if(vak.includes("musical")) {
        return "M " + renameInstrument(vak).replace("(musical)", "");
    }
    if(vak.includes("wereldmuziek")) {
        return "WM " + renameInstrument(vak).replace("(wereldmuziek)", "");
    }

    return "K " + renameInstrument(vak);
}

type TranslationDef = {
    find: string,
    replace: string,
    prefix: string,
    suffix: string,
}

/*
fragment "(jazz pop rock)"  ==> vervang door "" ==>  nieuwe naam: prefix "JPR " + naam van instrument
fragment "(musical)"  ==> vervang door "" ==> nieuwe naam: prefix "M " + naam van instrument
fragment "(wereldmuziek)"  ==> vervang door "" ==> nieuwe naam: prefix "WM " + naam van instrument.
fragment "instrumentinitiatie" ==> vervang door "init" ==>

 */