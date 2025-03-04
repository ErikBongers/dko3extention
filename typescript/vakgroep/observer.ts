import {HashObserver} from "../pageObserver";
import {createScearchField, createTextRowFilter, filterTable} from "../globals";

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
    savedSearch = (document.getElementById(TXT_FILTER_ID) as HTMLInputElement).value;

    function getRowText(tr: HTMLTableRowElement) {
        let instrumentName = tr.cells[0].querySelector("label").textContent.trim();
        let strong = tr.cells[0].querySelector("strong")?.textContent.trim();
        return instrumentName + " " + strong;
    }

    let rowFilter = createTextRowFilter(savedSearch, getRowText);
    filterTable(document.querySelector("#div_table_vakgroepen_vakken table") as HTMLTableElement, rowFilter);
}