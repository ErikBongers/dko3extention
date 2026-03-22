import {getTableFromHash, InfoBarTableFetchListener} from "./loadAnyTable";
import {createHtmlTable} from "../globals";
import {InfoBlock} from "../infoBlock";
import {FIELD, Grouping} from "../werklijst/criteria";
import {createWerklijstBuilderWithoutReset, createWerklijstBuilderWithReset} from "./werklijstBuilder";

interface DataIndexes {
    studentColumnIndexes: number[];
    inschrijvingenColumnIndexes: number[];
    lesColumnIndexes: number[];
}
interface StudentRow {
    vestigingsPlaatsen: string[];
    allInschrijvingenRows: number[],
    inschrijvingen: Map<string, number[]>
}

export interface TableWithHeader {
    headers: string[];
    data: string[][];
}

export interface StudentTableWithHeader extends TableWithHeader {
    maxVestigingsplaatsen: number;
}

export class MailMergeTable {
    private table: HTMLTableElement;
    private data: string[][];
    private headers: string[];
    private infoBlock: InfoBlock;
    private maxInschrijvingen: number;
    private maxLessen: number;

    constructor(infoBlock: InfoBlock, table: HTMLTableElement) {
        this.table = table;
        this.infoBlock = infoBlock;
        let headerCells = this.table.tHead.children[0].children as HTMLCollectionOf<HTMLTableCellElement>;
        this.headers = [...headerCells].filter(cell => cell.style.display !== "none").map(cell => cell.innerText);
        let rows = table.tBodies[0].children as HTMLCollectionOf<HTMLTableRowElement>;
        this.data = [...rows].map(row => [...row.cells].filter(cell => cell.style.display !== "none").map(cell => cell.innerText));
        let indexVoornaam = this.headers.findIndex(header => header == "voornaam");
        let indexFinancierbaarheid = this.headers.findIndex(header => header == "financierbaarheid");
        if(indexVoornaam != -1) {
            this.data.forEach(row => row[indexFinancierbaarheid] = row[indexFinancierbaarheid] == "" ? "Vrij" : "");
        }
        this.data = this.data.filter(row => row[indexVoornaam] != "Contactgegevens");
    }

    async build(): Promise<{ vestigingsPlaatsen: TableWithHeader, studentTable: StudentTableWithHeader }> {
        this.infoBlock.infoBar.setExtraInfo("Vestigingsplaatsen ophalen...");
        let fetchedTable = await getTableFromHash("extra-academie-vestigingsplaatsen", false, new InfoBarTableFetchListener(this.infoBlock));
        let rows = fetchedTable.getRows();
        let vestigingsPlaatsen = [...rows].map(row => row.cells[1].innerText);
        let vestigingsTable: TableWithHeader = {headers: ["Vestigingsplaats"], data: vestigingsPlaatsen.map(vestiging => [vestiging])};
        let studentTable = this.buildStudentTable();
        this.infoBlock.infoBar.setExtraInfo("");
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
${this.createSingleRowTable("META", "maxInschrijvingen:", this.maxInschrijvingen.toString(), "maxLessen:", this.maxLessen.toString(), "maxVestigingenPerStudent:", studentTable.maxVestigingsplaatsen.toString())}
${this.createSingleRowTable("BEGIN Studenten", "Rows:", (studentTable.data.length+1).toString(), "Columns:", (studentTable.headers.length).toString())}
${studTable.outerHTML}
END Studenten<br>
    `;
    return clipboardText;
    }

//     async toCsv() {
//         let {vestigingsPlaatsen, studentTable} = await this.build();
//         let studTable = createHtmlTable(studentTable.headers, studentTable.data);
//         let clipboardText = `
// ${this.createSingleRowTable("BEGIN Vestigingsplaatsen", "Rows:", (vestigingsPlaatsen.data.length+1).toString(), "Columns:", "1")}
// ${vestTable.outerHTML}
// END Vestigingsplaatsen<br>
// ${this.createSingleRowTable("META", "maxInschrijvingen:", this.maxInschrijvingen.toString(), "maxLessen:", this.maxLessen.toString(), "maxVestigingenPerStudent:", studentTable.maxVestigingsplaatsen.toString())}
// ${this.createSingleRowTable("BEGIN Studenten", "Rows:", (studentTable.data.length+1).toString(), "Columns:", (studentTable.headers.length).toString())}
// ${studTable.outerHTML}
// END Studenten<br>
//     `;
//     return clipboardText;
//     }

    private createSingleRowTable(...values: string[]) {
        return `<table><tr>${values.map(value => `<td>${value}</td>`).join("")}</tr></table>`;
    }

    buildStudentTable(): StudentTableWithHeader {
        let emailIndex = this.headers.findIndex(header => header.toLowerCase().includes("e-mailadressen"));
        if(emailIndex === -1) {
            alert("Geen e-mailadressen gevonden'. Voed dit veld toe aan de lijst.");
            return;
        }

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
                    vestigingsPlaatsen: [],
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
                    vestigingsPlaatsen: [],
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

        this.maxInschrijvingen = Math.max(...groupedPerStudent.map(student => student.inschrijvingen.size));
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

        // -- Add unique vestigingsplaatsen to each row.
        let vestigingsPlaatsIndex = this.headers.findIndex(header => header == "vestigingsplaats");
        groupedPerStudent.forEach(student => {
            student.vestigingsPlaatsen = student.allInschrijvingenRows
                .map(row => this.data[row][vestigingsPlaatsIndex])
                .filter(vestiging => vestiging != "")
                //make unique per student.
                .reduce((acc, vestiging) => {
                    if (!acc.includes(vestiging))
                        acc.push(vestiging);
                    return acc;
                }, [] as string[]);
        });
        let maxVestigingsplaatsen = Math.max(...groupedPerStudent
            .map(student => student.vestigingsPlaatsen.length)
        );

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
            student.vestigingsPlaatsen.forEach(vestiging => row.push(vestiging));
            // fill student.vestigingsPlaatsen with empty strings to match maxVestigingsplaatsen
            [...new Array(maxVestigingsplaatsen - student.vestigingsPlaatsen.length).keys()].forEach(_ => row.push(""));

            flattendToStudent.push(row);
        });

