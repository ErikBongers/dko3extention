import * as def from "../def.js";
import {HashObserver} from "../pageObserver";
import {addTableNavigationButton, getBothToolbars} from "../globals";
import {TableFetcher} from "../table/tableFetcher";
import {createDefaultTableFetcher, getTableFromHash} from "../table/loadAnyTable";
import {InfoBar} from "../infoBar";

export default new HashObserver("#leerlingen-lijsten-awi-percentages_leerling_vak", onMutationAanwezgheden);

function onMutationAanwezgheden(mutation: MutationRecord) {
    let tableId = document.getElementById("table_lijst_awi_percentages_leerling_vak_table") as HTMLTableElement;
    if (!tableId) {
        return false;
    }
    let navigationBars = getBothToolbars();
    if(!navigationBars)
        return; //wait for top and bottom bars.
    addTableNavigationButton(navigationBars, def.COPY_TABLE_BTN_ID, "copy table to clipboard", copyTable, "fa-clipboard");
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

async function copyTable() {
    let result = createDefaultTableFetcher();
    if("error" in result) {
        console.error(result.error);
        return;
    }
    let {tableFetcher, infoBar, infoBarListener} = result.result;

    infoBar.setExtraInfo("Fetching 3-weken data...");

    let wekenLijst = await getTableFromHash("leerlingen-lijsten-awi-3weken", true, infoBarListener).then(bckTableDef => {
        // convert table to text
        let rowsArray = bckTableDef.getRowsAsArray();
        return rowsArray
            .map(row => {
                let namen = row.cells[0].textContent.split(", ");
                return { naam: namen[0], voornaam: namen[1], weken: parseInt(row.cells[2].textContent)} as Weken;
            });
    });
    console.log(wekenLijst);

    infoBar.setExtraInfo("Fetching attesten...");

    let attestenLijst = await getTableFromHash("leerlingen-lijsten-awi-ontbrekende_attesten", true, infoBarListener).then(bckTableDef => {
        return bckTableDef.getRowsAsArray().map(tr => {
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

    infoBar.setExtraInfo("Fetching afwezigheidscodes...");

    let pList = await getTableFromHash("leerlingen-lijsten-awi-afwezigheidsregistraties", true, infoBarListener).then(bckTableDef => {
        let rowsArray = bckTableDef.getRowsAsArray();

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

    tableFetcher.clearCache();
    tableFetcher.fetch().then((fetchedTable) => {

        let wekenMap: Map<string, Weken> = new Map();

        for(let week of wekenLijst) {
            wekenMap.set(week.naam+","+week.voornaam, week);
        }

        // convert table to text
        let rowsArray = fetchedTable.getRowsAsArray();
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
        aanwezighedenToClipboard(infoBar);

        //replace the visible table
        tableFetcher.tableRef.getOrgTableContainer()
            .querySelector("tbody")
            .replaceChildren(...fetchedTable.getRows());
    });
}

function aanwezighedenToClipboard(infoBar: InfoBar) {
    let text = window.sessionStorage.getItem(def.AANW_LIST);
    navigator.clipboard.writeText(text)
        .then(r => {
            infoBar.setExtraInfo("Data copied to clipboard. <a id="+def.COPY_AGAIN+" href='javascript:void(0);'>Copy again</a>", def.COPY_AGAIN, () => {
                aanwezighedenToClipboard(infoBar);
            });
        })
        .catch(reason => {
            infoBar.setExtraInfo("Could not copy to clipboard!!! <a id="+def.COPY_AGAIN+" href='javascript:void(0);'>Copy again</a>", def.COPY_AGAIN, () => {
                aanwezighedenToClipboard(infoBar);
            });
        });
}

function reduceVaknaam(vaknaam: string) : string {
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