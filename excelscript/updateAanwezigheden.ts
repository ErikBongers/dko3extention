function main(workbook: ExcelScript.Workbook) {
    setHighlight(workbook, "Updating...");
    if(workbook.getWorksheets().length < 2) {
        setError(workbook, "Geen 2e worksheet met data gevonden.");
        return;
    }
    invalidatePercentages(workbook); //todo: combine with updatePercentage()?
    updatePercentages(workbook);
}

enum MessageType { Info, Error, Highlight}

function setError(workbook: ExcelScript.Workbook, msg: string) {
    _setMessage(workbook, msg, MessageType.Error);
}

function setInfo(workbook: ExcelScript.Workbook, msg: string) {
    _setMessage(workbook, msg, MessageType.Info);
}

function setHighlight(workbook: ExcelScript.Workbook, msg: string) {
    _setMessage(workbook, msg, MessageType.Highlight);
}

function _setMessage(workbook: ExcelScript.Workbook, msg: string, type: MessageType) {
    let cell = workbook.getFirstWorksheet().getCell(1, 4);
    cell.setValue(msg);

    switch(type) {
        case MessageType.Error:
            cell.getFormat().getFill().setColor("FF0000");
            break;
        case MessageType.Highlight:
            cell.getFormat().getFill().setColor("FFFF00");
            break;
        case MessageType.Info:
            cell.getFormat().getFill().clear();
            break;
    }

    console.log(msg);
}

interface Aanwezigheid {
    naam: string,
    voornaam: string,
    vakReduced: string,
    // vak: string,
    percentFinancierbaar: number,
    // percentTotaal: number,
    // percentFinancierbaarAP: number,
    // percentTotaalAP: number,
    weken: string,
    codeP: number
}

interface Lln {
    key: string,
    aanwList: Aanwezigheid[]
}

interface TheData {
    dataInfo: string,
    llnMap: Map<string, Lln>
}

function getData(worksheet: ExcelScript.Worksheet) : TheData {

    let sourceRange = worksheet.getUsedRange();
    let sourceRangeValues = sourceRange.getValues();
    let rowCount = sourceRange.getRowCount();
    let lines: Array<string> = [];
    for (let row = 0; row < rowCount; row++) {
        //todo: test if row starts with "lln:"
        lines.push(sourceRangeValues[row][0].toString());
    }
    let dataInfo = "";
    let aanwList: Aanwezigheid[] = [];
    lines.forEach(line => {

        if (line.startsWith("lln: ")) {
            let lln = line.substring(5);
            let fields = lln.split(",");
            let aanw: Aanwezigheid = {
                naam: fields[0],
                voornaam: fields[1],
                vakReduced: fields[2],
                percentFinancierbaar: parseFloat(fields[3]),
                weken: fields[4],
                codeP: parseInt(fields[5])
            };
            aanwList.push(aanw);
        } else if (line.startsWith("data:")) {
            dataInfo = line.substring(5);
        }
    })
    // build llnList
    let llnList = new Map<string, Lln>();
    for(let aanw of aanwList) {
        let key = normalizeKey(aanw.naam + "," + aanw.voornaam);
        let lln = llnList.get(key);
        if (!lln) {
            lln = {
                key,
                aanwList: []
            }
            llnList.set(key, lln);
        }
        lln.aanwList.push(aanw);
    }
    return { dataInfo, llnMap: llnList };
}

function normalizeKey(key: string) {
    return key
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(" ", "");
}

function invalidatePercentages(workbook: ExcelScript.Workbook) {
    let table = workbook.getTable("MiserieTabel");
    let percentageColumn = table.getColumnByName("Percentage");
    let r = percentageColumn.getRangeBetweenHeaderAndTotal();
    let rangeValues = r.getValues();
    let rowCount = r.getRowCount();
    for(let i = 0; i < rowCount; i++) {
        let cell = r.getCell(i, 0);
        let value = rangeValues[i][0];
        if (typeof(value) === "string")
            continue;
        cell.setValue(`'(${(value as number)*100})`);
        // cell.setValue(value.replace("(", "").replace(")", ""));
    }
}

