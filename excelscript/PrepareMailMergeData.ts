/// <reference path="./excelScript.d.ts" />
//https://github.com/sumurthy/officescripts-projects/blob/main/misc/index.d.ts

function main(workbook: ExcelScript.Workbook) {
    workbook.getTable("tableStudenten")?.delete();
    workbook.getTable("tableVestigingsplaatsen")?.delete();
    defineTable(workbook, "Dko3Data", "Studenten");
    defineTable(workbook, "Dko3Data", "Vestigingsplaatsen");
    ["tableStudenten", "tableVestigingsplaatsen"].forEach(tableName => {
        workbook.getTable(tableName).setPredefinedTableStyle("TableStyleLight8");
    });
    setDataValidation(workbook, "tableVestigingExtraInfo", "Vestigingsplaats", "tableVestigingsplaatsen", "Vestigingsplaats");
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