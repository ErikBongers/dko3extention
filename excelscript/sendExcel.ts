/// <reference path="./excelScript.d.ts" />
//https://github.com/sumurthy/officescripts-projects/blob/main/misc/index.d.ts

//copy from notifications/types.ts:
export type NotificationLevel = "info" | "warning" | "error" | "running";

export type NotificationId =
    "FILE_POSTED" | "WOORD_ROSTERS_IS_DIFF" | "WOORD_ROSTER_CHANGED" | "WOORD_ROSTER_RUN"
    | "MUZIEK_ROSTERS_IS_DIFF" | "MUZIEK_ROSTER_CHANGED" | "MUZIEK_ROSTER_RUN"
    | "OTHER"; //todo: OTHER should eventually be removed, as we need to be able to indentify every notif in order to be able to remove it.

export interface Notification {
    level: NotificationLevel;
    id: NotificationId;
    message: string;
    data: string;
}

export interface Notifications {
    instance: number;
    notifications: {
        [key in NotificationId]?: Notification;
    }
}

export async function postNotification(id: NotificationId, level: NotificationLevel, message: string, data: string) {
    let notification: Notification = {id, level, message, data};
    await fetch(`https://europe-west1-ebo-tain.cloudfunctions.net/notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify(notification),
    });
}

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

type JsonData = {
    data: Data,
    mergedRanges: IdxRange[],
    url: string | undefined,
    workbookName: string,
    worksheetName: string,
}

async function main(workbook: ExcelScript.Workbook) {
    let statusField = workbook.getNamedItem("SendStatus").getRange();
    statusField.setValue("Gegevens worden doorgestuurd...even geduld...");
    statusField.getFormat().getFill().setColor("FFAA00");
    statusField.getFormat().getFont().setColor("000000");

    let FolderName: string = "Dko3/Uurroosters";
    let workbookName = workbook.getName()
    let activeWorksheet = workbook.getActiveWorksheet()
    let worksheetName = activeWorksheet.getName();
    console.log(`Sending exel file: ${workbookName} - sheet: ${worksheetName}`);
    let fullRange = activeWorksheet.getUsedRange();
    let url = workbook.getNamedItem("Url")?.getRange().getValue() as string;
    if(!url) {
        setError(workbook, "Warning: Er is geen URL gevonden in het document.");
    }
    let data: Data = fullRange.getValues();
    console.log("data");
    let mergedRanges: IdxRange[] = collectMergedRanges(fullRange);
    console.log("json");
    let json: JsonData = {
        data,
        mergedRanges,
        worksheetName: activeWorksheet.getName(),
        workbookName,
        url
    };
    console.log("to string");
    console.log(JSON.stringify(json));
    console.log("sending...");
    let fileName = FolderName + "/" + workbookName + ".json";
    let res = await fetch("https://europe-west1-ebo-tain.cloudfunctions.net/json?fileName=" + fileName, {
        method: "POST",
        body: JSON.stringify(json),
    });
    await postNotification("FILE_POSTED", "info", `Bestand verzonden vanuit sharepoint: ${fileName}.`, fileName);

    let txt: string = await res.json();
    console.log(txt);
    statusField.setValue("Alle gegevens zijn doorgestuurd en kunnen gebruikt worden in DKO3.");
    statusField.getFormat().getFill().setColor("AAFFAA");
    await workbook.getActiveWorksheet().calculate(true);
    let bckStartColor: RrGgBb = { r: 170, g: 255, b: 170 };
    let txtStartColor: RrGgBb = { r: 0, g: 0, b: 0 };
    let bckEndColor: RrGgBb = { r: 255, g: 255, b: 255 };
    let txtEndColor: RrGgBb = { r: 255, g: 255, b: 255 };
    let steps = 20;
    for(let step = 0; step < steps; step++){
        statusField.getFormat().getFill().setColor(fadeColor(bckStartColor, bckEndColor, steps, step));
        statusField.getFormat().getFont().setColor(fadeColor(txtStartColor, txtEndColor, steps, step));
        await workbook.getActiveWorksheet().calculate(true);
        sleep(50);
    }
    statusField.setValue("");
    statusField.getFormat().getFill().setColor("FFFFFF");
    statusField.getFormat().getFont().setColor("000000");
}

type RrGgBb = {
    r: number,
    g: number,
    b: number;
}
function fadeColor(start :RrGgBb, end: RrGgBb, steps: number, step: number): string {
    let r = Math.floor(start.r + (end.r - start.r) * (step/steps));
    let g = Math.floor(start.g + (end.g - start.g) * (step / steps));
    let b = Math.floor(start.b + (end.b - start.b) * (step / steps));
    let res = r.toString(16).padStart(2, "0")
        + g.toString(16).padStart(2, "0")
        + b.toString(16).padStart(2, "0");
    console.log(res);
    return res;
}

function sleep(millis: number) {

    const millisecondDelay = millis;
    const start = Date.now();
    let now = Date.now();

    while ((now - start) < millisecondDelay) {
        now = Date.now();
        // busy wait
        for (let i = 0; i < 1000; i++) { }
    }

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