function updatePercentages(workbook: ExcelScript.Workbook) {
    let theData = getData(workbook.getLastWorksheet());
    let table = workbook.getTable("MiserieTabel");
    let tableRange = table.getRangeBetweenHeaderAndTotal();
    let tableValues = tableRange.getValues();
    let achterNaamColumn = table.getColumnByName("Achternaam").getIndex();
    let voorNaamColumn = table.getColumnByName("Voornaam").getIndex();
    let klasColumn = table.getColumnByName("Klas").getIndex();
    let percentColumn = table.getColumnByName("Percentage").getIndex();
    let wekenColumn = table.getColumnByName("Weken").getIndex();
    let peeColumn = table.getColumnByName("Ps").getIndex();
    let rowCount = table.getRowCount();
    for (let r = 0; r < rowCount; r++) {
        let achterNaamOrg = tableValues[r][achterNaamColumn] as string;
        let voorNaamOrg = tableValues[r][voorNaamColumn] as string;
        let achterNaam = tableValues[r][achterNaamColumn] as string;
        let voorNaam = tableValues[r][voorNaamColumn] as string;
        achterNaam = achterNaam.replace("?", "").replace("???", "").replace("??", "").replace("?", "");
        voorNaam = voorNaam.replace("?", "").replace("???", "").replace("??", "").replace("?", "");
        let klas = tableValues[r][klasColumn] as string;
        let percent = tableValues[r][percentColumn];
        let key = achterNaam + "," + voorNaam;
        key = normalizeKey(key);
        if (key === ",")
            continue;
        let lln = theData.llnMap.get(key);
        if(!lln) {
            tableRange.getCell(r, achterNaamColumn).setValue(achterNaam + "???");
            tableRange.getCell(r,voorNaamColumn).setValue(voorNaam + "???");
            continue;
        } else {
            tableRange.getCell(r, wekenColumn).setValue(lln.aanwList[0].weken);
            tableRange.getCell(r, peeColumn).setValue(lln.aanwList[0].codeP);
            if(achterNaamOrg.includes("?")) {
                tableRange.getCell(r, achterNaamColumn).setValue(achterNaam);
                tableRange.getCell(r,voorNaamColumn).setValue(voorNaam);
            }
        }

        //Do we haz the claz?
        let aanw: undefined | Aanwezigheid;
        for(let aan of lln.aanwList) {
            if(klas.includes(aan.vakReduced)) {
                aanw = aan;
                break;
            } else { // do some creative matching
                let klasj = klas;
                klasj = klasj.replace("&", "en");
                if (klasj.toLowerCase() === aan.vakReduced.toLowerCase()) {
                    aanw = aan;
                    break;
                }
            }
        }
        if(!aanw) {
            //todo: how to report that we couldn't find the class? Also with "???"
            continue;
        }
        if(typeof(percent) === "number") {
            if(aanw.percentFinancierbaar < percent) { // set the lowest value!
                tableRange.getCell(r, percentColumn).setValue(aanw.percentFinancierbaar);
            } //else: don't overwrite
        } else {
            tableRange.getCell(r, percentColumn).setValue(aanw.percentFinancierbaar);
        }
    }

    //filter problem students and add them to table if needed
    theData.llnMap.forEach((lln, key) => {
        if(lln.aanwList[0].codeP > 3) {
            let col = table.getColumn("Achternaam");
            let foundRange = col.getRangeBetweenHeaderAndTotal().find(normalizeKey(lln.aanwList[0].naam), { completeMatch: true, matchCase: true, searchDirection: ExcelScript.SearchDirection.forward});
            //TODO: if found: also check voornaam !!!
            if(!foundRange) {
                //add the row.
                table.addRow();
                let row = table.getRangeBetweenHeaderAndTotal().getLastRow();
                row.getCell(0, achterNaamColumn).setValue(lln.aanwList[0].naam);
                row.getCell(0, voorNaamColumn).setValue(lln.aanwList[0].voornaam);
                row.getCell(0, peeColumn).setValue(lln.aanwList[0].codeP);
            }
        }
    });
    setInfo(workbook, "Laatste update: " + theData.dataInfo);
}
