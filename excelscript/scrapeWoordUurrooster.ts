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

type Time = {
    hour: number,
    minutes: number
}

type TimeSlice = {
    start: Time,
    end: Time
}

type ClassDef = {
    day: string,
    teacher: string,
    timeSlice: TimeSlice,
    gradeYear: string,
    description: string
}


function main(workbook: ExcelScript.Workbook) {
    let fullRange = workbook.getActiveWorksheet().getUsedRange();
    scrapeUurrooster(workbook, fullRange);
}

let data: Data = undefined;
let daysRow: number = undefined;
let periodColumn: number = undefined;
let mergedRanges: IdxRange[] = undefined;
let timeSlices: TimeSlice[] = undefined;

function scrapeUurrooster(workbook: ExcelScript.Workbook, fullRange: ExcelScript.Range) {
    data = fullRange.getValues();
    daysRow = findDaysRow(data);
    if(daysRow === undefined)  {
        setError(workbook, "Geen rij met dagnamen gevonden.");
        return;
    } else {
        console.log("daysRow: " + daysRow);
    }
    periodColumn = findPeriodColumn(data);
    let lastPeriodRow = findLastPeriodRow();
    if(periodColumn === undefined)  {
        setError(workbook, "Geen kolom met lesmomenten gevonden.");
        return;
    } else {
        console.log("periodColumn: " + periodColumn);
    }

    // let mergedRanges = collectMergedRanges(fullRange);
    // console.log(JSON.stringify(mergedRanges));
    mergedRanges = getMergedCellsCached();

    timeSlices = createTimeSlices();
    scrapeColumn(5);
}

function findLastPeriodRow() {
    return data
        .map((row, index) => isPeriod(row[periodColumn].toString()) ? index : -1)
        .filter(n => n > 0)
        .pop();
}

function scrapeColumn(column: number) {
    let day = getCellValue({row: daysRow, column} as IdxPoint)
    let teacher = getCellValue({ row: daysRow+1, column});
    for(let row = daysRow+2; row < data.length; row++) {
        let mergedRange = getMergedRangeForCell({row, column});
        let cellValue = getCellValue({row, column})
        if (cellValue) {
            let timeSlice: TimeSlice = undefined;
            if (mergedRange) {
                let sliceStart = timeSlices[mergedRange.start.row];
                let sliceEnd = timeSlices[mergedRange.end.row];
                timeSlice = {start: sliceStart.start, end: sliceEnd.end};
                row = mergedRange.end.row;
            } else {
                timeSlice = timeSlices[row];
            }
            let times = findTimes(cellValue);
            if(times.length ===2) {
                timeSlice = {
                    start: times[0],
                    end: times[1]
                };
            } else if(times.length === 1) {
                timeSlice = moveTimeSliceTo(timeSlice, times[0]);
            }
            //todo: adjust timeSlice to the found times. If only one time, use that as a starting point and keep the length of the original slice. Create function moveTimeSliceTo().
            let classDef: ClassDef = {
                teacher,
                day,
                timeSlice,
                gradeYear: "todo",
                description: cellValue
            };
            console.log(JSON.stringify(classDef));
        }
    }
}

type GradeYear = {
    grade: string,
    year: number
}

function findGradeYears(cellValue: string) {
    let gradeYears: GradeYear[] = [];
    let rx = /\s+(?:(?:([\d])\.(\d))|(S)(\d))(?:\s?[,+\/]\s?(?:(?:([\d])\.(\d))|(S)(\d)))?(?:\s?[,+\/]\s?(?:(?:([\d])\.(\d))|(S)(\d)))?(?:\s?[,+\/]\s?(?:(?:([\d])\.(\d))|(S)(\d)))?(?:\s?[,+\/]\s?(?:(?:([\d])\.(\d))|(S)(\d)))?/gm;
    let matches = rx.exec(text);
    for(i=1; i > matches.length; i+=2) {
        let gradeYear: GradeYear = {
            grade: matches[i],
            year: parseInt(matches[2])
        };
        gradeYears.push(time);
        matches = rx.exec(text);
    }
    return gradeYears;

}

