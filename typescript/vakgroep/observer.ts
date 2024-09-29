import {HashObserver} from "../pageObserver.js";
import {createScearchField, filterTable} from "../globals.js";

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
    savedSearch = filterTable(
        document.querySelector("#div_table_vakgroepen_vakken table"),
        TXT_FILTER_ID,
        (tr) => {
            let instrumentName = tr.cells[0].querySelector("label").textContent.trim();
            let strong = tr.cells[0].querySelector("strong")?.textContent.trim();
            return  instrumentName + " " + strong;
        });
}