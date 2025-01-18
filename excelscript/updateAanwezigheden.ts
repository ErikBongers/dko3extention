function main(workbook: ExcelScript.Workbook) {
    setHighlight(workbook, "Updating...");
    if(workbook.getWorksheets().length < 2) {
        setError(workbook, "Geen 2e worksheet met data gevonden.");
        return;
    }
    let tableName = "MiserieTabel";
    invalidateData(workbook, tableName); //todo: combine with updatePercentage()?
    updatePercentages(workbook, tableName);
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

interface Leraar {
    leraar: string,
    Ps: number
}

interface TheData {
    dataInfo: string,
    llnMap: Map<string, Lln>,
    leraarList: Leraar[]
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
    let leraarList: Leraar[] = [];
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
        } else if (line.startsWith("leraar: ")) {
            let leraar = line.substring(8);
            let fields = leraar.split(",");
            let lk: Leraar = {
                leraar: fields[0] + ", " + fields[1],
                Ps: parseInt(fields[2])
            };
            leraarList.push(lk);
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
    return { dataInfo, llnMap: llnList, leraarList };
}

function normalizeKey(key: string) {
    return key
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(" ", "");
}

function invalidateData(workbook: ExcelScript.Workbook, tableName: string) {
    let table = workbook.getTable(tableName);
    let percentageColumn = table.getColumnByName("Percentage");
    let peeColumn = table.getColumnByName("Ps");
    let r = percentageColumn.getRangeBetweenHeaderAndTotal();
    let p = peeColumn.getRangeBetweenHeaderAndTotal();
    let rangeValues = r.getValues();
    let peeValues = p.getValues();
    let rowCount = r.getRowCount();
    for(let i = 0; i < rowCount; i++) {
        let percCell = r.getCell(i, 0);
        let perc = rangeValues[i][0];
        if (typeof(perc) === "string")
            continue;
        percCell.setValue(`'(${(perc as number)*100})`);
        let peeCell = p.getCell(i, 0);
        let pee = peeValues[i][0];
        if (typeof (perc) === "string")
            continue;
        peeCell.setValue(`'(${pee as number})`);
    }
}

function updatePercentages(workbook: ExcelScript.Workbook, tableName: string) {
    let theData = getData(workbook.getLastWorksheet());
    console.log(theData);
    let table = workbook.getTable(tableName);
    let tableRange = table.getRangeBetweenHeaderAndTotal();
    let tableValues = tableRange.getValues();
    let achterNaamColumn = table.getColumnByName("Achternaam").getIndex();
    let voorNaamColumn = table.getColumnByName("Voornaam").getIndex();
    let klasColumn = table.getColumnByName("Klas").getIndex();
    let percentColumn = table.getColumnByName("Percentage").getIndex();
    let wekenColumn = table.getColumnByName("Weken").getIndex();
    let peeColumn = table.getColumnByName("Ps").getIndex();
    let rowCount = table.getRowCount();
    let tableKeys = new Set<string>();

    for (let r = 0; r < rowCount; r++) {
        let achterNaamOrg = tableValues[r][achterNaamColumn] as string;
        let voorNaamOrg = tableValues[r][voorNaamColumn] as string;
        let achterNaam = tableValues[r][achterNaamColumn] as string;
        let voorNaam = tableValues[r][voorNaamColumn] as string;
        achterNaam = achterNaam.replace("?", "").replace("???", "").replace("??", "").replace("?", "");
        voorNaam = voorNaam.replace("?", "").replace("???", "").replace("??", "").replace("?", "");
        let klas = tableValues[r][klasColumn] as string;
        let percent = tableValues[r][percentColumn];
        let pee = tableValues[r][peeColumn];
        let key = achterNaam + "," + voorNaam;
        key = normalizeKey(key);
        tableKeys.add(key);
        if (key === ",")
            continue;
        let lln = theData.llnMap.get(key);
        if(!lln) {
            tableRange.getCell(r, achterNaamColumn).setValue(achterNaam + "???");
            tableRange.getCell(r,voorNaamColumn).setValue(voorNaam + "???");
            continue;
        } else {
            tableRange.getCell(r, wekenColumn).setValue(lln.aanwList[0].weken);
            if(achterNaamOrg.includes("?")) {
                tableRange.getCell(r, achterNaamColumn).setValue(achterNaam);
                tableRange.getCell(r,voorNaamColumn).setValue(voorNaam);
            }
        }

        function updateAanw(aanw: Aanwezigheid) {
            if (typeof (percent) === "number") {
                if (aanw.percentFinancierbaar < percent) { // set the lowest value!
                    tableRange.getCell(r, percentColumn).setValue(aanw.percentFinancierbaar);
                    percent = aanw.percentFinancierbaar;
                } //else: don't overwrite
            } else {
                tableRange.getCell(r, percentColumn).setValue(aanw.percentFinancierbaar);
                percent = aanw.percentFinancierbaar;
            }
        }
        function updatePee(aanw: Aanwezigheid) {
            if (typeof (pee) === "number") {
                if (aanw.codeP > pee) { // set the highest value!
                    tableRange.getCell(r, peeColumn).setValue(aanw.codeP);
                    pee = aanw.codeP;
                } //else: don't overwrite
            } else {
                tableRange.getCell(r, peeColumn).setValue(aanw.codeP);
                pee = aanw.codeP;
            }
        }
        //Do we haz the claz?
        let foundAanw = false;
        for(let aan of lln.aanwList) {
            if(hazClazz(klas, aan.vakReduced)) {
                foundAanw = true;
                updateAanw(aan);
                updatePee(aan);
            } else { // do some creative matching
                let klasj = klas;
                klasj = klasj.replace("&", "en");
                if (klasj.toLowerCase() === aan.vakReduced.toLowerCase()) {
                    foundAanw = true;
                    updateAanw(aan);
                    updatePee(aan);
                }
            }
        }
        if(!foundAanw) {
            //todo: how to report that we couldn't find the class? Also with "???"
            continue;
        }
    }

    // if vakReduced is an abbreviation, it will be in uppercase and we should not do a case-incensitive find.
    function hazClazz(klasses: string, vakReduced: string): boolean {
        if(klasses.includes(vakReduced))
            return true;

        let vakLowercase = vakReduced.toLowerCase();
        if(vakReduced === vakLowercase)
            return klasses.toLowerCase().includes(vakLowercase);

        return false;
    }

    //filter problem students and add them to table if needed
    theData.llnMap.forEach((lln, key) => {
        if(hasIssues(lln)) {
            if (!tableKeys.has(key)) {
                table.addRow();
                let row = table.getRangeBetweenHeaderAndTotal().getLastRow();
                row.getCell(0, achterNaamColumn).setValue(lln.aanwList[0].naam);
                row.getCell(0, voorNaamColumn).setValue(lln.aanwList[0].voornaam);
                row.getCell(0, klasColumn).setValue(lln.aanwList.map(aanw => aanw.vakReduced).join(" en "));

                row.getCell(0, peeColumn).setValue(lln.aanwList[0].codeP);
                row.getCell(0, wekenColumn).setValue(Math.max(...lln.aanwList.map(aanw => parseInt(aanw.weken))));
                row.getCell(0, percentColumn).setValue(Math.min(...lln.aanwList.map(aanw => aanw.percentFinancierbaar)))
            }
        }
    });
    let leraarTable = workbook.getTable("PsPerLeraar");
    let leraarRange = leraarTable.getRangeBetweenHeaderAndTotal();
    leraarRange.clear();
    console.log(leraarRange.getCell(0, 0).getRowIndex());
    console.log(leraarRange.getCell(0, 0).getColumnIndex());
    let newRange = leraarRange.getWorksheet()
        .getRangeByIndexes(
            leraarRange.getCell(0, 0).getRowIndex(),
            leraarRange.getCell(0, 0).getColumnIndex(),
            theData.leraarList.length,
            2);
    for (let r = 0; r < theData.leraarList.length; r++) {
        newRange.getCell(r, 0).setValue(theData.leraarList[r].leraar);
        newRange.getCell(r, 1).setValue(theData.leraarList[r].Ps);
    }
    setInfo(workbook, "Laatste update: " + theData.dataInfo);
}


function hasIssues(lln: Lln): boolean {
    for(let aanw of lln.aanwList) {
        if(aanw.codeP > 3)
            return true;
        if(parseInt(aanw.weken) >= 3) //TODO: could have more than one value...
            return true;
        if(aanw.percentFinancierbaar < 0.66)
            return true;
    }
    return false;
}

