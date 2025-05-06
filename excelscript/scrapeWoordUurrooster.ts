/// <reference path="./excelScript.d.ts" />
//https://github.com/sumurthy/officescripts-projects/blob/main/misc/index.d.ts
function main(workbook: ExcelScript.Workbook) {
    let fullRange = workbook.getActiveWorksheet().getUsedRange();
    scrapeUurrooster(workbook, fullRange);
}

function scrapeUurrooster(workbook: ExcelScript.Workbook, fullRange: ExcelScript.Range) {
    let daysRow: ExcelScript.Range = findDaysRow(fullRange);
    if(!daysRow)  {
        setError(workbook, "Geen rij met dagnamen gevonden.");
        return;
    } else {
        console.log("Found days row:", daysRow.getAddress());
    }
    let periodColumn: ExcelScript.Range = findPeriodColumn(fullRange);
    if(!periodColumn)  {
        setError(workbook, "Geen kolom met lesmomenten gevonden.");
        return;
    } else {
        console.log("Found period column:", periodColumn.getAddress());
    }

    let data = fullRange.getValues();
    console.log(data);

    let dayBlocks =  collectDayRanges(workbook, fullRange, daysRow, "maandag");
    console.log("Dayblocks: ");
    for(let dayBlock of dayBlocks) {
        let range = workbook.getActiveWorksheet().getRange(dayBlock.rangeAddress);
        showRangeData(range);
    }
}

function findDaysRow(fullRange: ExcelScript.Range) {
    let rowCount = fullRange.getRowCount();
    for (let i = 0; i < rowCount; i++) {
        if(isDaysRow(fullRange.getRow(i)))
            return fullRange.getRow(i);
    }
    return null;
}

function isDaysRow(row: ExcelScript.Range) {
    let columnCount  = row.getColumnCount();
    let matchCount = 0;
    for (let i = 0; i < columnCount; i++) {
        let cell = row.getCell(0, i);
        let value = cell.getValue().toString().trim().toLowerCase();
        if(isDayName(value))
                matchCount++;
        if(matchCount >= 3) //meh...good enough
            return true;
    }
    return false;
}

type DayBlock = {
    day: string,
    rangeAddress: string
}

function collectDayRanges(workbook: ExcelScript.Workbook, fullRange: ExcelScript.Range, daysRow: ExcelScript.Range, day: string) {
    console.log(daysRow.getValues());
    let daysRanges: DayBlock [] = [];
    for (let mergedRange of daysRow.getMergedAreas().getAreas()) {
        if(isDayName(mergedRange.getValue().toString())) {
            //todo: rowcount is only correct id the dayRow is the FIRST row in fullRange!
            let dayBlockRange = mergedRange.getResizedRange(fullRange.getRowCount(), 1).getResizedRange(0, -1);
            daysRanges.push({day: mergedRange.getValue().toString(), rangeAddress: dayBlockRange.getAddress()});
        }
    }

    for(let i = 0; i <= daysRow.getColumnCount(); i++) {
        let cell = daysRow.getCell(0, i);
        if(!isDayName(cell.getValue().toString()))
            continue;
        if (!isInMergedArea(cell)) {
            let dayBlockRange = cell.getResizedRange(fullRange.getRowCount(), 1).getResizedRange(0, -1);
            daysRanges.push({day: cell.getValue().toString(), rangeAddress: dayBlockRange.getAddress()});
        }
    }
    return daysRanges;

    function isInMergedArea(range: ExcelScript.Range) {
        return daysRanges.some(d => {
            let blockRange = workbook.getActiveWorksheet().getRange(d.rangeAddress);
            return blockRange.getBoundingRect(range).getAddress() === blockRange.getAddress();
        });
    }
}

function findPeriodColumn(fullRange: ExcelScript.Range) {
    let columnCount = fullRange.getColumnCount();
    for (let i = 0; i < columnCount; i++) {
        if(isPeriodColumn(fullRange.getColumn(i)))
            return fullRange.getColumn(i);
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

function isDayName(text: string) {
        switch (text.toLowerCase()) {
            case "maandag":
            case "dinsdag":
            case "woensdag":
            case "donderdag":
            case "vrijdag":
            case "zaterdag":
            case "zondag":
                return true;
            default:
                return false;

        }
    }

function showRangeData(range: ExcelScript.Range) {
    console.log(range.getAddress() + ", " + range.getCellCount() + ", " + range.getValue() + ", [(" + range.getColumnIndex() + ", " + range.getRowIndex() + ")-(" + range.getLastCell().getRowIndex() + ", " + range.getLastCell().getColumnIndex() + ")]");
}

function rangeToIndexes(range: ExcelScript.Range) {
    return { range.getColumnIndex() + ", " + range.getRowIndex() + ")-(" + range.getLastCell().getRowIndex() + ", " + range.getLastCell().getColumnIndex() + ")]");

}