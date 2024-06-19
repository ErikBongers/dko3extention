export function fetchAll(doIt) {
    console.log("Fetching ALLLLLLL");
    let counters = new Map();
    fetch("/views/ui/datatable.php?id=leerlingen_werklijst&start=300&aantal=0")
        .then((res) => {
            res.text().then((text) => {
                // console.log(text);
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
                    alert("Voeg velden VAK, GRAAD+LEERJAAR en KLASLEERKRACHT toe.");
                    return;
                }

                let students = template.content.querySelectorAll("tbody > tr");
                for(let student of students) {
                    let vak = student.children[headerIndices.vak].textContent;
                    if (!isInstrument(vak)) 
                        continue;
                    let leraar = student.children[headerIndices.leraar].textContent;
                    if (leraar === "") leraar = "---";
                    let keyString =
                        translateVak(vak) + "_" +
                        leraar + "_" +
                        student.children[headerIndices.graadLeerjaar].textContent
                    ;
                    if(!counters.has(keyString)) {
                        counters.set(keyString, { count: 0 });
                    }
                    counters.get(keyString).count += 1;
                }
                console.log("Counted " + students.length + " students.");
                doIt(counters);
            })
        });
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
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
        case "Muziekatelier": 
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