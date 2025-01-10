import * as def from "../def.js";
import {HashObserver} from "../pageObserver.js";
import {addButton} from "../globals";
import {SimpleTableHandler} from "../pageHandlers";
import {findTableRefInCode, TableDef} from "../table/tableDef";
import {getCriteriaString} from "../werklijst/observer";

export default new HashObserver("#leerlingen-lijsten-awi-percentages_leerling_vak", onMutationAanwezgheden);

function onMutationAanwezgheden(mutation: MutationRecord) {
    let tableId = document.getElementById("table_lijst_awi_percentages_leerling_vak_table") as HTMLTableElement;
    if (!tableId) {
        return false;
    }
    console.log("aanwezig")
    addTableNavigationButton(def.COPY_TABLE_BTN_ID, "copy table to clipboard", copyTable, "fa-clipboard");
    return true;
}

interface Aanwezigheid {
    naam: string,
    voornaam: string,
    vakReduced: string,
    vak: string,
    percentFinancierbaar: number,
    percentTotaal: number,
    percentFinancierbaarAP: number,
    percentTotaalAP: number,
}

function copyTable() {
    let prebuildPageHandler = new SimpleTableHandler(onLoaded, undefined);

    function onLoaded(tableDef: TableDef) {
        //TODO: this really is just the downloadTable() function from table/observer.ts.
        let template = tableDef.shadowTableTemplate;
        // convert table to text
        let rows = template.content.querySelectorAll("tbody tr") as NodeListOf<HTMLTableRowElement>;
        let rowsArray = Array.from(rows);
        let text = "data:\n";
        rowsArray
            .map(row => {
                let percentFinancierbaar =  parseFloat(row.cells[1].querySelector("strong").textContent.replace(",", "."))/100;
                let percentTotaal =  parseFloat(row.cells[2].querySelector("strong").textContent.replace(",", "."))/100;
                let vak = row.cells[0].querySelector("br")?.nextSibling?.textContent;
                let namen = row.cells[0].querySelector("strong").textContent.split(", ");
                let aanw: Aanwezigheid = {
                    naam: namen[0],
                    voornaam: namen[1],
                    vak,
                    vakReduced: reduceVaknaam(vak),
                    percentFinancierbaar,
                    percentTotaal,
                    percentFinancierbaarAP: 0,
                    percentTotaalAP: 0
                };
                return aanw;
            })
            .forEach(aanw => {
                text += "lln: " + aanw.naam + "," + aanw.voornaam + "," + aanw.vakReduced + "," + aanw.percentFinancierbaar + "\n";
            });
        console.log(text);
        navigator.clipboard.writeText(text).then(r => {});

        //replace the visible table
        tableDef.tableRef.getOrgTable()
            .querySelector("tbody")
            .replaceChildren(...template.content.querySelectorAll("tbody tr"));
    }

    let tableRef = findTableRefInCode();
    let tableDef = new TableDef(
        tableRef,
        prebuildPageHandler,
        getCriteriaString
    );

    tableDef.getTableData().then(() => { });
}

//todo: use in table/observer as well.
function addTableNavigationButton(btnId: string, title: string, onClick: any, fontIconId: string ) {
    let navigationBar = document.querySelector("div.datatable-navigation-toolbar") as HTMLElement;
    if(!navigationBar)
        return false;
    addButton(navigationBar.lastElementChild as HTMLElement, btnId, title, onClick, fontIconId, ["btn-secondary"], "", "afterend");
    return true;
}

function reduceVaknaam(vaknaam: string) : string {
    if (vaknaam.includes("culturele vorming")) {
        if(vaknaam.includes("3."))
            return "ML";
        else
            return "MA";
    }
    if (vaknaam.includes("roepsmusiceren")) {
        return "GM";
    }
    if (vaknaam.includes("theorie")) {
        return "MT";
    }
    if (vaknaam.includes("geleidingspraktijk")) {
        return "BP";
    }
    if (vaknaam.includes("oordatelier")) {
        return "WA";
    }
    if (vaknaam.includes("oordlab")) {
        return "WL";
    }
    if (vaknaam.includes("mprovisatie")) {
        return "impro";
    }
    if (vaknaam.includes("omeinoverschrijdende")) {
        return "KB";
    }
    if (vaknaam.includes("ramalab")) {
        return "DL";
    }
    if (vaknaam.includes("oordstudio")) {
        return "WS";
    }
    if (vaknaam.includes("ompositie")) {
        return "compositie";
    }
    if (vaknaam.includes("Instrument: klassiek: ")) {
        let rx = /Instrument: klassiek: (\S*)/;
        let matches = vaknaam.match(rx);
        if(matches.length > 1)
            return matches[1];
        else
            return vaknaam;
    }
    if (vaknaam.includes("Instrument: jazz-pop-rock: ")) {
        let rx = /Instrument: jazz-pop-rock: (\S*)/;
        let matches = vaknaam.match(rx);
        if(matches.length > 1)
            return matches[1];
        else
            return vaknaam;
    }

    if (vaknaam.includes("rrangeren") || vaknaam.includes("opname") || vaknaam.includes("electronics")) {
        return "elektronische muziek";
    }
    let rx2 = /(.*).•./;
    let matches = vaknaam.match(rx2);
    if(matches.length > 1)
        return matches[1];
    return "??";
}