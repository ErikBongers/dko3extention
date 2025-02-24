import * as def from "../def.js";
import {HashObserver} from "../pageObserver";
import {addButton} from "../globals";
import {SimpleTableHandler} from "../pageHandlers";
import {findTableRefInCode, TableDef} from "../table/tableDef";
import {getCriteriaString} from "../werklijst/observer";
import {getTableFromHash} from "../table/loadAnyTable";

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
    weken: string,
    codeP: number
}

interface Weken {
    naam: string,
    voornaam: string,
    weken: number
}

interface Pees {
    naam: string,
    voornaam: string,
    code: string,
    vak: string,
    leraar: string
}

interface Attest {
    datum: string,
    leerling: string,
    vak: string,
    leraar: string,
    reden: string
}

function showInfoMessage(message: string, click_element_id?: string, callback?: () => void) {
    let div = document.querySelector("#"+def.INFO_MSG_ID);
    if(!div)
        return; //meh...

    div.innerHTML = message;
    if(click_element_id) {
        document.getElementById(click_element_id).onclick = callback;
    }
}


async function copyTable() {
    let prebuildPageHandler = new SimpleTableHandler(onLoaded, undefined);

    function onLoaded(tableDef: TableDef) {
    }

    let tableRef = findTableRefInCode();
    let tableDef = new TableDef(
        tableRef,
        prebuildPageHandler,
        getCriteriaString
    );

    // tableDef.setupInfoBar();
    let div = tableRef.createElementAboveTable("div");
    let msgDiv = div.appendChild(document.createElement("div"));
    msgDiv.classList.add("infoMessage");
    msgDiv.id = def.INFO_MSG_ID;
    tableDef.divInfoContainer = div.appendChild(document.createElement("div"));

    showInfoMessage("Fetching 3-weken data...");

    let wekenLijst = await getTableFromHash("leerlingen-lijsten-awi-3weken", tableDef.divInfoContainer, true).then(bckTableDef => {
        let template = bckTableDef.shadowTableTemplate;
``        // convert table to text
        let rows = template.content.querySelectorAll("tbody tr") as NodeListOf<HTMLTableRowElement>;
        let rowsArray = Array.from(rows);
        return rowsArray
            .map(row => {
                let namen = row.cells[0].textContent.split(", ");
                return { naam: namen[0], voornaam: namen[1], weken: parseInt(row.cells[3].textContent)} as Weken;
            });
    });
    console.log(wekenLijst);

    showInfoMessage("Fetching attesten...");

    let attestenLijst = await getTableFromHash("leerlingen-lijsten-awi-ontbrekende_attesten", tableDef.divInfoContainer, true).then(bckTableDef => {
        return bckTableDef.getRows().map(tr => {
                return {
                    datum: tr.cells[0].textContent,
                    leerling: tr.cells[1].textContent,
                    vak: tr.cells[2].textContent,
                    leraar: tr.cells[3].textContent,
                    reden: tr.cells[4].textContent,
                } as Attest;
            }
        )
    });
    console.log(attestenLijst);

    showInfoMessage("Fetching afwezigheidscodes...");

    let pList = await getTableFromHash("leerlingen-lijsten-awi-afwezigheidsregistraties", tableDef.divInfoContainer, true).then(bckTableDef => {
        let template = bckTableDef.shadowTableTemplate;
        let rows = template.content.querySelectorAll("tbody tr") as NodeListOf<HTMLTableRowElement>;
        let rowsArray = Array.from(rows);

        return rowsArray
            .map(row => {
                let namen = row.cells[1].querySelector("strong").textContent.split(", ");
                let vakTxt = Array.from(row.cells[1].childNodes).filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join("");
                let vak =  reduceVaknaam(vakTxt.substring(3));
                let leraar = row.cells[1].querySelector("small").textContent.substring(16); //remove "Klasleerkracht: "
                return { naam: namen[0], voornaam: namen[1], code: row.cells[2].textContent[0], vak, leraar} as Pees;
            });
    });
    console.log(pList);

    tableDef.clearCache();
    tableDef.getTableData().then(() => {

        let wekenMap: Map<string, Weken> = new Map();

        for(let week of wekenLijst) {
            wekenMap.set(week.naam+","+week.voornaam, week);
        }

        let template = tableDef.shadowTableTemplate;
        // convert table to text
        let rows = template.content.querySelectorAll("tbody tr") as NodeListOf<HTMLTableRowElement>;
        let rowsArray = Array.from(rows);
        let nu = new Date();
        let text = "data:"+ nu.toLocaleDateString() +"\n";
        let aanwList = rowsArray
            .map(row => {
                let percentFinancierbaar =  parseFloat(row.cells[1].querySelector("strong")?.textContent?.replace(",", ".") ?? "0")/100;
                let percentTotaal =  parseFloat(row.cells[2].querySelector("strong")?.textContent?.replace(",", ".") ?? "0")/100;
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
                    percentTotaalAP: 0,
                    weken: "",
                    codeP: 0
                };
                let week = wekenMap.get(aanw.naam+","+aanw.voornaam);
                if(week) {
                    if (aanw.weken) {
                        aanw.weken += " + " + week.weken;
                    } else {
                        aanw.weken = week.weken.toString();
                    }
                }
                return aanw;
            });

        let studentVakPees = new Map<string, number>();
        let leraarPees = new Map<string, number>();

        pList
            .filter(line => line.code === "P")
            .forEach(p => {
               studentVakPees.set(p.naam+","+p.voornaam+","+p.vak, (studentVakPees.get(p.naam+","+p.voornaam+","+p.vak)??0)+1);
               leraarPees.set(p.leraar, (leraarPees.get(p.leraar)??0)+1);
            });

        console.log(studentVakPees);
        console.log(leraarPees);

        aanwList.forEach(aanw => {
            let newP = studentVakPees.get(aanw.naam+","+aanw.voornaam+","+aanw.vakReduced)??0;
            if(newP > aanw.codeP)
                aanw.codeP = newP;
        });

        aanwList.forEach(aanw => {
            text += "lln: " + aanw.naam + "," + aanw.voornaam + "," + aanw.vakReduced + "," + aanw.percentFinancierbaar + "," + aanw.weken + "," + aanw.codeP + "\n";
        });
        leraarPees.forEach((leraarP , key)=> {
            text += "leraar: " + key + "," + leraarP + "\n";
        });
        attestenLijst.forEach((attest)=> {
            text += "attest: " + attest.datum + "," + attest.leerling + "," + attest.vak + "," + attest.leraar + "," + attest.reden + "\n";
        });
        console.log(text);
        window.sessionStorage.setItem(def.AANW_LIST, text);
        aanwezighedenToClipboard();

        //replace the visible table
        tableDef.tableRef.getOrgTable()
            .querySelector("tbody")
            .replaceChildren(...template.content.querySelectorAll("tbody tr"));
    });
}

