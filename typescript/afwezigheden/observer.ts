import {ExactHashObserver} from "../pageObserver";
import {fetchStudentsSearch, rxEmail, setViewFromCurrentUrl, whoAmI} from "../globals";
import {emmet} from "../../libs/Emmeter/html";

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

function addMatchingStudents() {
    let leerlingLabel = document.querySelector("#form_field_tickets_afwezigheid_toevoegen_leerling_zoeken > label") as HTMLLabelElement;
    if (leerlingLabel && !leerlingLabel.dataset.filled) {
        leerlingLabel.dataset.filled = "true";
        leerlingLabel.textContent = "Leerling:   reeds gevonden: ";
        //sort ascending because of the insertBefore()
        matchingLeerlingen.sort((a, b) => a.weight - b.weight);
        for (let lln of matchingLeerlingen) {
            let anchorClasses = "";
            if (lln.winner)
                anchorClasses = ".bold";
            emmet.insertAfter(leerlingLabel, `a[href="#"].leerlingLabel${anchorClasses}{${lln.name}}`);
            let anchors = leerlingLabel.parentElement.querySelectorAll("a");
            //todo: add hooks to emmet.
            let anchor = anchors[anchors.length-1];
            anchor.onclick = () => fillAndClick(lln.name);
        }
    }
}

function addEmailText() {
    let emailDiv  = emmet.create('div.modal-body>div>button#btnShowEmail{Show email}.btn.btn-sm.btn-outline-success+div#showEmail.collapsed').last;
    emailDiv.innerHTML = currentEmailHtml;
    document.getElementById("btnShowEmail").addEventListener("click", showEmail);
}

function showEmail() {
    document.getElementById("showEmail").classList.toggle("collapsed");
}

function onAddMelding() {
    addMatchingStudents();
    addEmailText();
}

function fillAndClick(name: string) {
    let formDiv = document.querySelector("#form_field_tickets_afwezigheid_toevoegen_leerling_zoeken") as HTMLDivElement;
    let input = formDiv.querySelector("input");
    input.value = name;
    let button = formDiv.querySelector("button");
    button.click();
    return false;
}

let matchingLeerlingen: MatchingLeerling[] = [];

interface MatchingLeerling {
    id: string
    name: string
    weight: number,
    winner: boolean
}

let currentEmailHtml = "";

async function onTicket() {
    let card_bodyDiv = document.querySelector(".card-body");
    if(!card_bodyDiv)
        return;
    let emailText = card_bodyDiv.textContent;
    currentEmailHtml = card_bodyDiv.innerHTML;

    let matches = [...emailText.matchAll(rxEmail)];
    let uniqueEmails = [...new Set(matches.map(match => match[0]))];
    
    let {email: myEmail} = whoAmI();
    uniqueEmails = uniqueEmails.filter(m => m != myEmail);
    console.log(uniqueEmails);

    let template = document.createElement("div");
    template.innerHTML = await fetchStudentsSearch(uniqueEmails.join(" "));
    let tdLln = [...template.querySelectorAll("td")];
    matchingLeerlingen = tdLln.map(td => {
        let id = td.querySelector("small").textContent;
        let name = td.querySelector("strong").textContent;
        setViewFromCurrentUrl();
        return <MatchingLeerling>{id, name, weight: 0, winner: false};
    });
    findUniqueMatch(emailText, matchingLeerlingen);
}

function findUniqueMatch(emailText: string, matchingLeerlingen: MatchingLeerling[]) {
    if(matchingLeerlingen.length === 1)
        return matchingLeerlingen[0];

    //lln: [Erik Pierre Bongers, Iris Marlies Bongers]
    // "Onzen Erik is ziek."
    // Erik: weight:2, Iris: 1
    let mailLowerCase = emailText.toLowerCase();
    for(let lln of matchingLeerlingen) {
        let nameParts = lln.name.split(" ");
        for(let namePart of nameParts) {
            if(emailText.includes(" "+namePart+" ")) {
                lln.weight++;
            }
            if(mailLowerCase.includes(" "+namePart.toLowerCase()+" ")) {
                lln.weight++;
            }
        }
    }
    //do we have a winner?
    matchingLeerlingen.sort((a, b) => b.weight - a.weight);
    if(matchingLeerlingen[0].weight > matchingLeerlingen[1].weight)
        matchingLeerlingen[0].winner = true;
}