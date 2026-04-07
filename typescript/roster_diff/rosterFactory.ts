import {ExcelData, JsonExcelData, Table, Range, ExcelRange} from "./excel";

export class RosterFactory {
    private excelData: ExcelData;
    private errors: string[] = [];
    private daysRow: number = undefined;
    private periodColumn: number = undefined;
    private tableRange: ExcelRange = undefined;

    public constructor(jsonExcelData: JsonExcelData) {
        this.excelData = new ExcelData(jsonExcelData.data, jsonExcelData.mergedRanges);
        this.daysRow = this.findDaysRow();
        if(this.daysRow === undefined)  {
            this.errors.push( "Geen rij met dagnamen gevonden.");
            return;
        }
        this.periodColumn = this.findPeriodColumn(this.daysRow);
        if(this.periodColumn === undefined)  {
            this.errors.push( "Geen kolom met lesmomenten gevonden.");
            return;
        }
        let lastPeriodRow = this.findLastPeriodRow(this.periodColumn);
        let lastDayColumn = this.findLastDayColumn(this.periodColumn, this.daysRow);
        this.tableRange = new ExcelRange({row: this.daysRow, column: this.periodColumn}, {row: lastPeriodRow, column: lastDayColumn});
    }

    public getErrors(): string[] {
        return this.errors;
    }

    public getTable(): Table {
        return new Table(this.excelData, this.tableRange, 2, 1);
    }

    private findDaysRow() {
        for (let [i, row] of this.excelData.data.entries()) {
            if(this.isDaysRow(row))
                return i;
        }
        return undefined;
    }

    private isDaysRow(row: string[]) {
        let matchCount = 0;
        for (let value of row) {
            if(this.isDayName(value.toString()))
                matchCount++;
            if(matchCount >= 3) //meh...good enough
                return true;
        }
        return false;
    }

    private isDayName(text: string) {
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

    private findPeriodColumn(daysRow: number) {
        let columnCount = this.excelData.data[0].length;
        for (let iCol = 0; iCol < columnCount; iCol++) {
            for (let row of this.excelData.data.slice(daysRow)) {
                let value = row[iCol].toString();
                if(this.isPeriod(value))
                    return iCol;
            }
        }
        return undefined;
    }

    private isPeriod(text: string) {
        const periodRegex = /\d?\d[.:,]\d\d\s*-\s*\d?\d[.:,]\d\d/gm;  //hh:mm-hh:mm en variaties.
        return !!text.match(periodRegex);
    }

    private findLastPeriodRow(periodColumn: number) {
        return this.excelData.data
            .map((row, index) => this.isPeriod(row[periodColumn].toString()) ? index : -1)
            .filter(n => n > 0)
            .pop();
    }

    private findLastDayColumn(periodColumn: number, daysRow: number) {
        for(let c = periodColumn+1; c < this.excelData.data[0].length; c++) {
            let cellValue = this.excelData.getMergedCellValue({row: daysRow, column: c});
            if(!this.isDayName(cellValue))
                return c-1;
        }
    }
}
