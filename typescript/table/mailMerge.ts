import {TableMeta} from "./tableHeaders";
import {getTableFromHash, InfoBarTableFetchListener} from "./loadAnyTable";
import {createHtmlTable} from "../globals";

interface DataIndexes {
    studentColumnIndexes: number[];
    inschrijvingenColumnIndexes: number[];
    lesColumnIndexes: number[];
}
interface StudentRow {
    allInschrijvingenRows: number[],
    inschrijvingen: Map<string, number[]>
}

export interface TableWithHeader {
    headers: string[];
    data: string[][];
}

export class MailMergeTable {
    private table: HTMLTableElement;
    private readonly data: string[][];
    private readonly headers: string[];
    private tableMeta: TableMeta;
    private maxInschrijvingen: number;
    private maxLessen: number;

    constructor(tableMeta: TableMeta, table: HTMLTableElement) {
        this.table = table;
        this.tableMeta = tableMeta;
        let headerCells = this.table.tHead.children[0].children as HTMLCollectionOf<HTMLTableCellElement>;
        this.headers = [...headerCells].filter(cell => cell.style.display !== "none").map(cell => cell.innerText);
        let rows = table.tBodies[0].children as HTMLCollectionOf<HTMLTableRowElement>;
        this.data = [...rows].map(row => [...row.cells].filter(cell => cell.style.display !== "none").map(cell => cell.innerText));
    }

    async build(): Promise<{ vestigingsPlaatsen: TableWithHeader, studentTable: TableWithHeader }> {
        let fetchedTable = await getTableFromHash("extra-academie-vestigingsplaatsen", false, new InfoBarTableFetchListener(this.tableMeta.infoBlock));
        let rows = fetchedTable.getRows();
        let vestigingsPlaatsen = [...rows].map(row => row.cells[1].innerText);
        let vestigingsTable: TableWithHeader = {headers: ["Vestigingsplaats"], data: vestigingsPlaatsen.map(vestiging => [vestiging])};
        let studentTable = this.buildStudentTable();
        return {
            vestigingsPlaatsen: vestigingsTable,
            studentTable};
    }

    async toHtml() {
        let {vestigingsPlaatsen, studentTable} = await this.build();
        let vestTable = createHtmlTable(vestigingsPlaatsen.headers, vestigingsPlaatsen.data);
        let studTable = createHtmlTable(studentTable.headers, studentTable.data);
        let clipboardText = `
${this.createSingleRowTable("BEGIN Vestigingsplaatsen", "Rows:", (vestigingsPlaatsen.data.length+1).toString(), "Columns:", "1")}
${vestTable.outerHTML}
END Vestigingsplaatsen<br>
${this.createSingleRowTable("maxInschrijvingen:", this.maxInschrijvingen.toString(), "maxLessen:", this.maxLessen.toString())}
${this.createSingleRowTable("BEGIN Studenten", "Rows:", (studentTable.data.length+1).toString(), "Columns:", (studentTable.headers.length).toString())}
${studTable.outerHTML}
END Studenten<br>
    `;
    return clipboardText;
    }

    private createSingleRowTable(...values: string[]) {
        return `<table><tr>${values.map(value => `<td>${value}</td>`).join("")}</tr></table>`;
    }

