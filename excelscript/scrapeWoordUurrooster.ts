/// <reference path="./excelScript.d.ts" />
//https://github.com/sumurthy/officescripts-projects/blob/main/misc/index.d.ts
function main(workbook: ExcelScript.Workbook) {
    let fullRange = workbook.getActiveWorksheet().getUsedRange();
    scrapeUurrooster(workbook, fullRange);
}

function scrapeUurrooster(workbook: ExcelScript.Workbook, range: ExcelScript.Range) {
    let daysRow: ExcelScript.Range = findDaysRow(range);
    if(!daysRow)  {
        setError(workbook, "Geen rij met dagnamen gevonden.");
        return;
    } else {
        console.log("Found days row:", daysRow.getAddress());
    }
    let periodColumn: ExcelScript.Range = findPeriodColumn(range);
    if(!periodColumn)  {
        setError(workbook, "Geen kolom met lesmomenten gevonden.");
        return;
    } else {
        console.log("Found period column:", periodColumn.getAddress());
    }
}

function findDaysRow(range: ExcelScript.Range) {
    let rowCount = range.getRowCount();
    for (let i = 0; i < rowCount; i++) {
        if(isDaysRow(range.getRow(i)))
            return range.getRow(i);
    }
    return null;
}

function isDaysRow(row: ExcelScript.Range) {
    let columnCount  = row.getColumnCount();
    let matchCount = 0;
    for (let i = 0; i < columnCount; i++) {
        let cell = row.getCell(0, i);
        let value = cell.getValue().toString().trim().toLowerCase();
        switch (value) {
            case "maandag":
            case "dinsdag":
            case "woensdag":
            case "donderdag":
            case "vrijdag":
            case "zaterdag":
            case "zondag":
                matchCount++;
                break;
        }
        if(matchCount >= 3) //meh...good enough
            return true;
    }
    return false;
}

function findPeriodColumn(range: ExcelScript.Range) {
    let columnCount = range.getColumnCount();
    for (let i = 0; i < columnCount; i++) {
        if(isPeriodColumn(range.getColumn(i)))
            return range.getColumn(i);
    }
    return null;
}

function isPeriodColumn(column: ExcelScript.Range) {
    const periodRegex = /\d?\d[.:,]\d\d\s*-\s*\d?\d[.:,]\d\d/gm;  //hh:mm-hh:mm en variaties.
    let rowCount  =  column.getRowCount();
    for(let i = 0; i < rowCount; i++) {
        if(column.getCell(i, 0).getValue().toString().match(periodRegex))
            return true;
    }

    return false;
}

function _setMessage(workbook: ExcelScript.Workbook, msg: string, type: MessageType) {
    console.log(msg);
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

