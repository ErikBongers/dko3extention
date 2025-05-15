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
    subject: string,
    location: string,
    gradeYears: GradeYear[],
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
let lastDayColumn: number = undefined;

function scrapeUurrooster(workbook: ExcelScript.Workbook, fullRange: ExcelScript.Range) {
    data = fullRange.getValues();
    daysRow = findDaysRow(data);
    if(daysRow === undefined)  {
        setError(workbook, "Geen rij met dagnamen gevonden.");
        return;
    }
    periodColumn = findPeriodColumn(data);
    let lastPeriodRow = findLastPeriodRow();
    data = data.slice(0, lastPeriodRow+1);
    if(periodColumn === undefined)  {
        setError(workbook, "Geen kolom met lesmomenten gevonden.");
        return;
    }
    mergedRanges = getMergedCellsCached();

    lastDayColumn = findLastDayColumn();

    timeSlices = createTimeSlices();

    let classDefs: ClassDef[] = [];
    for(let c = periodColumn+1; c <= lastDayColumn; c++) {
        classDefs = classDefs.concat(scrapeColumn(c));
    }
    console.log(classDefsToString(classDefs));
}

function findLastDayColumn() {
    for(let c = periodColumn+1; c < data[0].length; c++) {
        let cellValue = getCellValue({row: daysRow, column: c});
        if(!isDayName(cellValue))
            return c-1;
    }
}

function findLastPeriodRow() {
    return data
        .map((row, index) => isPeriod(row[periodColumn].toString()) ? index : -1)
        .filter(n => n > 0)
        .pop();
}

function scrapeColumn(column: number) {
    let classDefs: ClassDef[] = [];
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
            let tags = findTags(cellValue, defaultTagDefs); //todo: first try to find tagDefs in the sheet (table)
            let location = findLocation(tags);
            let subject = findSubject(tags);
            let classDef: ClassDef = {
                teacher,
                day,
                timeSlice,
                location,
                subject,
                gradeYears: findGradeYears(cellValue),
                description: cellValue
            };
            classDefs.push(classDef);
        }
    }
    return classDefs;
}

type GradeYear = {
    grade: string,
    year: number
}

function findGradeYears(text: string) {
    let gradeYears: GradeYear[] = [];
    const rx = /\s+(?:(\d)\.(\d)|(S)(\d))(?:\s?[,+\/]\s?(?:(\d)\.(\d)|(S)(\d)))?(?:\s?[,+\/]\s?(?:(\d)\.(\d)|(S)(\d)))?(?:\s?[,+\/]\s?(?:(\d)\.(\d)|(S)(\d)))?(?:\s?[,+\/]\s?(?:(\d)\.(\d)|(S)(\d)))?/gm;
    let matches = rx.exec(text);
    if(matches) {
        let strippedMatches = matches.filter(m => m);
        for (let i = 1; i < strippedMatches.length; i += 2) {
            let gradeYear: GradeYear = {
                grade: strippedMatches[i],
                year: parseInt(strippedMatches[i+1])
            };
            gradeYears.push(gradeYear);
        }
        return gradeYears;
    }
    const rx2 = /\s+(\d)\s?[,+]\s?(\d)/gm;
    matches = rx2.exec(text);
    if(matches) {
        let strippedMatches = matches.filter(m => m);
        for (let i = 1; i < strippedMatches.length; i++) {
            let gradeYear: GradeYear = {
                grade: "2", //assumptionn!
                year: parseInt(strippedMatches[i])
            };
            gradeYears.push(gradeYear);
        }
        return gradeYears;
    }
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

type TagDef = {
    tag: string,
    searchString: string
}

let defaultTagDefs: TagDef[] = [
    { tag: "Sterrenkijker", searchString: "sterr"},
    { tag: "Sterrenkijker", searchString: "durlet"},
    { tag: "Kleine Stad", searchString: " stad"},
    { tag: "Kleine Wereld", searchString: " wereld"},
    { tag: "De Nieuwe Vrede", searchString: " vrede"},
    { tag: "De Nieuwe Vrede", searchString: "dnv"},
    { tag: "De Kosmos", searchString: " kosmos"},
    { tag: "De Schatkist", searchString: "schatk"},
    { tag: "De Kolibrie", searchString: " kolibri"},
    { tag: "Albereke", searchString: "albere"},
    { tag: "c o r s o", searchString: "corso"},
    { tag: "Cabaret & Comedy", searchString: "cabaret"},
    { tag: "Woordatelier", searchString: "woordatelier"},
    { tag: "Woordatelier", searchString: "WA "}, //todo: searchString is assumed to be in lower case.
    { tag: "Literair atelier", searchString: "literair atelier"},
    { tag: "Literaire teksten", searchString: "literaire teksten"},
    { tag: "Willem Van Laarstraat", searchString: "bib"},
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
    "Albereke",
    "c o r s o",
    "Willem Van Laarstraat",
];

let subjectDefs: string[] = [
    "Woordatelier",
    "Cabaret & Comedy",
    "Literair atelier",
    "Literaire teksten",
];

function findLocation(tags: string[]) {
    return locationDefs.find(location => tags.includes(location));
}

function findSubject(tags: string[]) {
    return subjectDefs.find(subject => tags.includes(subject));
}

function findTags(text: string, tagDefs: TagDef[]) {
    let tags: string[] = [];
    for (let def of tagDefs) {
        if(text.toLowerCase().includes(def.searchString))
            tags.push(def.tag);
    }
    return tags;
}

function findTagDefTable(workbook: ExcelScript.Workbook) {
    let tblTags = workbook.getActiveWorksheet().getTable("labels");
    if(!tblTags)
        tblTags = workbook.getActiveWorksheet().getTable("Labels");
    if(tblTags)
      return getTagDefsFromTable(tblTags);
    return undefined;
}

function getTagDefsFromTable(table: ExcelScript.Table) {
    let translations: TagDef[] = [];

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

function classDefToString(classDef: ClassDef) {
    return `${classDef.day}, ${classDef.teacher}, ${classDef.subject}, ${classDef.location}, [${classDef.gradeYears?.map(gy => gradeYearToString(gy)).join(", ")}]`;
}

function gradeYearToString(gradeYear: GradeYear) {
    return `${gradeYear.grade ? gradeYear.grade: "?"}.${gradeYear.year}`;
}

function classDefsToString(classDefs: ClassDef[]) {
    return classDefs.map(classDef => classDefToString(classDef)).join("\n");
}