function moveTimeSliceTo(timeSlice: TimeSlice, newStart: Time) {
    let newSlice = timeSlice;
    let startMinutes = timeSlice.start.hour * 60 + timeSlice.start.minutes;
    let endMinutes = timeSlice.end.hour * 60 + timeSlice.end.minutes;
    let duration = endMinutes - startMinutes;
    timeSlice.start = newStart;
    let newEndMinutes = newStart.hour * 60 + newStart.minutes + duration;
    newSlice.end.hour = Math.trunc(newEndMinutes / 60);
    newSlice.end.minutes = newEndMinutes % 60;
    return newSlice;
}

function findTimes(text: string) {
    let times: Time[] = [];
    let rx = /\s+(\d?\d)[.:,](\d\d)/gm;
    let matches = rx.exec(text);
    while(matches) {
        let time: Time = {
            hour: parseInt(matches[1]),
            minutes: parseInt(matches[2])
        };
        times.push(time);
        matches = rx.exec(text);
    }
    return times;
}

function createTimeSlices() {
    let timeSlices: TimeSlice[] = [];

    for(let row = 0; row < data.length; row++) {
        let rx = /(\d?\d)[.:,](\d\d)\s*-\s*(\d?\d)[.:,](\d\d)/gm;
        let value = getCellValue({row, column: periodColumn});
        let matches = rx.exec(value);
        if(matches) {
            let timeSlice: TimeSlice = {
                start: {
                    hour: parseInt(matches[1]),
                    minutes: parseInt(matches[2])
                },
                end: {
                    hour: parseInt(matches[3]),
                    minutes: parseInt(matches[4])
                }
            };
            timeSlices.push(timeSlice);
        } else {
            timeSlices.push(undefined);
        }
    }
    return timeSlices;
}

function getCellValue(point: IdxPoint): string {
    let mergedRange = getMergedRangeForCell(point);
    if(mergedRange)
        return data[mergedRange.start.row][mergedRange.start.column].toString();
    else
        return data[point.row][point.column].toString();
}

