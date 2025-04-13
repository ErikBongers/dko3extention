import {HashObserver} from "../pageObserver";

export default new HashObserver("#lessen-les", onMutation);

function onMutation(mutation: MutationRecord) {
    let tabLeerlingen = document.getElementById("les_leerlingen_leerlingen");
    if (mutation.target === tabLeerlingen) {
        onLeerlingenChanged();
        return true;
    }
    return false;
}

function onLeerlingenChanged() {
    console.log("Les-Leerlingen changed.")
    addSortVoornaamLink();
}

function addSortVoornaamLink() {
    try {
        let headerSpans = document.querySelectorAll("#les_leerlingen_leerlingen > span");
        let sortSpan = Array.from(headerSpans).find((value: HTMLSpanElement) => value.textContent.includes("gesorteerd op:"));
        let graadEnNaam = Array.from(sortSpan.querySelectorAll("a")).find(anchor => anchor.textContent === "graad en naam");
        const SORT_VOORNAAM_ID = "dko_plugin_sortVoornaam";
        if(document.getElementById(SORT_VOORNAAM_ID))
            return;
        let anchorSortVoornaam = document.createElement("a");
        anchorSortVoornaam.id = SORT_VOORNAAM_ID;
        anchorSortVoornaam.href = "#";
        anchorSortVoornaam.innerText = "voornaam";
        anchorSortVoornaam.classList.add("text-muted");
        anchorSortVoornaam.onclick = onSortVoornaam;
        sortSpan.insertBefore(anchorSortVoornaam, graadEnNaam);
        sortSpan.insertBefore(document.createTextNode(" | "), graadEnNaam);
    }
    catch (e) {}
}

function onSortVoornaam(event: MouseEvent) {
    sortVoornaam(event);
    switchNaamVoornaam(event);
    return false;
}

function sortVoornaam(event: MouseEvent) {
    let rows: HTMLTableRowElement[] = Array.from(document.querySelectorAll("#les_leerlingen_leerlingen > table > tbody > tr"));

    rows.sort((tr1, tr2) => {
        let name1 = tr1.querySelector("td > strong").textContent;
        let name2 = tr2.querySelector("td > strong").textContent;
        let voornaam1 = name1.split(",").pop();
        let voornaam2 = name2.split(",").pop();
        return voornaam1.localeCompare(voornaam2);
    });

    let table: HTMLTableElement = document.querySelector("#les_leerlingen_leerlingen > table");
    rows.forEach(row => table.tBodies[0].appendChild(row));

    Array.from(document.querySelectorAll("#les_leerlingen_leerlingen > span > a"))
        .forEach((a) => a.classList.add("text-muted"));
    (event.target as HTMLElement).classList.remove("text-muted");
}

function switchNaamVoornaam(_event: MouseEvent) {
    let rows: HTMLTableRowElement[] = Array.from(document.querySelectorAll("#les_leerlingen_leerlingen > table > tbody > tr"));

    rows.forEach((tr) => {
        let strong = tr.querySelector("td > strong");
        let name = strong.textContent;
        let split = name.split(",");
        let voornaam = split.pop() ?? "";
        let naam = split.pop() ?? "";
        strong.textContent = voornaam + " " + naam;
    });
}
