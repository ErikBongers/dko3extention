import {HashObserver} from "../pageObserver";
import {options} from "../plugin_options/options";

class ZoekenObserver extends HashObserver {
    constructor() {
        super("#zoeken", onMutation);
    }
    isPageReallyLoaded(): boolean {
        return document.getElementById("table_lijst_awi_percentages_leerling_vak_table") != null;
    }
}

export default new ZoekenObserver();

function onMutation(_mutation: MutationRecord) {
    console.log("zoeken mutation");
    let studentsDiv = document.getElementById("zoek_leerlingen_tabel") as HTMLDivElement;
    if (!studentsDiv) {
        return false;
    }
    //personeels table is fetched together with the above.
    actUponSearchResults();
    return true;
}
function actUponSearchResults() {
    if(!options.jumpToSingleResult)
        return;
    let studentsDiv = document.getElementById("zoek_leerlingen_tabel") as HTMLDivElement;
    let studentTable = studentsDiv.querySelector("table") as HTMLTableElement;
    if (!studentTable) {
        return;
    }
    let teacherDiv = document.getElementById("zoek_personeelsleden_tabel") as HTMLDivElement;
    let teacherTable = teacherDiv.querySelector("table") as HTMLTableElement;
    if (!teacherTable) {
        return;
    }
    if (studentTable.rows.length == 1) {
        if(teacherTable.rows.length == 0){
            studentTable.rows[0].click();
        }
    }
}

