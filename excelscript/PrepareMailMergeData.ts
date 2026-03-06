/// <reference path="./excelScript.d.ts" />
//https://github.com/sumurthy/officescripts-projects/blob/main/misc/index.d.ts

const TABLE_VESTING_EXTRA_INFO_ID = "tableVestigingExtraInfo" as const;
const STUDENTEN_BASE_NAME = "Studenten" as const;
const TABLE_STUDENTEN_ID = "table" + STUDENTEN_BASE_NAME;
const VESTIGINGSPLAATSEN_BASE_NAME = "Vestigingsplaatsen" as const;
const TABLE_VESTIGINGSPLAATSEN_ID = "table" + VESTIGINGSPLAATSEN_BASE_NAME;
const EXTRA_INFO_COLUMN_ID = "ExtraInfo" as const;
const VESTIGINGSPLAATS_COLUMN_ID = "Vestigingsplaats" as const;
const DKO3DATA_SHEET_ID = "Dko3Data" as const;
const MAX_VESTIGINGEN_PER_STUDENT_ID = "maxVestigingenPerStudent:" as const;
const META_ID = "META" as const;

function main(workbook: ExcelScript.Workbook) {
    workbook.getTable(TABLE_STUDENTEN_ID)?.convertToRange()
    workbook.getTable(TABLE_VESTIGINGSPLAATSEN_ID)?.convertToRange()
    defineTable(workbook, DKO3DATA_SHEET_ID, STUDENTEN_BASE_NAME);
    defineTable(workbook, DKO3DATA_SHEET_ID, VESTIGINGSPLAATSEN_BASE_NAME);

    [TABLE_STUDENTEN_ID, TABLE_VESTIGINGSPLAATSEN_ID].forEach(tableName => {
        workbook.getTable(tableName).setPredefinedTableStyle("TableStyleLight8");
    });
    setDataValidation(workbook, TABLE_VESTING_EXTRA_INFO_ID, VESTIGINGSPLAATS_COLUMN_ID, TABLE_VESTIGINGSPLAATSEN_ID, VESTIGINGSPLAATS_COLUMN_ID);
    setKeyForLongestVestigingInfoInMaxRow(workbook);
    workbook.refreshAllDataConnections();
}

function defineTable(workbook: ExcelScript.Workbook, dataSheetName: string, tableName: string) {
    let dataSheet = workbook.getWorksheet(dataSheetName);
    let beginDataBlock = dataSheet.getRange()
        .find("BEGIN " + tableName, {
            completeMatch: false,
            matchCase: false,
            searchDirection: ExcelScript.SearchDirection.forward
        });
    let startCell = beginDataBlock.getOffsetRange(1, 0);
    let columnCount = beginDataBlock.getOffsetRange(0, 4).getValue() as number;
    let endDataBlock = dataSheet.getRange()
        .find("END " + tableName, {
            completeMatch: false,
            matchCase: false,
            searchDirection: ExcelScript.SearchDirection.forward
        });
    let endCell = endDataBlock.getOffsetRange(-1, columnCount - 1);

    let tableRange = startCell.getBoundingRect(endCell);
    let newTable = workbook.addTable(tableRange, true);
    newTable.setName("table" + tableName);
}

function setDataValidation(workbook: ExcelScript.Workbook, tableName: string, columnName: string, validationTable: string, validationColumn: string) {
    let dataValidation: ExcelScript.DataValidation;
    let range = workbook.getTable(tableName).getColumnByName(columnName).getRange();
    dataValidation = range.getDataValidation();
    dataValidation.clear();
    dataValidation.setIgnoreBlanks(true);
    dataValidation.setPrompt({ showPrompt: true, title: "", message: "" });
    dataValidation.setErrorAlert({ showAlert: true, title: "", message: "", style: ExcelScript.DataValidationAlertStyle.stop });
    let rangeStr: string = workbook.getTable(validationTable).getColumnByName(validationColumn).getRange().getAddress();
    dataValidation.setRule({ list: { inCellDropDown: true, source: "=" + rangeStr } });
}

function findRowIndexLargestCellValue(workbook: ExcelScript.Workbook, tableName: string, columnName: string) {
    let range = workbook.getTable(tableName).getColumnByName(columnName).getRange();
    let row = range.getRow(0);
    let max = "";
    let maxIndex = -1;
    for (let rowIndex = 1; rowIndex <= range.getRowCount(); rowIndex++) {
        let cell = row.getCell(rowIndex, 0);
        let value = cell.getValue() as string;
        if (value.length > max.length) {
            max = value as string;
            maxIndex = rowIndex;
        }
    }
    return maxIndex;
}

function getLargestCellValueKey(workbook: ExcelScript.Workbook, tableName: string, columnName: string, keyColumnName: string) {
    let rowIndex = findRowIndexLargestCellValue(workbook, tableName, columnName);
    return workbook
        .getTable(tableName)
        .getColumnByName(keyColumnName).getRange()
        .getOffsetRange(rowIndex, 0).getValue() as string;
}

function getMetaData(workbook: ExcelScript.Workbook) {
    let dataSheet = workbook.getWorksheet(DKO3DATA_SHEET_ID);
    let ranges = dataSheet.findAll(META_ID, {
        completeMatch: true,
        matchCase: true,
    });
    let metaLine = ranges.getAreas()[0];
    let found = metaLine.find(MAX_VESTIGINGEN_PER_STUDENT_ID, { matchCase: true, completeMatch: true });
    let maxVestigingenPerStudent = found.getOffsetRange(0, 1).getValue() as number;
    return { maxVestigingenPerStudent };
}

function setKeyForLongestVestigingInfoInMaxRow(workbook: ExcelScript.Workbook) {
    let tableStudenten = workbook.getTable(TABLE_STUDENTEN_ID);
    let firstRow = tableStudenten.getRange().getRow(1);
    let maxInfoKey = getLargestCellValueKey(workbook, TABLE_VESTING_EXTRA_INFO_ID, EXTRA_INFO_COLUMN_ID, VESTIGINGSPLAATS_COLUMN_ID);
    let metaData = getMetaData(workbook);
    let vestiginCells = firstRow.getLastCell().getResizedRange(0, -(metaData.maxVestigingenPerStudent - 1));
    vestiginCells.setValue(maxInfoKey);
    vestiginCells.select();
}