function aanwezighedenToClipboard() {
    let text = window.sessionStorage.getItem(def.AANW_LIST);
    navigator.clipboard.writeText(text)
        .then(r => {
            showInfoMessage("Data copied to clipboard. <a id="+def.COPY_AGAIN+" href='javascript:void(0);'>Copy again</a>", def.COPY_AGAIN, () => {
                aanwezighedenToClipboard();
            });
        })
        .catch(reason => {
            showInfoMessage("Could not copy to clipboard!!! <a id="+def.COPY_AGAIN+" href='javascript:void(0);'>Copy again</a>", def.COPY_AGAIN, () => {
                aanwezighedenToClipboard();
            });
        });
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
    if(!vaknaam)
        debugger;
    let vak = reduceVaknaamStep1(vaknaam);
    return vak
        .replace("orkestslagwerk", "slagwerk")
        .replace("jazz pop rock)", "JPR")
        .replace("koor", "GM")
        .replace(": musical", "")
        .replace(" (musical)", "");
}

function reduceVaknaamStep1(vaknaam: string) : string {
    vaknaam = vaknaam.toLowerCase();
    if (vaknaam.includes("culturele vorming")) {
        if(vaknaam.includes("3."))
            return "ML";
        else
            return "MA";
    }
    if (vaknaam.includes("uziekatelier")) {
        return "MA";
    }
    if (vaknaam.includes("uzieklab")) {
        return "ML";
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
    if (vaknaam.includes("unstenbad")) {
        return "KB";
    }
    if (vaknaam.includes("ramalab")) {
        return "DL";
    }
    if (vaknaam.includes("oordstudio")) {
        return "WS";
    }
    if (vaknaam.includes("ramastudio")) {
        return "DS";
    }
    if (vaknaam.includes("ompositie")) {
        return "compositie";
    }
    if (vaknaam.includes(" saz")) {
        return "saz";
    }
    if (vaknaam.includes("instrument: klassiek: ")) {
        let rx = /instrument: klassiek: (\S*)/;
        let matches = vaknaam.match(rx);
        if(matches.length > 1)
            return matches[1];
        else
            return vaknaam;
    }
    if (vaknaam.includes("instrument: jazz-pop-rock: ")) {
        let rx = /instrument: jazz-pop-rock: (\S*)/;
        let matches = vaknaam.match(rx);
        if(matches.length > 1) {
            if(matches[1].includes("elektrische"))
                return "gitaar JPR"
            else
                return matches[1] + " JPR";
        }
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