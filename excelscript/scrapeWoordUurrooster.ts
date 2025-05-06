/// <reference path="./excelScript.d.ts" />
//https://github.com/sumurthy/officescripts-projects/blob/main/misc/index.d.ts
function main(workbook: ExcelScript.Workbook) {
    let fullRange = workbook.getActiveWorksheet().getUsedRange();
    scrapeUurrooster(workbook, fullRange);
}

function scrapeUurrooster(workbook: ExcelScript.Workbook, fullRange: ExcelScript.Range) {
    let data: Data = fullRange.getValues();
    let daysRow = findDaysRow(data);
    if(daysRow === undefined)  {
        setError(workbook, "Geen rij met dagnamen gevonden.");
        return;
    } else {
        console.log("daysRow: " + daysRow);
    }
    let periodColumn = findPeriodColumn(data);
    if(periodColumn === undefined)  {
        setError(workbook, "Geen kolom met lesmomenten gevonden.");
        return;
    } else {
        console.log("periodColumn: " + periodColumn);
    }

    // let mergedRanges = collectMergedRanges(fullRange);
    let mergedRanges = getMergedCellsCached();
    console.log(getCellValue(data, { row: 0, column: 1 }));
    console.log(getCellValue(data, { row: 0, column: 2 }));
}

type Value = string | number | boolean;
type Data = Value[][];

function getCellValue(data: Data, point: IdxPoint): string {
    return data[point.row][point.column].toString();
}

function findDaysRow(data: Data) {
    for (let [i, row] of data.entries()) {
        if(isDaysRow(row))
            return i;
    }
    return undefined;
}

function isDaysRow(row: Value[]) {
    let matchCount = 0;
    for (let value of row) {
        if(isDayName(value.toString()))
            matchCount++;
        if(matchCount >= 3) //meh...good enough
            return true;
    }
    return false;
}

function collectMergedRanges(fullRange: ExcelScript.Range) {
    let mergedRanges: IdxRange [] = [];
    for (let mergedRange of fullRange.getMergedAreas().getAreas()) {
        mergedRanges.push(rangeToIndexes(mergedRange));
    }
    return mergedRanges;
}

function collectDayRanges(workbook: ExcelScript.Workbook, fullRange: ExcelScript.Range, daysRow: ExcelScript.Range, day: string) {
}

function findPeriodColumn(data: Data) {
    let columnCount = data[0].length;
    for (let iCol = 0; iCol < columnCount; iCol++) {
        for (let row of data) {
            let value = row[iCol].toString();
            if(isPeriod(value))
                return iCol;
        }
    }
    return undefined;
}

