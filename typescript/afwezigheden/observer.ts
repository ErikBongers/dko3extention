import {ExactHashObserver} from "../pageObserver";
import {
    fetchStudentsSearch,
    getHTMLTextWithNewlines,
    highlightText,
    rxEmail,
    setViewFromCurrentUrl,
    whoAmI
} from "../globals";
import {emmet} from "../../libs/Emmeter/html";
import {findPersonsInWorker} from "../ai/api";

class AfwezighedenObserver extends ExactHashObserver {
    constructor() {
        super("#extra-tickets?h=afwezigheden", onMutation, true);
    }
    isPageReallyLoaded(): boolean {
        if (document.getElementById("ticket_payload"))
            return true;
        if (document.getElementById("dko3_modal_contents"))
            return true;
        if (document.getElementById("div_tickets_afwezigheid_toevoegen_leerling"))
            return true;
        return false;
    }
}

export default new AfwezighedenObserver();

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
        document.getElementById("btn_opslaan_tickets_afwezigheid_toevoegen")!.click();
    }
}

function addMatchingStudents() {
    let leerlingLabel = document.querySelector("#form_field_tickets_afwezigheid_toevoegen_leerling_zoeken > label") as HTMLLabelElement;
    if (leerlingLabel && !leerlingLabel.dataset.filled) {
        leerlingLabel.dataset.filled = "true";
        leerlingLabel.textContent = "Leerling:   reeds gevonden: ";
        let target = leerlingLabel as HTMLElement;
        for (let lln of matchingLeerlingen) {
            let anchorClasses = lln.winner ? ".bold" : "";
            let hook = (el: Element) => {
                if(!(el instanceof HTMLElement))
                    return;
                if(el.tagName == "A") {
                    el.onclick = () => fillAndClick(lln.name);
                }
            }
            target = emmet.insertAfter(target, `a[href="#"].leerlingLabel${anchorClasses}{${lln.name}}`, undefined, hook).first as HTMLElement;
        }
    }
}

function addEmailText() {
    let emailDiv  = emmet.appendChild(document.querySelector("div.modal-body") as HTMLElement, 'div>button#btnShowEmail{Show email}.btn.btn-sm.btn-outline-success+div#showEmail.collapsed').last as HTMLDivElement;
    emailDiv.innerHTML = global_currentEmailHtml;
    document.getElementById("btnShowEmail")!.addEventListener("click", showEmail);
}

function showEmail() {
    document.getElementById("showEmail")!.classList.toggle("collapsed");
}

function onAddMelding() {
    addMatchingStudents();
    addEmailText();
}

function fillAndClick(name: string) {
    let formDiv = document.querySelector("#form_field_tickets_afwezigheid_toevoegen_leerling_zoeken") as HTMLDivElement;
    let input = formDiv.querySelector("input")!;
    input.value = name;
    let button = formDiv.querySelector("button")!;
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

let global_currentEmailHtml = "";

async function onTicket() {
    let card_bodyDiv = document.querySelector(".card-body") as HTMLDivElement | null;
    if(!card_bodyDiv)
        return;
    let emailText = getHTMLTextWithNewlines(card_bodyDiv);
    global_currentEmailHtml = card_bodyDiv.innerHTML;

    let parseMailData = parseEmail(emailText);
    console.log(parseMailData);

    let template = document.createElement("div");
    template.innerHTML = await fetchStudentsSearch(parseMailData.uniqueEmails.join(" "));
    let tdLln = [...template.querySelectorAll("td")];
    matchingLeerlingen = tdLln.map(td => {
        let id = td.querySelector("small")!.textContent;
        let name = td.querySelector("strong")!.textContent;
        setViewFromCurrentUrl();
        return <MatchingLeerling>{id, name, weight: 0, winner: false};
    });
    const cards = document.querySelectorAll(".card-body") as NodeListOf<HTMLElement>;
    let winner = findUniqueMatch(emailText, matchingLeerlingen);
    if(winner) {
        let nameParts = winner.name
            .split(",")
            .map(name =>
                name.trim()
                    .split(" ")
            )
            .flat()
            .map(name => name.trim())
        ;
        highlightText(cards, nameParts, "highlightedName");
    }
    //else, eventually...
    await findPersonsInWorker(parseMailData.uniqueCapital, (data) => {
        highlightText(cards, data.output, "highlightedName", ["light"]);
    });
}

function parseEmail(emailText: string) {
    let matches = [...emailText.matchAll(rxEmail)];
    let uniqueEmails = [...new Set(matches.map(match => match[0]))];

    let {email: myEmail} = whoAmI();
    uniqueEmails = uniqueEmails.filter(m => m != myEmail);

    let rxCapital = /\W+(\p{Lu}\p{L}+(-\p{Lu}\p{L}+)?)/gmu; //also Anne-Marie and Erbstösser
    const matchesCapital = [...emailText.matchAll(rxCapital)].map(match => match[1]);
    let uniqueCapital = [...new Set(matchesCapital)];
    return {uniqueEmails, uniqueCapital};
}

function findUniqueMatch(emailText: string, matchingLeerlingen: MatchingLeerling[]) {
    if(matchingLeerlingen.length === 1) {
        matchingLeerlingen[0].winner = true;
        return matchingLeerlingen[0];
    }

    //lln: [Erik Pierre Bongers, Iris Marlies Bongers]
    // "Onzen Erik is ziek."
    // Erik: weight:2, Iris: 1
    let strippedText = emailText.replaceAll('\n', ' ').replaceAll('\r', ' ');
    let mailLowerCase = strippedText.toLowerCase();
    for(let lln of matchingLeerlingen) {
        let nameParts = lln.name.split(" ");
        for(let namePart of nameParts) {
            if(strippedText.includes(" "+namePart+" ")) {
                lln.weight++;
            }
            if(mailLowerCase.includes(" "+namePart.toLowerCase()+" ")) {
                lln.weight++;
            }
        }
    }
    //do we have a winner?
    matchingLeerlingen.sort((a, b) => b.weight - a.weight);
    if(matchingLeerlingen[0].weight > matchingLeerlingen[1].weight) {
        matchingLeerlingen[0].winner = true;
        return matchingLeerlingen[0];
    }
    return null;
}