import {createValidId} from "../globals.js";

export function extractStudents(text, vakLeraars) {
    const template = document.createElement('template');
    template.innerHTML = text;
    let headers = template.content.querySelectorAll("thead th");

    let headerIndices = { naam: -1, voornaam: -1, vak: -1, graadLeerjaar: -1, leraar: -1 };
    for(let i = 0; i < headers.length ; i++) {
        switch (headers[i].textContent) {
            case "naam": headerIndices.naam = i; break;
            case "voornaam": headerIndices.voornaam = i; break;
            case "vak": headerIndices.vak = i; break;
            case "graad + leerjaar": headerIndices.graadLeerjaar = i; break;
            case "klasleerkracht": headerIndices.leraar = i; break;
        }
    }
    if(headerIndices.vak === -1 || headerIndices.leraar === -1 || headerIndices.graadLeerjaar === -1) {
        alert("Voeg velden NAAM, VOORNAAM, VAK, GRAAD_LEERJAAR en KLASLEERKRACHT toe.");
        return;
    }

    let students = template.content.querySelectorAll("tbody > tr");
    for(let trStudent of students) {
        let student = {};
        student.naam = trStudent.children[headerIndices.naam].textContent;
        student.voornaam = trStudent.children[headerIndices.voornaam].textContent;
        student.id = parseInt(trStudent.attributes['onclick'].value.replace("showView('leerlingen-leerling', '', 'id=", ""));
        let leraar = trStudent.children[headerIndices.leraar].textContent;
        let graadLeerjaar = trStudent.children[headerIndices.graadLeerjaar].textContent;
        if (leraar === "") leraar = "{nieuw}";

        let vak = trStudent.children[headerIndices.vak].textContent;

        if (!isInstrument(vak)) {
            console.log("VAK is geen instrument!!!");
            continue;
        }
        let vakLeraarKey = translateVak(vak) + "_" + leraar;

        if(!vakLeraars.has(vakLeraarKey)) {
            let countMap = new Map();
            countMap.set("2.1", {count:0, students: []});
            countMap.set("2.2", {count:0, students: []});
            countMap.set("2.3", {count:0, students: []});
            countMap.set("2.4", {count:0, students: []});
            countMap.set("3.1", {count:0, students: []});
            countMap.set("3.2", {count:0, students: []});
            countMap.set("3.3", {count:0, students: []});
            countMap.set("4.1", {count:0, students: []});
            countMap.set("4.2", {count:0, students: []});
            countMap.set("4.3", {count:0, students: []});
            countMap.set("S.1", {count:0, students: []});
            countMap.set("S.2", {count:0, students: []});
            let vakLeraarObject = {
               vak: translateVak(vak),
               leraar: leraar,
               id: createValidId(vakLeraarKey),
               countMap: countMap
            };
            vakLeraars.set(vakLeraarKey, vakLeraarObject);
        }
        let vakLeraar = vakLeraars.get(vakLeraarKey);
        if(!vakLeraar.countMap.has(graadLeerjaar)) {
            vakLeraar.countMap.set(graadLeerjaar, {count: 0, students: []});
        }
        let graadLeraarObject = vakLeraars.get(vakLeraarKey).countMap.get(graadLeerjaar);
        graadLeraarObject.count += 1;
        graadLeraarObject.students.push(student);
    }
    return students.length;
}

function isInstrument(vak) {//TODO: get rid of this
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