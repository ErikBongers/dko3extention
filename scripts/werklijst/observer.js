import {db3, HashObserver, options} from "../globals.js";
import * as def from "../lessen/def.js";

export default new HashObserver("#leerlingen-werklijst", onMutation);

function onMutation(mutation) {
    let werklijst = document.getElementById("div_table_werklijst");
    if (mutation.target === werklijst) {
        onWerklijstChanged(werklijst);
        return true;
    }
    let buttonBar = document.getElementById("tablenav_leerlingen_werklijst_top");
    if (mutation.target === buttonBar) {
        onButtonBarChanged(buttonBar);
        return true;
    }
    return false;
}

function onWerklijstChanged(tabWerklijst) {
}

function onButtonBarChanged(buttonBar) {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)");
    addButton(targetButton, def.FETCH_ALL_BUTTON_ID, "Toon trimesters", onClickFetchAll, "fa-guitar", ["btn-outline-info"]);
}

function addButton(targetButton, buttonId, title, clickFunction, imageId, classList) { //TODO: generalize this function.
    let button = document.getElementById(buttonId);
    if (button === null) {
        const button = document.createElement("button");
        button.classList.add("btn", "btn-sm"/*, "btn-outline-secondary", "w-100"*/, ...classList);
        button.id = buttonId;
        button.style.marginTop = "0";
        button.onclick = clickFunction;
        button.title = title;
        const buttonContent = document.createElement("i");
        button.appendChild(buttonContent);
        buttonContent.classList.add("fas", imageId);
        targetButton.insertAdjacentElement("beforebegin", button);
    }
}

function onClickFetchAll() {
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
                    alert("ni genoeg velde");
                    return;
                }

                let students = template.content.querySelectorAll("tbody > tr");
                for(let student of students) {
                    let leraar = student.children[headerIndices.leraar].textContent;
                    if (leraar === "") leraar = "---";
                    let keyString =
                        student.children[headerIndices.vak].textContent + "_" +
                        leraar + "_" +
                        student.children[headerIndices.graadLeerjaar].textContent
                    ;
                    if(!counters.has(keyString)) {
                        counters.set(keyString, { count: 0 });
                    }
                    counters.get(keyString).count += 1;
                }
                console.log("Counted " + students.length + " students.");
                console.log(counters);
            })
        });
}
