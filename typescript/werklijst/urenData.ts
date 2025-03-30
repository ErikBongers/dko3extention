import {VakLeraar} from "./scrapeUren";

export class UrenData {
    year: number;
    fromCloud: CloudData;
    vakLeraars: Map<string, VakLeraar>;

    constructor(year: number, cloudData: CloudData, vakLeraars: Map<string, VakLeraar>) {
        this.year = year;
        this.fromCloud = cloudData;
        this.vakLeraars = vakLeraars;
    }
}

export class JsonCloudData {
    version: string;
    columns: JsonColumn[];

    constructor(object?: Object) {
        this.version = "1.0";
        this.columns = [];
        if(object) {
            Object.assign(this, object);
        }
    }
}

export class CloudData {
    columnMap?: Map<string, Map<string, string>>;

    constructor(jsonCloudData: JsonCloudData) {
        this.#buildMapFromJsonData(jsonCloudData);
    }

    #buildMapFromJsonData(jsonCloudData: JsonCloudData) {
        for (let column of jsonCloudData.columns) {
            column.rowMap = new Map(column.rows.map((row) => [row.key, row.value]));
        }
        this.columnMap = new Map(jsonCloudData.columns.map((col) => [col.key, col.rowMap]));
    }

    toJson(colKey1: string, colKey2: string) {
        let data = new JsonCloudData();
        let col1 = this.#columnToJson(colKey1);
        let col2 = this.#columnToJson(colKey2);
        data.columns.push({key: colKey1, rows: col1});
        data.columns.push({key: colKey2, rows: col2});
        return data;
    }

    #columnToJson(colKey: string) {
        let cells: JsonCell[] = [];
        for (let [key, value] of this.columnMap.get(colKey)) {
            let row: JsonCell = {
                key: key,
                value: value
            };
            cells.push(row);
        }
        return cells;
    }
}

export interface JsonCell {
    key: string,
    value: string
}

interface JsonColumn {
    key: string,
    rows: JsonCell[]
    rowMap?: Map<string, string>;
}

