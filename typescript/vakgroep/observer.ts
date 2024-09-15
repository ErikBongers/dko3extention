import {HashObserver} from "../pageObserver.js";
import {createScearchField} from "../globals.js";

export default new HashObserver("#extra-inschrijvingen-vakgroepen-vakgroep", onMutation);

function onMutation (mutation: MutationRecord) {
    let divVakken = document.getElementById("div_table_vakgroepen_vakken");
    if (mutation.target !== divVakken) {
        return false;
    }
    onVakgroepChanged(divVakken);
    return true;
}

const TXT_FILTER_ID = "txtFilter";
let savedSearch = "";

function onVakgroepChanged(divVakken: HTMLElement) {
    let table = divVakken.querySelector("table");
    if(!document.getElementById(TXT_FILTER_ID))
        table.parentElement.insertBefore(createScearchField(TXT_FILTER_ID, onSearchInput, savedSearch), table);

    onSearchInput();
}

function onSearchInput() {
    let divVakken = document.getElementById("div_table_vakgroepen_vakken");
    let table = divVakken.querySelector("table");
    let search = (document.getElementById(TXT_FILTER_ID) as HTMLInputElement).value;
    savedSearch = search;
    for (let tr of table.tBodies[0].rows) {
        let instrumentName =  tr.cells[0].querySelector("label").textContent.trim().toLowerCase();
        let strong = tr.cells[0].querySelector("strong")?.textContent.trim();
        let text = instrumentName + " " + strong;
        let match = text.includes(search);
        tr.style.visibility =  match ? "visible" : "collapse";
    }

}
