import {ExcelData, JsonExcelData, Table, Range, ExcelRange} from "./excel";
import {parseTimeSlice} from "./excelRoster";
import {DayUppercase} from "../lessen/scrape";

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
            if(RosterFactory.isDayName(value.toString()))
                matchCount++;
            if(matchCount >= 3) //meh...good enough
                return true;
        }
        return false;
    }

    public static isDayName(text: string) {
        return this.toDayName(text) != "";
    }

    public static toDayName(text: string): DayUppercase {
        switch (text.toLowerCase()) {
            case "maandag": return "MAANDAG";
            case "dinsdag": return "DINSDAG";
            case "woensdag": return "WOENSDAG";
            case "donderdag": return "DONDERDAG";
            case "vrijdag": return "VRIJDAG";
            case "zaterdag": return "ZATERDAG";
            case "zondag": return "ZONDAG";
            case "ma": return "MAANDAG";
            case "di": return "DINSDAG";
            case "din": return "DINSDAG";
            case "wo": return "WOENSDAG";
            case "woe": return "WOENSDAG";
            case "do": return "DONDERDAG";
            case "don": return "DONDERDAG";
            case "vr": return "VRIJDAG";
            case "za": return "ZATERDAG";
            case "zat": return "ZATERDAG";
            case "zo": return "ZONDAG";
            case "zon": return "ZONDAG";
            default:return "";
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
        return parseTimeSlice(text)!!;
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
            if(!RosterFactory.isDayName(cellValue))
                return c-1;
        }
    }
}
