export interface CellPos{
    row: number;
    column: number;
}

export class ExcelPos {
    row: number;
    column: number;

    constructor(row: number, column: number) {
        this.row = row;
        this.column = column;
    }
}

export class TablePos {
    row: number;
    column: number;

    static toExcel(tablePos: TablePos, table: Table) {
        return new ExcelPos(tablePos.row+table.tableRange.Start.row+table.rowHeaderCount, tablePos.column+table.tableRange.Start.column+table.columnHeaderCount);
    }
}

export abstract class JsonRange {
    public start: CellPos;
    public end: CellPos;
}

export abstract class Range {
    protected start: CellPos;
    protected end: CellPos;

    public RowCount() {
        return this.end.row - this.start.row + 1;
    }
    public ColumnCount () {
        return this.end.column - this.start.column + 1;
    }

    protected constructor(start: CellPos, end: CellPos) {
        this.start = start;
        this.end = end;
    }
}

export class ExcelRange extends Range {
    public constructor(start: CellPos, end: CellPos) {
        super(start, end);
    }

    public get Start (): ExcelPos {
        return this.start;
    }
    public get End (): ExcelPos {
        return this.end;
    }
}

export class TableRange {
    protected start: TablePos;
    protected end: TablePos;

    protected constructor(start: TablePos, end: TablePos) {
        this.start = start;
        this.end = end;
    }

    public static FromExcel(excelRange: ExcelRange, table: Table) {
        let startRow = excelRange.Start.row-table.tableRange.Start.row-table.rowHeaderCount;
        let endRow = excelRange.End.row-table.tableRange.Start.row-table.rowHeaderCount;
        let startColumn = excelRange.Start.column-table.tableRange.Start.column-table.columnHeaderCount;
        let endColumn = excelRange.End.column-table.tableRange.Start.column-table.columnHeaderCount;

        return new TableRange({row: startRow, column: startColumn}, {row: endRow, column: endColumn});
    }

    public static ToExcel(tableRange: TableRange, table: Table) {
        return new ExcelRange(
            TablePos.toExcel(tableRange.Start, table),
            TablePos.toExcel(tableRange.End, table)
        );
    }

    public get Start (): ExcelPos {
        return this.start;
    }
    public get End (): ExcelPos {
        return this.end;
    }
}

export type JsonExcelData = {
    data: string[][];
    mergedRanges: JsonRange[];
    url: string | undefined,
    workbookName: string,
    worksheetName: string,
}


export class ExcelData {
    data: string[][];
    mergedRanges: ExcelRange[];
    url: string | undefined;
    workbookName: string;
    worksheetName: string;

    public constructor(data: string[][], mergedRanges: JsonRange[], url: string | undefined, workbookName: string, worksheetName: string) {
        this.data = data;
        this.mergedRanges = mergedRanges.map(r => new ExcelRange(r.start, r.end));
        this.url = url;
        //TEST
        debugger;
        this.url = "https://edusoantwerpen.sharepoint.com/:x:/r/sites/dko/berchem/_layouts/15/Doc.aspx?sourcedoc=%7B07EE8CAE-4B67-4355-93E8-57C46B11DA13%7D&file=Woord_uurrooster_25-26.xlsx&action=default&mobileredirect=true&activeCell=Blad%201!C5&whatever=sdfsdf";
        this.url = "https://edusoantwerpen.sharepoint.com/:x:/r/sites/dko/berchem/_layouts/15/Doc.aspx?activeCell=Blad%201!C5&sourcedoc=%7B07EE8CAE-4B67-4355-93E8-57C46B11DA13%7D&file=Woord_uurrooster_25-26.xlsx&action=default&mobileredirect=true";
        //TEST
        if(this.url) {
            //https://edusoantwerpen.sharepoint.com/:x:/s/dko/berchem/IQCujO4HZ0tVQ5PoV8RrEdoTAdDM_aDWVT2Pb5of8tPWKrY?activeCell=Definitief!B19
            // or:
            //https://edusoantwerpen.sharepoint.com/:x:/r/sites/dko/berchem/_layouts/15/Doc.aspx?sourcedoc=%7B07EE8CAE-4B67-4355-93E8-57C46B11DA13%7D&file=Woord_uurrooster_25-26.xlsx&action=default&mobileredirect=true&activeCell=Blad1!C5
            let rxActiveCell = /[&?]activeCell=[A-Za-z0-9_]+![A-Za-z0-9_]+\d+/g;
            let urlDecodeSpace = this.url.replaceAll(/%20/g, "__SPACE__"); //just to make the regex simpler.
            //if match, remove the match from the string.
            let match = rxActiveCell.exec(urlDecodeSpace);
            if(match) {
                //start of url params?
                if(match[0].indexOf("?") >=0) {
                    let urlParams = new URLSearchParams(urlDecodeSpace.substring(urlDecodeSpace.indexOf("?")+1));
                    urlParams.delete("activeCell");
                    urlDecodeSpace = urlDecodeSpace.substring(0, urlDecodeSpace.indexOf("?")) + "?" + urlParams.toString();
                } else
                    urlDecodeSpace = urlDecodeSpace.replace(match[0], "");
            }
            this.url = urlDecodeSpace.replaceAll("__SPACE__", "%20");
        }
        this.workbookName = workbookName;
        this.worksheetName = worksheetName;
    }

