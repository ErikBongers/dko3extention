import {ExactHashObserver} from "../pageObserver";
import {fetchStudentsSearch, setViewFromCurrentUrl} from "../globals";

export default new ExactHashObserver("#extra-tickets?h=afwezigheden", onMutation, true);

function onMutation (mutation: MutationRecord) {
    if (mutation.target === document.getElementById("ticket_payload")){
        // noinspection JSIgnoredPromiseFromCall
        onTicket();
        return true;
    }
    if (mutation.target === document.getElementById("dko3_modal_contents")){
        onAddMelding();
        return true;
    }

    if (mutation.target === document.getElementById("div_tickets_afwezigheid_toevoegen_leerling")
        && mutation.addedNodes.length > 0) {
        setTimeout(gotoVolgende, 10); //wait for document.ready
        return true;
    }

    return false;
}

function gotoVolgende() {
    let table = document.querySelector("#div_tickets_afwezigheid_toevoegen_leerling table") as HTMLTableElement;
    let tableHasOneStudent = table.querySelectorAll("i.fa-square").length === 1;
    if(tableHasOneStudent) {
        let tr = document.querySelector(".tr-ticket-afwezigheidsmelding-leerling") as HTMLTableRowElement;
        tr.click();
        document.getElementById("btn_opslaan_tickets_afwezigheid_toevoegen").click();
    }
}

function onAddMelding() {
    let leerlingLabel = document.querySelector("#form_field_tickets_afwezigheid_toevoegen_leerling_zoeken > label") as HTMLLabelElement;
    if(leerlingLabel && !leerlingLabel.dataset.filled) {
        leerlingLabel.dataset.filled = "true";
        leerlingLabel.textContent = "Leerling:   reeds gevonden: ";
        for (let lln of matchinLeerlingen) {
            let anchor = document.createElement("a");
            anchor.href = "#";
            anchor.text = lln.name;
            anchor.onclick = () => fillAndClick(lln.name);
            leerlingLabel.insertAdjacentElement("afterend", anchor);
            leerlingLabel.parentElement.insertBefore(document.createTextNode(" "), anchor);
        }
    }
}

function fillAndClick(name: string) {
    let formDiv = document.querySelector("#form_field_tickets_afwezigheid_toevoegen_leerling_zoeken") as HTMLDivElement;
    let input = formDiv.querySelector("input");
    input.value = name;
    let button = formDiv.querySelector("button");
    button.click();
    return false;
}

let matchinLeerlingen: {id: string, name: string}[] = [];

async function onTicket() {
    let card_bodyDiv = document.querySelector(".card-body");
    if(!card_bodyDiv)
        return;
    let rxEmail = /\w[\w.\-]*\@\w+\.\w+/gm;
    let matches = [...card_bodyDiv.textContent.matchAll(rxEmail)];
    let uniqueEmails = [...new Set(matches.map(match => match[0]))];
    let allScripts = document.querySelectorAll("script");
    let scriptTexts = [...allScripts].map(s => s.textContent).join();
    let myEmail = scriptTexts.match(rxEmail)[0];
    uniqueEmails = uniqueEmails.filter(m => m != myEmail);
    console.log(uniqueEmails);
    let div = document.createElement("div");
    div.innerHTML = await fetchStudentsSearch(uniqueEmails.join(" "));
    let tds = [...div.querySelectorAll("td")];
    matchinLeerlingen = tds.map(td => {
        let id = td.querySelector("small").textContent;
        let name = td.querySelector("strong").textContent;
        setViewFromCurrentUrl();
        return {id, name};
    })
}
