export interface CellPos{
    row: number;
    column: number;
}

export interface ExcelPos {
    row: number;
    column: number;
}

export interface TablePos {
    row: number;
    column: number;
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

    public get Start (): ExcelPos {
        return this.start;
    }
    public get End (): ExcelPos {
        return this.end;
    }
}

export interface JsonExcelData {
    data: string[][];
    mergedRanges: JsonRange[];
}

export class ExcelData {
    data: string[][];
    mergedRanges: ExcelRange[];

    public constructor(data: string[][], mergedRanges: JsonRange[]) {
        this.data = data;
        this.mergedRanges = mergedRanges.map(r => new ExcelRange(r.start, r.end));
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
