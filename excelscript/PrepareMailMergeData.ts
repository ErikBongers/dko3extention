/// <reference path="./excelScript.d.ts" />
//https://github.com/sumurthy/officescripts-projects/blob/main/misc/index.d.ts

function main(workbook: ExcelScript.Workbook) {
    // defineTable(workbook, "Dko3Data", "Studenten");
    // defineTable(workbook, "Dko3Data", "Vestigingsplaatsen");
    setDataValidation(workbook);
}

function defineTable(workbook: ExcelScript.Workbook, dataSheeetName: string, tableName: string) {
    let dataSheet = workbook.getWorksheet(dataSheeetName);
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

function setDataValidation(workbook: ExcelScript.Workbook) {
    let dataValidation: ExcelScript.DataValidation;
    let locationsSheet = workbook.getWorksheet("Info Vestigingsplaatsen");
    // Data validation changed on range D7 on selectedSheet
    dataValidation = locationsSheet.getRange("D7").getDataValidation();
    dataValidation.clear();
    dataValidation.setIgnoreBlanks(true);
    dataValidation.setPrompt({ showPrompt: true, title: "", message: "" });
    dataValidation.setErrorAlert({ showAlert: true, title: "", message: "", style: ExcelScript.DataValidationAlertStyle.stop });
    let dataSheet = workbook.getWorksheet("Dko3data");
    let rangeStr: string = dataSheet.getRange("tableVestigingsplaatsen").getAddress();
    console.log(rangeStr);
    dataValidation.setRule({ list: { inCellDropDown: true, source: "=" + rangeStr } });
}