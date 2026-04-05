/// <reference path="./excelScript.d.ts" />
//https://github.com/sumurthy/officescripts-projects/blob/main/misc/index.d.ts

type Value = string | number | boolean;
type Data = Value[][];
type IdxRange = {
    start: IdxPoint,
    end: IdxPoint
}
type IdxPoint = {
    row: number,
    column: number
}

async function main(workbook: ExcelScript.Workbook) {
    let fullRange = workbook.getActiveWorksheet().getUsedRange();
    let data: Data = fullRange.getValues();
    console.log("data");
    let mergedRanges: IdxRange[] = collectMergedRanges(fullRange);
    console.log("json");
    let json = {data, mergedRanges};
    console.log("to string");
    console.log(JSON.stringify(json));
    console.log("sending...");
    let res = await fetch("https://europe-west1-ebo-tain.cloudfunctions.net/json?fileName=testExcel.json", {
        method: "POST",
        body: JSON.stringify(json),
    });

    let txt: string = await res.json();
    console.log(txt);
}

function collectMergedRanges(fullRange: ExcelScript.Range) {
    let mergedRanges: IdxRange[] = [];
    let areas = fullRange.getMergedAreas().getAreas();
    console.log("areas");
    for (let mergedRange of areas) {
        mergedRanges.push(rangeToIndexes(mergedRange));
    }
    return mergedRanges;
}

function rangeToIndexes(range: ExcelScript.Range): IdxRange {
    let start: IdxPoint = { row: range.getRowIndex(), column: range.getColumnIndex() };
    let end: IdxPoint = { row: start.row + range.getRowCount() - 1, column: start.column + range.getColumnCount() - 1 };
    return { start, end };
}

function _setMessage(workbook: ExcelScript.Workbook, msg: string, type: MessageType) {
    console.log(msg);
}

enum MessageType { Info, Error, Highlight }

function setError(workbook: ExcelScript.Workbook, msg: string) {
    _setMessage(workbook, msg, MessageType.Error);
}

function setInfo(workbook: ExcelScript.Workbook, msg: string) {
    _setMessage(workbook, msg, MessageType.Info);
}

function setHighlight(workbook: ExcelScript.Workbook, msg: string) {
    _setMessage(workbook, msg, MessageType.Highlight);
}