    buildStudentTable(): TableWithHeader {
        let emailIndex = this.headers.findIndex(header => header.toLowerCase().includes("e-mailadressen"));
        if(emailIndex === -1) {
            alert("Geen e-mailadressen gevonden'. Voed dit veld toe aan de lijst.");
            return;
        }

        // // -- add seq to rows.
        // let seqIndex = headers.length; //we'll be adding a seq column to each row later.
        // cells.forEach((row: (string | number)[], seq) => {
        //     row.push(seq);
        // });
        //
        // -- aggregate at student level.
        let dataDef: DataIndexes = { studentColumnIndexes: [], inschrijvingenColumnIndexes: [], lesColumnIndexes: []};
        this.headers.forEach((header, index) => {
            if(WerklijstFieldsStudent.includes(header)) {
                dataDef.studentColumnIndexes.push(index);
            } else if(WerklijstFieldsInschrijving.includes(header)) {
                dataDef.inschrijvingenColumnIndexes.push(index);
            } else if(WerklijstFieldsLes.includes(header)) {
                dataDef.lesColumnIndexes.push(index);
            }
        });

        let groupedPerStudent: StudentRow[] = [];
        this.data.forEach((row, rowIndex) => {
            if(groupedPerStudent.length == 0) {
                groupedPerStudent.push({
                    allInschrijvingenRows: [rowIndex],
                    inschrijvingen: new Map()
                });
                return;
            }
            // -- check if row is a new student.
            let baseStudentRow = this.data[groupedPerStudent[groupedPerStudent.length - 1].allInschrijvingenRows[0]];
            let isNewStudent = dataDef.studentColumnIndexes.some(index => row[index] != baseStudentRow[index]);
            if(isNewStudent) {
                groupedPerStudent.push({
                    allInschrijvingenRows: [rowIndex],
                    inschrijvingen: new Map()
                });
                return;
            }
            groupedPerStudent[groupedPerStudent.length - 1].allInschrijvingenRows.push(rowIndex);
        });
        //group per student>inschrijving
        groupedPerStudent.forEach(student => {
            student.allInschrijvingenRows.forEach(inschrijvingRow => {
                let currentRow = this.data[inschrijvingRow];
                let key = dataDef.inschrijvingenColumnIndexes.map(index => currentRow[index]).join("|");
                if(!student.inschrijvingen.has(key))
                    student.inschrijvingen.set(key, []);
                student.inschrijvingen.get(key).push(inschrijvingRow);
                return;
            });
        });
        console.log(groupedPerStudent);

        this.maxInschrijvingen = Math.max(...groupedPerStudent.map(student => student.inschrijvingen.size));
        let lessen = groupedPerStudent.map(student => [...student.inschrijvingen.values()]).map(inschrijving => inschrijving.map(lessen => lessen.length)).flat();
        console.log(lessen);
        this.maxLessen = Math.max(...groupedPerStudent.map(student => [...student.inschrijvingen.values()]).map(inschrijving => inschrijving.map(lessen => lessen.length)).flat());

        let flattendToStudent: string[][] = [];

        let flattendHeaders: string[] = [];
        dataDef.studentColumnIndexes.forEach(colIndex => flattendHeaders.push(this.headers[colIndex]));
        [...new Array(this.maxInschrijvingen).keys()].forEach(inschrijvingCnt => {
            dataDef.inschrijvingenColumnIndexes.forEach(colIndex => {
                let label = `${this.headers[colIndex]}${inschrijvingCnt + 1}`;
                flattendHeaders.push(label);
            });
            [...new Array(this.maxLessen).keys()].forEach(lesCnt => {
                dataDef.lesColumnIndexes.forEach(colIndex => {
                    let label = `${this.headers[colIndex]}${inschrijvingCnt + 1}.${lesCnt + 1}`;
                    flattendHeaders.push(label);
                });
            });
        });

        //Flatten table to 1 line per student
        groupedPerStudent.forEach(student => {
            let row: string[] = [];
            dataDef.studentColumnIndexes.forEach(colIndex => row.push(this.data[student.allInschrijvingenRows[0]][colIndex]));
            let inschrijvingen = [...student.inschrijvingen.values()];
            [...new Array(this.maxInschrijvingen).keys()].forEach(inschrijvingCnt => {
                if(inschrijvingCnt < inschrijvingen.length) {
                    let inschrijvingRows = inschrijvingen[inschrijvingCnt];
                    dataDef.inschrijvingenColumnIndexes.forEach(colIndex => row.push(this.translateMailMerge(inschrijvingRows[0], colIndex)));
                    [...new Array(this.maxLessen).keys()].forEach(lesCnt => {
                        if(lesCnt < inschrijvingRows.length) {
                            let rowIndex = inschrijvingRows[lesCnt];
                            dataDef.lesColumnIndexes.forEach(colIndex => row.push(this.translateMailMerge(rowIndex, colIndex)));
                        } else {
                            dataDef.lesColumnIndexes.forEach(_ => row.push(""));
                        }
                    });
                } else {
                    dataDef.inschrijvingenColumnIndexes.forEach(_ => row.push(""));
                    [...new Array(this.maxLessen).keys()].forEach(_ => {
                        dataDef.lesColumnIndexes.forEach(_ => row.push(""));
                    });
                }
            });
            flattendToStudent.push(row);
        });

        //
        // // -- split rows per email
        // let extraRows: (string | number)[][] = [];
        // cells.forEach((row: (string | number)[], seq) => {
        //     row.push(seq);
        //     let emails = (row[emailIndex] as string).split(/[,;]/);
        //     emails = emails.filter((email: string) => !email.includes("academiestudent.be"));
        //     if(emails.length == 0)
        //         return;
        //     row[emailIndex] = emails.pop();
        //     emails.forEach((email: string) => {
        //         let copiedRow = [...row];
        //         copiedRow[emailIndex] = email;
        //         extraRows.push(copiedRow);
        //     });
        // });
        // cells = cells.concat(extraRows);
        //
        // // -- sort rows per seq and remove seq.
        // cells.sort((a, b) => (a[seqIndex] as number) - (b[seqIndex] as number));
        // cells.forEach(row => row.pop());
        return {headers: flattendHeaders, data: flattendToStudent};
    }


