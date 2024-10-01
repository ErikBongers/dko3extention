import {setWerklijstCriteria, WerklijstCriteria} from "./criteria";
import {PageContinue, PageLoadHandler} from "./PaginatedLoader";
import {TableLoader} from "../table/TableLoader";

export async function fetchWerklijstTable() {
    return new Promise<HTMLTableElement>((resolve, reject) => _fetchWerklijstTable(resolve, reject));
}

function _fetchWerklijstTable(resolve: (table: HTMLTableElement) => void, reject: (reason?: any) => void) {
    let pageLoadHandler: PageLoadHandler = {
        onPage: function (text: string, offset: number): PageContinue {
            return PageContinue.Continue;
        },
        onLoaded: function (): void {
            console.log(`Rows collected: ${tableLoader.getTable().tBodies[0].rows.length}`);
            console.log(tableLoader.getTable());
            resolve(tableLoader.getTable());
        },
        onAbort: function (e: any): void {
            console.log("Alas...");
            reject(e);
        }
    }
    let tableLoader = new TableLoader(pageLoadHandler);
    tableLoader.loadTheTable();
}

export async function getWerklijst(criteria: WerklijstCriteria) {
    await fetch("/#leerlingen-werklijst");
    await fetch("/view.php?args=leerlingen-werklijst");
    await fetch("/views/leerlingen/werklijst/index.criteria.php?schooljaar=2024-2025");
    await fetch("/views/leerlingen/werklijst/index.velden.php");
    await fetch("/views/leerlingen/werklijst/index.groeperen.php");

    await setWerklijstCriteria(criteria);
    return fetchWerklijstTable();
}