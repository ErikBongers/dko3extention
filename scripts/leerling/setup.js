import {db3, observeElement} from "../globals.js";

const observerCallback = (mutationList /*, observer*/) => {
    for (const mutation of mutationList) {
        if (mutation.type !== "childList") {
            continue;
        }
        // db3(mutation);
        let tabInschrijving = document.getElementById("leerling_inschrijvingen_weergave");
        if (mutation.target === tabInschrijving) {
            onInschrijvingChanged(tabInschrijving);
            break;
        }
        if (mutation.target.id.includes("_uitleningen_table")){
            onUitleningenChanged(mutation.target);
            break;
        }
    }
};

const bodyObserver  = new MutationObserver(observerCallback);

export function onPageChanged() {
    if (window.location.hash.startsWith("#leerlingen-leerling")) {
        db3("In leerling fiche!");
        observeElement(bodyObserver, document.querySelector("main"));
    } else {
        db3("Niet in leerling fiche.");
        bodyObserver.disconnect();
    }
}

function onUitleningenChanged(tableUitleningen) {
    db3("UITLENING");
    let firstCells = tableUitleningen.querySelectorAll("tbody > tr > td:first-child");
    for(let cell of firstCells) {
        if (cell.classList.contains("text-muted")) {
            break;//empty table with fake row.
        }
        let anchor = document.createElement("a");
        anchor.innerText = cell.innerText;
        anchor.setAttribute("href", "/#extra-assets-uitleningen-uitlening?id="+anchor.innerText);
        cell.textContent = "";
        cell.appendChild(anchor);
    }
}

function onInschrijvingChanged(tabInschrijving) {
    db3("inschrijving (tab) changed.");

    //gray out button "Inschrijvingen" if last year selected.
    let selectedYear = document.querySelector("select#leerling_inschrijvingen_schooljaar")?.value;
    let now = new Date();
    let month = now.getMonth();
    let registrationSchoolYearStart = now.getFullYear();
    if(month <= 3) {
        registrationSchoolYearStart--;
    }
    let registrationSchoolYear = registrationSchoolYearStart + "-" + (registrationSchoolYearStart+1);
    if(selectedYear === registrationSchoolYear) {
        tabInschrijving.parentElement.classList.remove("lastYear");
    } else {
        tabInschrijving.parentElement.classList.add("lastYear");

    }

    //Show trimester instruments.
    let moduleButtons = tabInschrijving.querySelectorAll("tr td.right_center > button");
    for(let btn of moduleButtons) {
        let onClick = btn.getAttribute("onclick");
        let tr = btn.parentNode.parentNode;
        onClick = onClick.substring(10, onClick.length- 1);
        let args = onClick
            .split(", ")
            .map((arg) => arg.replaceAll("'", ""));
        getModules(...args)
            .then((modNames) => {
                let instrumentText = "";
                if(modNames.length) {
                    tr.children[0].innerText += ": ";
                    let rx = /Initiatie (.*) - trimester.*/;
                    instrumentText += modNames
                        .map(modName => {
                            let matches = modName.match(rx);
                            if (matches.length >= 1) {
                                return matches[1];
                            } else {
                                return ": ???";
                            }
                        })
                        .join(", ");
                }
                let span = document.createElement("span");
                tr.children[0].appendChild(span);
                if(modNames.length > 1) {
                    span.classList.add("badge-warning");
                }
                span.innerText = instrumentText;
            });
    }

    // stripes for classical classes that are not assigned yet.
    let classRows= document.querySelectorAll("#leerling_inschrijvingen_weergave tr");
    let classCells = Array.from(classRows)
        .filter(row => row.querySelector(".table-info") !== null)
        .map(row => row.children.item(row.children.length-2));

    for (let td of classCells) {
        let classDate = td.querySelector("span.text-muted");
        if (!classDate)
            continue;
        if(classDate.textContent === "(geen lesmomenten)")
            continue;
        for(let tdd of td.parentElement.children) {
            if(tdd.classList.contains("table-info")) {
                tdd.classList.add("runningStripes");
            }
        }
    }

}

async function getModules(size,modal,file,args) {
    let folder = modal.split("-").join("/");

    // This call is being skipped: (probably ok)
    // let res = await fetch('views/'+folder+'/'+file+'.modal.php?'+args);
    // let text = await res.text();

    // This call uses the `args` param, although that contains an extra schooljaar paran which is not really needed.
    // > 'inschrijving_vak_id=289840&schooljaar=2024-2025&lesmoment_id=4102'
    // let lesmoment_id = args.substring(args.lastIndexOf("=")+1);
    // let res2 = await fetch("/views/leerlingen/leerling/inschrijvingen/modules_kiezen.modules.div.php?inschrijving_vak_id=289840&lesmoment_id=" + lesmoment_id);
    let res2 = await fetch("/views/leerlingen/leerling/inschrijvingen/modules_kiezen.modules.div.php?"+args);

    let text2 = await res2.text();
    const template = document.createElement('template');
    template.innerHTML = text2;
    let checks = template.content.querySelectorAll("i.fa-check-square");
    return Array.from(checks)
        .map(check => check.parentNode.parentNode.parentNode.querySelector("strong").textContent);
}

