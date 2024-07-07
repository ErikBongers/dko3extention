import { createValidId } from "../globals.js";
import { StudentInfo } from "../lessen/scrape.js";
export function scrapeStudent(tableDef, tr, collection) {
    let student = new StudentInfo();
    student.naam = tableDef.pageHandler.getColumnText(tr, "naam");
    student.voornaam = tableDef.pageHandler.getColumnText(tr, "voornaam");
    student.id = parseInt(tr.attributes['onclick'].value.replace("showView('leerlingen-leerling', '', 'id=", ""));
    let leraar = tableDef.pageHandler.getColumnText(tr, "klasleerkracht");
    let vak = tableDef.pageHandler.getColumnText(tr, "vak");
    let graadLeerjaar = tableDef.pageHandler.getColumnText(tr, "graad + leerjaar");
    if (leraar === "")
        leraar = "{nieuw}";
    if (!isInstrument(vak)) {
        console.error("vak is geen instrument!!!");
        return false;
    }
    let vakLeraarKey = translateVak(vak) + "_" + leraar;
    if (!collection.has(vakLeraarKey)) {
        let countMap = new Map();
        countMap.set("2.1", { count: 0, students: [] });
        countMap.set("2.2", { count: 0, students: [] });
        countMap.set("2.3", { count: 0, students: [] });
        countMap.set("2.4", { count: 0, students: [] });
        countMap.set("3.1", { count: 0, students: [] });
        countMap.set("3.2", { count: 0, students: [] });
        countMap.set("3.3", { count: 0, students: [] });
        countMap.set("4.1", { count: 0, students: [] });
        countMap.set("4.2", { count: 0, students: [] });
        countMap.set("4.3", { count: 0, students: [] });
        countMap.set("S.1", { count: 0, students: [] });
        countMap.set("S.2", { count: 0, students: [] });
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
        vakLeraar.countMap.set(graadLeerjaar, { count: 0, students: [] });
    }
    let graadLeraarObject = collection.get(vakLeraarKey).countMap.get(graadLeerjaar);
    graadLeraarObject.count += 1;
    graadLeraarObject.students.push(student);
    return true;
}
function isInstrument(vak) {
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
function translateVak(vak) {
    function renameInstrument(instrument) {
        return instrument
            .replace("Basklarinet", "Klarinet")
            .replace("Altfluit", "Dwarsfluit")
            .replace("Piccolo", "Dwarsfluit")
            .replace("Trompet", "Koper") //keept this one on top because of the next line!
            .replace("Koper (jazz pop rock)", "Trompet (jazz pop rock)")
            .replace("Hoorn", "Koper")
            .replace("Trombone", "Koper")
            .replace("Bugel", "Koper")
            .replace("Eufonium", "Koper")
            .replace("Altsaxofoon", "Saxofoon")
            .replace("Sopraansaxofoon", "Saxofoon")
            .replace("Tenorsaxofoon", "Saxofoon");
    }
    if (vak.includes("(jazz pop rock)")) {
        return "JPR " + renameInstrument(vak).replace("(jazz pop rock)", "");
    }
    if (vak.includes("musical")) {
        return "M " + renameInstrument(vak).replace("(musical)", "");
    }
    if (vak.includes("wereldmuziek")) {
        return "WM " + renameInstrument(vak).replace("(wereldmuziek)", "");
    }
    return "K " + renameInstrument(vak);
}
//# sourceMappingURL=scrapeUren.js.map