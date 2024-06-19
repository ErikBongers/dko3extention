export async function fetchAll() {
    let vakLeraars = new Map();
    let offset = 0;
    while(true) {
        console.log("fetching page " + offset);
        let response = await fetch("/views/ui/datatable.php?id=leerlingen_werklijst&start="+offset+"&aantal=0");
        let text = await response.text();
        let count = extractStudents(text, vakLeraars);
        if(count < 100)
            break;
        offset+= 100;
    }
    return vakLeraars;
}

function extractStudents(text, vakLeraars) {
    const template = document.createElement('template');
    template.innerHTML = text;
    let headers = template.content.querySelectorAll("thead th");

    let headerIndices = { vak: -1, graadLeerjaar: -1, leraar: -1 };
    for(let i = 0; i < headers.length ; i++) {
        switch (headers[i].textContent) {
            case "vak": headerIndices.vak = i; break;
            case "graad + leerjaar": headerIndices.graadLeerjaar = i; break;
            case "klasleerkracht": headerIndices.leraar = i; break;
        }
    }
    if(headerIndices.vak === -1 || headerIndices.leraar === -1 || headerIndices.graadLeerjaar === -1) {
        alert("Voeg velden VAK, GRAAD_LEERJAAR en KLASLEERKRACHT toe.");
        return;
    }

    let students = template.content.querySelectorAll("tbody > tr");
    for(let student of students) {
        let leraar = student.children[headerIndices.leraar].textContent;
        let graadLeerjaar = student.children[headerIndices.graadLeerjaar].textContent;
        if (leraar === "") leraar = "{nieuw}";

        let vak = student.children[headerIndices.vak].textContent;

        if (!isInstrument(vak)) {
            console.log("VAK is geen instrument!!!");
            continue;
        }
        let vakLeraarKey = translateVak(vak) + "_" + leraar;

        if(!vakLeraars.has(vakLeraarKey)) {
            let countMap = new Map();
            countMap.set("2.1", {count:0});
            countMap.set("2.2", {count:0});
            countMap.set("2.3", {count:0});
            countMap.set("2.4", {count:0});
            countMap.set("3.1", {count:0});
            countMap.set("3.2", {count:0});
            countMap.set("3.3", {count:0});
            countMap.set("4.1", {count:0});
            countMap.set("4.2", {count:0});
            countMap.set("4.3", {count:0});
            countMap.set("S.1", {count:0});
            countMap.set("S.2", {count:0});
            vakLeraars.set(vakLeraarKey, countMap);
        }
        let vakLeraar = vakLeraars.get(vakLeraarKey);
        if(!vakLeraar.has(graadLeerjaar)) {
            vakLeraar.set(graadLeerjaar, {count: 0});
        }
        vakLeraars.get(vakLeraarKey).get(graadLeerjaar).count += 1;
    }
    console.log("Counted " + students.length + " students.");
    console.log(vakLeraars);
    return students.length;
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
    if(vak.includes("(jazz pop rock)")) {
        return "JPR " + vak.replace("(jazz pop rock)", "");
    }
    if(vak.includes("musical")) {
        return "M " + vak.replace("(musical)", "");
    }

    return "K " + vak;
}