    public getMergedCellValue(excelPos: ExcelPos): string {
        let mergedRange = this.getMergedRangeForCell(excelPos);
        return this.data[mergedRange.Start.row][mergedRange.Start.column];
    }

    public getMergedRangeForCell(excelPos: ExcelPos): ExcelRange {
        return this.mergedRanges.find(range => {
            return excelPos.row >= range.Start.row
                && excelPos.row <= range.End.row
                && excelPos.column >= range.Start.column
                && excelPos.column <= range.End.column;
        })
            ?? new ExcelRange(excelPos, excelPos);
    }

}


export class Table {
    private excelData: ExcelData;
    public tableRange: ExcelRange;
    rowHeaderCount: number;
    readonly columnHeaderCount: number;

    public excelToTableRange(excelRange: ExcelRange): TableRange {
        return TableRange.FromExcel(excelRange, this);
    }



    public get ColumnCount (): number {
        return this.tableRange.ColumnCount() - this.columnHeaderCount;
    }

    public get RowCount (): number {
        return this.tableRange.RowCount() - this.rowHeaderCount;
    }

    public constructor(excelData: ExcelData, tableRange: ExcelRange, rowHeaderCount: number, columnHeaderCount: number) {
        this.excelData = excelData;
        this.tableRange = tableRange;
        this.rowHeaderCount = rowHeaderCount;
        this.columnHeaderCount = columnHeaderCount;
    }

    public Cell(row: number, column: number): string {
        let excelPos: ExcelPos = {row: this.tableRange.Start.row+this.rowHeaderCount+row, column: this.tableRange.Start.column+this.columnHeaderCount+column};
        return this.excelData.getMergedCellValue(excelPos);
    }

    public RangeOfCell(pos: TablePos): TableRange {
        let excelPos: ExcelPos = {row: this.tableRange.Start.row+this.rowHeaderCount+pos.row, column: this.tableRange.Start.column+this.columnHeaderCount+pos.column};
        let exelRange= this.excelData.getMergedRangeForCell(excelPos)
            ?? new ExcelRange(excelPos, excelPos);
        return TableRange.FromExcel(exelRange, this);
    }

    public HeaderRowValue(headerRow: number, column: number) {
        let excelPos: ExcelPos = {row: this.tableRange.Start.row+headerRow, column: this.tableRange.Start.column+this.columnHeaderCount+column};
        return this.excelData.getMergedCellValue(excelPos);
    }

    public HeaderColumnValue(row: number, headerColumn: number) {
        let excelPos: ExcelPos = {row: this.tableRange.Start.row+this.rowHeaderCount+row, column: this.tableRange.Start.column+headerColumn};
        return this.excelData.getMergedCellValue(excelPos);
    }
}