function getMergedRangeForCell(point: IdxPoint): IdxRange | undefined {
    return mergedRanges.find(range => {
        return point.row >= range.start.row
            && point.row <= range.end.row
            && point.column >= range.start.column
            && point.column <= range.end.column;
    });
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

// noinspection JSUnusedGlobalSymbols
function collectMergedRanges(fullRange: ExcelScript.Range) {
    let mergedRanges: IdxRange [] = [];
    for (let mergedRange of fullRange.getMergedAreas().getAreas()) {
        mergedRanges.push(rangeToIndexes(mergedRange));
    }
    return mergedRanges;
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

function rangeToIndexes(range: ExcelScript.Range): IdxRange {
    let start: IdxPoint = { row: range.getRowIndex(), column: range.getColumnIndex() };
    let end: IdxPoint = { row: start.row + range.getRowCount()-1, column: start.column + range.getColumnCount()-1};
    return { start, end };
}

function getMergedCellsCached(): IdxRange[] {
    return [{"start":{"row":13,"column":9},"end":{"row":16,"column":9}},{"start":{"row":10,"column":33},"end":{"row":13,"column":33}},{"start":{"row":6,"column":33},"end":{"row":7,"column":33}},{"start":{"row":8,"column":33},"end":{"row":9,"column":33}},{"start":{"row":21,"column":28},"end":{"row":24,"column":28}},{"start":{"row":17,"column":29},"end":{"row":18,"column":29}},{"start":{"row":20,"column":32},"end":{"row":21,"column":32}},{"start":{"row":18,"column":12},"end":{"row":19,"column":12}},{"start":{"row":18,"column":11},"end":{"row":19,"column":11}},{"start":{"row":7,"column":14},"end":{"row":16,"column":14}},{"start":{"row":12,"column":23},"end":{"row":13,"column":23}},{"start":{"row":14,"column":23},"end":{"row":15,"column":23}},{"start":{"row":16,"column":23},"end":{"row":17,"column":23}},{"start":{"row":15,"column":21},"end":{"row":18,"column":21}},{"start":{"row":23,"column":27},"end":{"row":26,"column":27}},{"start":{"row":25,"column":28},"end":{"row":28,"column":28}},{"start":{"row":3,"column":2},"end":{"row":3,"column":8}},{"start":{"row":26,"column":2},"end":{"row":29,"column":2}},{"start":{"row":22,"column":2},"end":{"row":25,"column":2}},{"start":{"row":23,"column":9},"end":{"row":26,"column":9}},{"start":{"row":18,"column":9},"end":{"row":19,"column":9}},{"start":{"row":24,"column":3},"end":{"row":29,"column":3}},{"start":{"row":24,"column":6},"end":{"row":27,"column":6}},{"start":{"row":20,"column":9},"end":{"row":21,"column":9}},{"start":{"row":24,"column":4},"end":{"row":29,"column":4}},{"start":{"row":18,"column":5},"end":{"row":19,"column":5}},{"start":{"row":18,"column":8},"end":{"row":19,"column":8}},{"start":{"row":3,"column":9},"end":{"row":3,"column":17}},{"start":{"row":20,"column":8},"end":{"row":21,"column":8}},{"start":{"row":13,"column":8},"end":{"row":16,"column":8}},{"start":{"row":24,"column":5},"end":{"row":27,"column":5}},{"start":{"row":22,"column":11},"end":{"row":25,"column":11}},{"start":{"row":3,"column":30},"end":{"row":3,"column":32}},{"start":{"row":13,"column":18},"end":{"row":15,"column":18}},{"start":{"row":7,"column":26},"end":{"row":16,"column":26}},{"start":{"row":3,"column":26},"end":{"row":3,"column":29}},{"start":{"row":3,"column":18},"end":{"row":3,"column":25}},{"start":{"row":13,"column":32},"end":{"row":16,"column":32}},{"start":{"row":5,"column":19},"end":{"row":7,"column":19}},{"start":{"row":13,"column":21},"end":{"row":14,"column":21}},{"start":{"row":5,"column":24},"end":{"row":8,"column":24}},{"start":{"row":5,"column":23},"end":{"row":8,"column":23}},{"start":{"row":24,"column":20},"end":{"row":29,"column":20}},{"start":{"row":18,"column":32},"end":{"row":19,"column":32}},{"start":{"row":18,"column":30},"end":{"row":19,"column":30}},{"start":{"row":19,"column":29},"end":{"row":20,"column":29}},{"start":{"row":18,"column":31},"end":{"row":19,"column":31}},{"start":{"row":20,"column":31},"end":{"row":21,"column":31}},{"start":{"row":19,"column":25},"end":{"row":22,"column":25}},{"start":{"row":24,"column":21},"end":{"row":26,"column":21}},{"start":{"row":23,"column":31},"end":{"row":26,"column":31}},{"start":{"row":23,"column":30},"end":{"row":26,"column":30}},{"start":{"row":20,"column":30},"end":{"row":21,"column":30}},{"start":{"row":24,"column":22},"end":{"row":27,"column":22}},{"start":{"row":27,"column":21},"end":{"row":29,"column":21}},{"start":{"row":23,"column":29},"end":{"row":26,"column":29}},{"start":{"row":24,"column":25},"end":{"row":27,"column":25}},{"start":{"row":17,"column":10},"end":{"row":18,"column":10}},{"start":{"row":18,"column":28},"end":{"row":19,"column":28}},{"start":{"row":18,"column":13},"end":{"row":19,"column":13}},{"start":{"row":20,"column":13},"end":{"row":21,"column":13}},{"start":{"row":18,"column":26},"end":{"row":19,"column":26}},{"start":{"row":18,"column":27},"end":{"row":19,"column":27}},{"start":{"row":20,"column":27},"end":{"row":21,"column":27}},{"start":{"row":19,"column":10},"end":{"row":20,"column":10}},{"start":{"row":20,"column":11},"end":{"row":21,"column":11}},{"start":{"row":18,"column":14},"end":{"row":19,"column":14}},{"start":{"row":18,"column":18},"end":{"row":19,"column":18}},{"start":{"row":20,"column":12},"end":{"row":21,"column":12}},{"start":{"row":19,"column":21},"end":{"row":22,"column":21}},{"start":{"row":24,"column":7},"end":{"row":27,"column":7}},{"start":{"row":19,"column":4},"end":{"row":22,"column":4}},{"start":{"row":20,"column":6},"end":{"row":21,"column":6}},{"start":{"row":24,"column":17},"end":{"row":27,"column":17}},{"start":{"row":20,"column":7},"end":{"row":23,"column":7}},{"start":{"row":26,"column":10},"end":{"row":29,"column":10}},{"start":{"row":24,"column":10},"end":{"row":25,"column":10}},{"start":{"row":22,"column":10},"end":{"row":23,"column":10}},{"start":{"row":24,"column":16},"end":{"row":29,"column":16}},{"start":{"row":24,"column":15},"end":{"row":29,"column":15}},{"start":{"row":20,"column":5},"end":{"row":21,"column":5}},{"start":{"row":24,"column":13},"end":{"row":27,"column":13}}];
}

type Tag = {
    tag: string,
    searchString: string
}

let tagDefs: Tag[] = [
    { tag: "Sterrenkijker", searchString: " ster"},
    { tag: "Sterrenkijker", searchString: " durlet"},
    { tag: "Kleine Stad", searchString: " stad"},
    { tag: "Kleine Wereld", searchString: " wereld"},
    { tag: "De Nieuwe Vrede", searchString: " vrede"},
    { tag: "De Nieuwe Vrede", searchString: " dnv"},
    { tag: "De Kosmos", searchString: " kosmos"},
    { tag: "De Schatkist", searchString: " schat"},
    { tag: "De Kolibrie", searchString: " kolibri"},
    { tag: "Albereke", searchString: " albere"},
];

let locationDefs: string[] = [
    "Sterrenkijker",
    "Kleine Stad",
    "Kleine Wereld",
    "De Nieuwe Vrede",
    "De Kosmos",
    "De Schatkist",
    "De Kolibrie",
    "Albereke",
];

function findLocation(cellValue: string) {
    return tagDefs.find(def => cellValue.toLowerCase().includes(def.searchString))?.tag;
}

function findTags(workbook: ExcelScript.Workbook) {
    let tblTags = workbook.getActiveWorksheet().getTable("labels");
    if(!tblTags)
        tblTags = workbook.getActiveWorksheet().getTable("Labels");
    if(tblTags)
      return getTagDefsFromTable(tblTags);
    return undefined;
}

function getTagDefsFromTable(table: ExcelScript.Table) {
    let translations: Tag[] = [];

    let idxTag: number = undefined;
    let idxSearchString: number = undefined;

    let headers: Value[][] = table.getHeaderRowRange().getValues();
    headers[0].forEach((cell, i) => {
        if(cell.toString() === "zoek")
            idxSearchString = i;
        if(cell.toString() === "label")
            idxTag = i;
    });
    if(idxTag == undefined || idxSearchString == undefined) {
        alert("Tabel met labels heeft niet de juiste kolommen: 'zoek' en 'label'");
        return undefined;
    }

    return translations;
}

function getMergedCellsCached(): IdxRange[] {
    return [{"start":{"row":13,"column":9},"end":{"row":16,"column":9}},{"start":{"row":10,"column":33},"end":{"row":13,"column":33}},{"start":{"row":6,"column":33},"end":{"row":7,"column":33}},{"start":{"row":8,"column":33},"end":{"row":9,"column":33}},{"start":{"row":21,"column":28},"end":{"row":24,"column":28}},{"start":{"row":17,"column":29},"end":{"row":18,"column":29}},{"start":{"row":20,"column":32},"end":{"row":21,"column":32}},{"start":{"row":18,"column":12},"end":{"row":19,"column":12}},{"start":{"row":18,"column":11},"end":{"row":19,"column":11}},{"start":{"row":7,"column":14},"end":{"row":16,"column":14}},{"start":{"row":12,"column":23},"end":{"row":13,"column":23}},{"start":{"row":14,"column":23},"end":{"row":15,"column":23}},{"start":{"row":16,"column":23},"end":{"row":17,"column":23}},{"start":{"row":15,"column":21},"end":{"row":18,"column":21}},{"start":{"row":23,"column":27},"end":{"row":26,"column":27}},{"start":{"row":25,"column":28},"end":{"row":28,"column":28}},{"start":{"row":3,"column":2},"end":{"row":3,"column":8}},{"start":{"row":26,"column":2},"end":{"row":29,"column":2}},{"start":{"row":22,"column":2},"end":{"row":25,"column":2}},{"start":{"row":23,"column":9},"end":{"row":26,"column":9}},{"start":{"row":18,"column":9},"end":{"row":19,"column":9}},{"start":{"row":24,"column":3},"end":{"row":29,"column":3}},{"start":{"row":24,"column":6},"end":{"row":27,"column":6}},{"start":{"row":20,"column":9},"end":{"row":21,"column":9}},{"start":{"row":24,"column":4},"end":{"row":29,"column":4}},{"start":{"row":18,"column":5},"end":{"row":19,"column":5}},{"start":{"row":18,"column":8},"end":{"row":19,"column":8}},{"start":{"row":3,"column":9},"end":{"row":3,"column":17}},{"start":{"row":20,"column":8},"end":{"row":21,"column":8}},{"start":{"row":13,"column":8},"end":{"row":16,"column":8}},{"start":{"row":24,"column":5},"end":{"row":27,"column":5}},{"start":{"row":22,"column":11},"end":{"row":25,"column":11}},{"start":{"row":3,"column":30},"end":{"row":3,"column":32}},{"start":{"row":13,"column":18},"end":{"row":15,"column":18}},{"start":{"row":7,"column":26},"end":{"row":16,"column":26}},{"start":{"row":3,"column":26},"end":{"row":3,"column":29}},{"start":{"row":3,"column":18},"end":{"row":3,"column":25}},{"start":{"row":13,"column":32},"end":{"row":16,"column":32}},{"start":{"row":5,"column":19},"end":{"row":7,"column":19}},{"start":{"row":13,"column":21},"end":{"row":14,"column":21}},{"start":{"row":5,"column":24},"end":{"row":8,"column":24}},{"start":{"row":5,"column":23},"end":{"row":8,"column":23}},{"start":{"row":24,"column":20},"end":{"row":29,"column":20}},{"start":{"row":18,"column":32},"end":{"row":19,"column":32}},{"start":{"row":18,"column":30},"end":{"row":19,"column":30}},{"start":{"row":19,"column":29},"end":{"row":20,"column":29}},{"start":{"row":18,"column":31},"end":{"row":19,"column":31}},{"start":{"row":20,"column":31},"end":{"row":21,"column":31}},{"start":{"row":19,"column":25},"end":{"row":22,"column":25}},{"start":{"row":24,"column":21},"end":{"row":26,"column":21}},{"start":{"row":23,"column":31},"end":{"row":26,"column":31}},{"start":{"row":23,"column":30},"end":{"row":26,"column":30}},{"start":{"row":20,"column":30},"end":{"row":21,"column":30}},{"start":{"row":24,"column":22},"end":{"row":27,"column":22}},{"start":{"row":27,"column":21},"end":{"row":29,"column":21}},{"start":{"row":23,"column":29},"end":{"row":26,"column":29}},{"start":{"row":24,"column":25},"end":{"row":27,"column":25}},{"start":{"row":17,"column":10},"end":{"row":18,"column":10}},{"start":{"row":18,"column":28},"end":{"row":19,"column":28}},{"start":{"row":18,"column":13},"end":{"row":19,"column":13}},{"start":{"row":20,"column":13},"end":{"row":21,"column":13}},{"start":{"row":18,"column":26},"end":{"row":19,"column":26}},{"start":{"row":18,"column":27},"end":{"row":19,"column":27}},{"start":{"row":20,"column":27},"end":{"row":21,"column":27}},{"start":{"row":19,"column":10},"end":{"row":20,"column":10}},{"start":{"row":20,"column":11},"end":{"row":21,"column":11}},{"start":{"row":18,"column":14},"end":{"row":19,"column":14}},{"start":{"row":18,"column":18},"end":{"row":19,"column":18}},{"start":{"row":20,"column":12},"end":{"row":21,"column":12}},{"start":{"row":19,"column":21},"end":{"row":22,"column":21}},{"start":{"row":24,"column":7},"end":{"row":27,"column":7}},{"start":{"row":19,"column":4},"end":{"row":22,"column":4}},{"start":{"row":20,"column":6},"end":{"row":21,"column":6}},{"start":{"row":24,"column":17},"end":{"row":27,"column":17}},{"start":{"row":20,"column":7},"end":{"row":23,"column":7}},{"start":{"row":26,"column":10},"end":{"row":29,"column":10}},{"start":{"row":24,"column":10},"end":{"row":25,"column":10}},{"start":{"row":22,"column":10},"end":{"row":23,"column":10}},{"start":{"row":24,"column":16},"end":{"row":29,"column":16}},{"start":{"row":24,"column":15},"end":{"row":29,"column":15}},{"start":{"row":20,"column":5},"end":{"row":21,"column":5}},{"start":{"row":24,"column":13},"end":{"row":27,"column":13}}];
}