    translateMailMerge(rowIndex: number, colIndex: number) {
        let row = this.data[rowIndex];
        let col = this.headers[colIndex];
        let value = row[colIndex];
        if(this.headers[colIndex].includes("lesmoment")) {
            value = value.replace("(wekelijks)", "").trim();
        }
        return value;
    }

}


let WerklijstFieldsInschrijving = [
    "domein",
    "vakken (binnen de criteria)",
    "alle vakken",
    "instrumenten (binnen de criteria)",
    "alle instrumenten",
    "graad",
    "leerjaar",
    "graad + leerjaar",
    "graad + leerjaar + sectie",
    "optie",
    "sectie",
    "administratieve groep: naam",
    "administratieve groep: officiële naam",
    "administratieve groep: code",
    "volledig vrije leerling",
    "volledig eigen leerling",
    "volledig vrije en/of eigen leerling",
    "inschrijving: datum",
    "uitschrijving: datum",
    "uitschrijving: reden",
    "financierbaarheid",
    "inschrijving: einde graad",
    "leertraject",
    "studierichting",
    "geslaagd (vak)",
    "resultaat (vak)",
    "geslaagd (globaal)",
    "resultaat (globaal)",
    "alternatieve leercontext",
    "akkoord en meer: ingevuld?",
    "akkoord en meer:  toestemming beeldmateriaal?",
    "akkoord en meer: ingevuld op",
    "akkoord en meer: ingevuld door",
    "status Discimus",
    "cursussen",
];

let WerklijstFieldsLes = [
    "vak: naam",
    "vak: officiële naam",
    "vak: code",
    //todo: split Les from Vak level
    "les: id",
    "vestigingsplaats",
    "benaming les",
    "lesmomenten",
    "lokaal",
    "klasleerkracht",
    "alle leerkrachten (zonder interims)",
    "alle leerkrachten (met interims)",
];

let WerklijstFieldsStudent = [
    "stamnummer",
    "naam",
    "voornaam",
    "roepnaam",
    "persoon: id",
    "geboortedatum",
    "geboorteplaats",
    "geslacht",
    "gender",
    "rijksregisternummer",
    "nationaliteit",
    "opmerking personalia",
    "leeftijd op 31 december",
    "leeftijd op vandaag",
    "token",
    "is zorgleerling?",
    "huisnummer",
    "busnummer",
    "postcode",
    "gemeente",
    "land",
    "leefeenheid: alle leden",
    "leefeenheid: alle actieve leden in [schooljaar]",
    "leefeenheid: te betalen",
    "leefeenheid: betaald",
    "leefeenheid: saldo",
    "e-mailadressen (gescheiden door puntkomma)",
    "e-mailadressen marketing (gescheiden door komma)",
    "e-mailadressen marketing (gescheiden door puntkomma)",
    "e-mailadres van de school",
    "telefoonnummers",
    "mobiele nummers voor verwittiging",
];