        flattendHeaders.push(...[...new Array(maxVestigingsplaatsen).keys()].map(index => "vestigingsplaats" + (index + 1)));
        flattendHeaders[emailIndex] = "email";

        // flattendToStudent = this.duplicateRowsForEmail(flattendToStudent, emailIndex);
        //todo: test only
        flattendToStudent.sort((a, b) => (a[1]+a[2]).localeCompare(b[1]+b[2]));

        //create max row
        let maxRow = [...flattendToStudent[0]];
        let cellCount = flattendHeaders.length;
        flattendToStudent.forEach(row => {
            row.forEach((cell, index) => {
                if(cell.length > maxRow[index].length)
                    maxRow[index] = cell;
            })
        });
        let largestVestigingsPlaats: string = "";
        for(let i = 0; i < maxVestigingsplaatsen; i++) {
            if(maxRow[cellCount-i-1].length > largestVestigingsPlaats.length)
                largestVestigingsPlaats = maxRow[cellCount-i-1];
        }
        for(let i = 0; i < maxVestigingsplaatsen; i++) {
            maxRow[cellCount-i-1] = largestVestigingsPlaats;
        }
        maxRow[emailIndex] = "LANGSTE_TEKSTEN_PER_VELD@example.com";
        flattendToStudent.unshift(maxRow);
        return {headers: flattendHeaders, data: flattendToStudent, maxVestigingsplaatsen};
    }

    //...and remove academiestudent.be from the email addresses.
    duplicateRowsForEmail(data: string[][], emailIndex: number) {
        let extraRows: string[][] = [];
        data.forEach((row: string[], seq) => {
            let emails = (row[emailIndex] as string).split(/[,;]/);
            emails = emails.filter((email: string) => !email.includes("academiestudent.be"));
            if(emails.length == 0)
                return;
            row[emailIndex] = emails.pop();
            emails.forEach((email: string) => {
                let copiedRow = [...row];
                copiedRow[emailIndex] = email;
                extraRows.push(copiedRow);
            });
        });
        return data.concat(extraRows);
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

export async function fetchMailMergeData(schoolyear: string, infoBlock: InfoBlock, selectedFields: string[], fullTable: boolean) {
    let stamnummers = await fetchMailMergeStudents(schoolyear, infoBlock, selectedFields);
    let stamnummerSet = new Set(stamnummers);

    let fullDataTable = await fetchMailMergeFullData(schoolyear, infoBlock);

    let tBody = fullDataTable.tBodies[0];
    let rowCount = tBody.rows.length;
    for(let i = rowCount - 1; i >= 0; i--) {
        if(!stamnummerSet.has(tBody.rows[i].cells[0].textContent))
            tBody.deleteRow(i);
    }

    let mailMergeTable: MailMergeTable = new MailMergeTable(infoBlock, fullDataTable);
    let text = await mailMergeTable.toHtml();
    return text;
}

export async function fetchMailMergeStudents(schoolyear: string, infoBlock: InfoBlock, selectedFields: string[]) {
    infoBlock.infoBar.setExtraInfo("Filter voorbereiden...");
    let builder = await createWerklijstBuilderWithoutReset(schoolyear, Grouping.LES, selectedFields);
    builder.addFields([
        FIELD.STAMNUMMER,
        FIELD.NAAM,
        FIELD.VOORNAAM,
    ]);
    //test only:
    //builder.addCriterium(CriteriumName.Graad, Operator.PLUS, ["4e graad", "specialisatie"]);
    let preparedWerklijst = await builder.sendSettings();

    infoBlock.infoBar.setExtraInfo("Lesgegevens ophalen...");
    let fetchedTable = await preparedWerklijst.fetchTable(new InfoBarTableFetchListener(infoBlock));
    let table = fetchedTable.getTable();
    let headers = [...table.tHead.rows[0].cells].map(td => td.textContent);
    let stamnummerIndex = headers.findIndex(header => header.toLowerCase().includes("stamnummer"));
    return [...table.tBodies[0].rows]
        .map(tr => tr.cells[stamnummerIndex].textContent);
}

export async function fetchMailMergeFullData(schoolyear: string, infoBlock: InfoBlock) {
    infoBlock.infoBar.setExtraInfo("Filter voorbereiden...");
    let builder = await createWerklijstBuilderWithReset(schoolyear, Grouping.LES);
    builder.addFields([
        FIELD.STAMNUMMER,
        FIELD.NAAM,
        FIELD.VOORNAAM,
        FIELD.LEEFTIJD_31_DEC,
        FIELD.EMAIL_PUNTCOMMA,
        FIELD.DOMEIN,
        FIELD.VAK_NAAM,
        FIELD.GRAAD,
        FIELD.LEERJAAR,
        FIELD.BENAMING_LES,
        FIELD.LESMOMENTEN,
        FIELD.KLAS_LEERKRACHT,
        FIELD.VESTIGINGSPLAATS,
    ]);
    let preparedWerklijst = await builder.sendSettings();

    infoBlock.infoBar.setExtraInfo("Lesgegevens ophalen...");
    let fetchedTable = await preparedWerklijst.fetchTable(new InfoBarTableFetchListener(infoBlock));
    return fetchedTable.getTable();
}