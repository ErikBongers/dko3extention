import {scrapeTable} from "../table/loadAnyTable";
import {FetchChain} from "../table/fetchChain";
import * as def from "../def";
import {Schoolyear} from "../globals";
import {FetchedTable, TableFetcher} from "../table/tableFetcher";
import {TableRef} from "../table/tableRef";

export interface Teacher {
    id: string;
    name: string;
}

export async function scrapeTeachers() {
    return scrapeTable(new Dko3PersoneelFetcher(), row => {
        //todo
        console.log(row);
    });
}


function getTableRef(): TableRef {
    return {
        htmlTableId: "",
        createElementAboveTable: () => document.createElement("div"),
        getOrgTableContainer: () => document.body, //todo: who uses these 2 functions? Try to get rid of them.
        getOrgTableRows: () => document.querySelectorAll("table > tbody > tr"),
        isFullyFetched: () => true
    };
}

export class Dko3PersoneelFetcher extends TableFetcher {
    static getCheckSumBuilder() {
        return () => "personeelsleden.todo:filtercriteria";
    }
    constructor() {
        super(getTableRef(), Dko3PersoneelFetcher.getCheckSumBuilder());
    }

    //todo: inject createGlobalInfoBlockAndListener() and show some messages while fetching.
    // either inject it into fetch or into the TableFetcher constructor.
    async fetch(): Promise<FetchedTable> {
        let hash = "personeel-personeelsleden";
        let chain = new FetchChain();
        await chain.fetch(def.DKO3_BASE_URL+"#" + hash);
        await chain.fetch("view.php?args=" + hash); // call to changeView() - assuming this is always the same, so no parsing here.
        chain.findDocReadyLoadUrl();
        await chain.fetch(); //index.view.php
        await chain.fetch(`/views/personeel/personeelsleden/vestigingsplaats_schooljaar_filter.php?schooljaar=${Schoolyear.toFullString(Schoolyear.calculateCurrent())}`)
        await chain.post("/views/personeel/personeelsleden/save_filters.php", undefined, [
            ["filters[naam]", ""],
            ["filters[status_personeelsleden]", "1"],
            ["filters[leerkracht]", "1"],
            ["filters[interim]", "1"],
            ["filters[alc]", "1"],
            ["filters[administratie]", "1"],
            ["filters[overig]", "1"],
            ["filters[schooljaar]", Schoolyear.toFullString(Schoolyear.calculateCurrent())]
        ]);

        let tableText = await chain.fetch("/views/personeel/personeelsleden/personeelsleden.table.php");
        let div = document.createElement("div");
        div.innerHTML = tableText;
        let table = div.querySelector("table")!; //! should have a table.
        let getRows = () => table.querySelectorAll("tbody > tr") as NodeListOf<HTMLTableRowElement>;
        return {getRows, tableFetcher: this, getRowsAsArray: () => Array.from(getRows()), getTable: () => table};
    }
}