function isPeriod(text: string) {
    const periodRegex = /\d?\d[.:,]\d\d\s*-\s*\d?\d[.:,]\d\d/gm;  //hh:mm-hh:mm en variaties.
    return !!text.match(periodRegex);

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

type IdxRange = {
    start: IdxPoint,
    end: IdxPoint
}
type IdxPoint = {
    row: number,
    column: number
}

function rangeToIndexes(range: ExcelScript.Range): IdxRange {
    let start: IdxPoint = { row: range.getRowIndex(), column: range.getColumnIndex() };
    let end: IdxPoint = { row: start.row + range.getRowCount()-1, column: start.column + range.getColumnCount()-1};
    return { start, end };
}

function getMergedCellsCached() {
    return [{"start":{"row":21,"column":6},"end":{"row":24,"column":6}},{"start":{"row":16,"column":3},"end":{"row":19,"column":3}},{"start":{"row":17,"column":5},"end":{"row":18,"column":5}},{"start":{"row":21,"column":16},"end":{"row":24,"column":16}},{"start":{"row":17,"column":6},"end":{"row":20,"column":6}},{"start":{"row":23,"column":9},"end":{"row":26,"column":9}},{"start":{"row":21,"column":9},"end":{"row":22,"column":9}},{"start":{"row":19,"column":9},"end":{"row":20,"column":9}},{"start":{"row":21,"column":15},"end":{"row":26,"column":15}},{"start":{"row":21,"column":14},"end":{"row":26,"column":14}},{"start":{"row":17,"column":4},"end":{"row":18,"column":4}},{"start":{"row":21,"column":12},"end":{"row":24,"column":12}},{"start":{"row":14,"column":9},"end":{"row":15,"column":9}},{"start":{"row":15,"column":27},"end":{"row":16,"column":27}},{"start":{"row":15,"column":12},"end":{"row":16,"column":12}},{"start":{"row":17,"column":12},"end":{"row":18,"column":12}},{"start":{"row":15,"column":25},"end":{"row":16,"column":25}},{"start":{"row":15,"column":26},"end":{"row":16,"column":26}},{"start":{"row":17,"column":26},"end":{"row":18,"column":26}},{"start":{"row":16,"column":9},"end":{"row":17,"column":9}},{"start":{"row":17,"column":10},"end":{"row":18,"column":10}},{"start":{"row":15,"column":13},"end":{"row":16,"column":13}},{"start":{"row":15,"column":17},"end":{"row":16,"column":17}},{"start":{"row":17,"column":11},"end":{"row":18,"column":11}},{"start":{"row":16,"column":20},"end":{"row":19,"column":20}},{"start":{"row":21,"column":19},"end":{"row":26,"column":19}},{"start":{"row":15,"column":31},"end":{"row":16,"column":31}},{"start":{"row":15,"column":29},"end":{"row":16,"column":29}},{"start":{"row":16,"column":28},"end":{"row":17,"column":28}},{"start":{"row":15,"column":30},"end":{"row":16,"column":30}},{"start":{"row":17,"column":30},"end":{"row":18,"column":30}},{"start":{"row":16,"column":24},"end":{"row":19,"column":24}},{"start":{"row":21,"column":20},"end":{"row":23,"column":20}},{"start":{"row":20,"column":30},"end":{"row":23,"column":30}},{"start":{"row":20,"column":29},"end":{"row":23,"column":29}},{"start":{"row":17,"column":29},"end":{"row":18,"column":29}},{"start":{"row":21,"column":21},"end":{"row":24,"column":21}},{"start":{"row":24,"column":20},"end":{"row":26,"column":20}},{"start":{"row":20,"column":28},"end":{"row":23,"column":28}},{"start":{"row":21,"column":24},"end":{"row":24,"column":24}},{"start":{"row":0,"column":29},"end":{"row":0,"column":31}},{"start":{"row":10,"column":17},"end":{"row":12,"column":17}},{"start":{"row":4,"column":25},"end":{"row":13,"column":25}},{"start":{"row":0,"column":25},"end":{"row":0,"column":28}},{"start":{"row":0,"column":17},"end":{"row":0,"column":24}},{"start":{"row":10,"column":31},"end":{"row":13,"column":31}},{"start":{"row":2,"column":18},"end":{"row":4,"column":18}},{"start":{"row":10,"column":20},"end":{"row":11,"column":20}},{"start":{"row":2,"column":23},"end":{"row":5,"column":23}},{"start":{"row":2,"column":22},"end":{"row":5,"column":22}},{"start":{"row":0,"column":1},"end":{"row":0,"column":7}},{"start":{"row":23,"column":1},"end":{"row":26,"column":1}},{"start":{"row":19,"column":1},"end":{"row":22,"column":1}},{"start":{"row":20,"column":8},"end":{"row":23,"column":8}},{"start":{"row":15,"column":8},"end":{"row":16,"column":8}},{"start":{"row":21,"column":2},"end":{"row":26,"column":2}},{"start":{"row":21,"column":5},"end":{"row":24,"column":5}},{"start":{"row":17,"column":8},"end":{"row":18,"column":8}},{"start":{"row":21,"column":3},"end":{"row":26,"column":3}},{"start":{"row":15,"column":4},"end":{"row":16,"column":4}},{"start":{"row":15,"column":7},"end":{"row":16,"column":7}},{"start":{"row":0,"column":8},"end":{"row":0,"column":16}},{"start":{"row":17,"column":7},"end":{"row":18,"column":7}},{"start":{"row":10,"column":7},"end":{"row":13,"column":7}},{"start":{"row":21,"column":4},"end":{"row":24,"column":4}},{"start":{"row":19,"column":10},"end":{"row":22,"column":10}},{"start":{"row":10,"column":8},"end":{"row":13,"column":8}},{"start":{"row":7,"column":32},"end":{"row":10,"column":32}},{"start":{"row":3,"column":32},"end":{"row":4,"column":32}},{"start":{"row":5,"column":32},"end":{"row":6,"column":32}},{"start":{"row":18,"column":27},"end":{"row":21,"column":27}},{"start":{"row":14,"column":28},"end":{"row":15,"column":28}},{"start":{"row":17,"column":31},"end":{"row":18,"column":31}},{"start":{"row":15,"column":11},"end":{"row":16,"column":11}},{"start":{"row":15,"column":10},"end":{"row":16,"column":10}},{"start":{"row":4,"column":13},"end":{"row":13,"column":13}},{"start":{"row":9,"column":22},"end":{"row":10,"column":22}},{"start":{"row":11,"column":22},"end":{"row":12,"column":22}},{"start":{"row":13,"column":22},"end":{"row":14,"column":22}},{"start":{"row":12,"column":20},"end":{"row":15,"column":20}},{"start":{"row":20,"column":26},"end":{"row":23,"column":26}},{"start":{"row":22,"column":27},"end":{"row":25,"column":27}}];
}