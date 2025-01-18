import * as def from "../def.js";
import {createValidId, getSchoolIdString, getSchooljaar} from "../globals.js";
import {VakLeraar} from "./scrapeUren.js";
import {TableDef} from "../table/tableDef.js";
import {uploadData} from "../cloud";

let isUpdatePaused = true;
let cellChanged = false;
let popoverIndex = 1;

let theData: TheData;

let editableObserver = new MutationObserver((mutationList, observer) => editableObserverCallback(mutationList, observer));
setInterval(checkAndUpdate, 5000);

interface ColDef {
    label: string,
    classList: string[],
    factor: number,
    getText?: (ctx: Context) => string,
    getValue?: (ctx: Context) => number,
    totals?: boolean,
    calculated?: boolean,
    fill?:(ctx: Context) => (number|undefined),
    colIndex?: number,
    total?: number
}

let colDefsArray: {key: string, def: ColDef}[] = [
    {key:"uren_23_24", def: { label:"Uren\n23-24", classList: ["editable_number"], factor: 1.0, getValue: (ctx) => parseInt(ctx.data.fromCloud.columnMap.get("uren_23_24")?.get(ctx.vakLeraar.id)), totals:true}},
    {key:"uren_24_25", def: { label:"Uren\n24-25", classList: ["editable_number"], factor: 1.0, getValue: (ctx) => parseInt(ctx.data.fromCloud.columnMap.get("uren_24_25")?.get(ctx.vakLeraar.id)), totals:true}},
    {key:"vak", def: { label:"Vak", classList: [], factor: 1.0, getText: (ctx) => ctx.vakLeraar.vak}},
    {key:"leraar", def: { label:"Leraar", classList: [], factor: 1.0, getText: (ctx) => ctx.vakLeraar.leraar.replaceAll("{", "").replaceAll("}", "")}},
    {key:"grjr2_1", def: { label:"2.1", classList: [], factor: 1/4, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr2_2", def: { label:"2.2", classList: [], factor: 1/4, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr2_3", def: { label:"2.3", classList: [], factor: 1/3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr2_4", def: { label:"2.4", classList: [], factor: 1/3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},

    {key:"uren_2e_gr", def: { label:"uren\n2e gr", classList: ["yellow"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr2_1", "grjr2_2", "grjr2_3", "grjr2_4"]), totals:true, calculated:true}},

    {key:"grjr3_1", def: { label:"3.1", classList: [], factor: 1/3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr3_2", def: { label:"3.2", classList: [], factor: 1/3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr3_3", def: { label:"3.3", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},

    {key:"uren_3e_gr", def: { label:"uren\n3e gr", classList: ["yellow"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr3_1", "grjr3_2", "grjr3_3"]), totals:true, calculated:true}},

    {key:"grjr4_1", def: { label:"4.1", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr4_2", def: { label:"4.2", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr4_3", def: { label:"4.3", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},

    {key:"uren_4e_gr", def: { label:"uren\n4e gr", classList: ["yellow"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr4_1", "grjr4_2", "grjr4_3"]), totals:true, calculated:true}},

    {key:"grjr_s_1", def: { label:"S.1", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr_s_2", def: { label:"S.2", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},

    {key:"uren_spec", def: { label:"uren\nspec", classList: ["yellow"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr_s_1", "grjr_s_2"]), totals:true, calculated:true}},

    {key:"aantal_lln", def: { label:"aantal\nlln", classList: ["blueish"], factor: 1.0, getValue: (ctx) => calcUren(ctx, ["grjr2_1", "grjr2_2", "grjr2_3", "grjr2_4", "grjr3_1", "grjr3_2", "grjr3_3", "grjr4_1", "grjr4_2", "grjr4_3", "grjr_s_1", "grjr_s_2"]), totals:true, calculated:true}},
    {key:"tot_uren", def: { label:"tot\nuren", classList: ["creme"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr2_1", "grjr2_2", "grjr2_3", "grjr2_4", "grjr3_1", "grjr3_2", "grjr3_3", "grjr4_1", "grjr4_2", "grjr4_3", "grjr_s_1", "grjr_s_2"]), totals:true, calculated:true}},
    {key:"over", def: { label:"Over", classList: [], factor: 1.0, getValue: (ctx) => calcOver(ctx), calculated:true}},
];

colDefsArray.forEach((colDef, index) => {
    colDef.def.colIndex = index;
    colDef.def.total = 0;
});
let colDefs = new Map(colDefsArray.map((def) => [def.key, def.def]));

function calcOver(ctx: Context) {
    let totUren = getColValue(ctx, "tot_uren");
    if (isNaN(totUren)) {
        totUren = 0;

    }
    let urenJaar = getColValue(ctx, "uren_24_25");
    if (isNaN(urenJaar)) {
        urenJaar = 0;
    }
    return urenJaar - totUren;

}

interface Context {
    vakLeraar: VakLeraar;
    colKey: string;
    tr: HTMLTableRowElement,
    td: HTMLTableCellElement,
    colDef: ColDef,
    colDefs: Map<string, ColDef>,
    data: TheData
}

function getColValue(ctx: Context, colKey: string) {

    let newCtx: Context = {...ctx};
    newCtx.colKey = colKey;

    newCtx.colDef = newCtx.colDefs.get(colKey);
    return newCtx.colDef.getValue(newCtx);
}

function editableObserverCallback(mutationList: MutationRecord[], _observer: MutationObserver) {
    if (mutationList.every((mut) => mut.type === "attributes"))
        return; //ignore attrubute changes.
    cellChanged = true;
}

export function getUrenVakLeraarFileName() {

    return getSchoolIdString() + "_" + "uren_vak_lk_" + getSchooljaar().replace("-", "_") + ".json";
}

export interface JsonCloudData {
    columnMap?: Map<string, Map<string, string>>;
    version: string,
    columns: JsonColumn[]
}

interface JsonColumn {
    key: string,
    rows: JsonCell[]
    rowMap?: Map<string, string>;
}

function buildJsonData() {
    let data: JsonCloudData = {
        version: "1.0",
        columns: []
    };
    let col1 = columnToJson(data, "uren_23_24");
    let col2 = columnToJson(data, "uren_24_25");
    data.columns.push({key: "uren_23_24", rows: col1});
    data.columns.push({key: "uren_24_25", rows: col2});
    return data;
}

interface JsonCell {
    key: string,
    value: string
}

function columnToJson(_data: JsonCloudData, colKey: string) {
    let cells: JsonCell[] = [];
    for (let [key, value] of theData.fromCloud.columnMap.get(colKey)) {
        let row: JsonCell = {
            key: key,
            value: value
        };
        cells.push(row);
    }
    return cells;
}

function checkAndUpdate() {
    if(isUpdatePaused) {
        return;
    }
    if(!cellChanged) {
        return;
    }
    let fileName = getUrenVakLeraarFileName();
    cellChanged = false;
    updateColumnData( "uren_23_24");
    updateColumnData( "uren_24_25");
    let data = buildJsonData();

    uploadData(fileName, data);
    mapCloudData(data);//TODO: separate stages of data: raw data from/to cloud or from/to scraping, preparing the data, displaying the data.
    theData.fromCloud = data;

    recalculate();
}

function updateColumnData(colKey: string) {
    let colDef = colDefs.get(colKey);
    for(let tr of document.querySelectorAll("#"+def.COUNT_TABLE_ID+" tbody tr")) {
        theData.fromCloud.columnMap.get(colKey).set(tr.id, tr.children[colDef.colIndex].textContent);
    }
}

function observeTable(observe: boolean) {
    const config = {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true
    };
    let table = document.getElementById(def.COUNT_TABLE_ID);
    if(observe) {
        editableObserver.takeRecords(); //clear
        editableObserver.observe(table, config);
    } else {
        editableObserver.disconnect();
    }
}

function mapCloudData(fromCloud: JsonCloudData) {
    for (let column of fromCloud.columns) {
        column.rowMap = new Map(column.rows.map((row) => [row.key, row.value]));
    }
    fromCloud.columnMap = new Map(fromCloud.columns.map((col) => [col.key, col.rowMap]));
}

function fillCell(ctx: Context): (number| undefined) {
    if(ctx.colDef.getText) {
        ctx.td.innerText = ctx.colDef.getText(ctx);
        return undefined;
    }
    if (ctx.colDef.fill) {
        ctx.colDef.fill(ctx);
        return undefined;
    }
    let theValue = ctx.colDef.getValue(ctx);
    ctx.td.innerText = trimNumber(theValue);
    return theValue;
}

function calculateAndSumCell(colDef: ColDef, ctx: Context, onlyRecalc: boolean) {
    let theValue = undefined;
    if (colDef.calculated || !onlyRecalc)
        theValue = fillCell(ctx);
    if (colDef.totals) {
        if (!theValue)
            theValue = colDef.getValue(ctx); //get value when not a calculated value.
        if (theValue)
            colDef.total += theValue;
    }
}

function clearTotals() {
    for (let [_colKey, colDef] of colDefs) {
        if (colDef.totals) {
            colDef.total = 0;
        }
    }
}

function recalculate() {
    isUpdatePaused = true;
    observeTable(false);
    clearTotals();

    for (let [vakLeraarKey, vakLeraar] of theData.vakLeraars) {
        let tr = document.getElementById(createValidId(vakLeraarKey)) as HTMLTableRowElement;
        for(let [colKey, colDef] of colDefs) {
            let td = tr.children[colDef.colIndex] as HTMLTableCellElement;
            let ctx: Context = {td, colKey, colDef, vakLeraar, tr, colDefs, data: theData};
            calculateAndSumCell(colDef, ctx, true);
        }
    }
    let trTotal = document.getElementById("__totals__");
    for(let [_colKey, colDef] of colDefs) {
        let td = trTotal.children[colDef.colIndex] as HTMLTableCellElement;
        if(colDef.totals) {
            td.innerText = trimNumber(colDef.total);
        }
    }

    cellChanged = false;
    isUpdatePaused = false;
    observeTable(true);
}

export interface TheData {
    fromCloud: JsonCloudData,
    vakLeraars: Map<string, VakLeraar>
}

export function buildTable(data: TheData, tableDef: TableDef) {
    isUpdatePaused = true;
    theData = data;
    let table = document.createElement("table");
    tableDef.tableRef.getOrgTable().insertAdjacentElement("afterend", table);
    table.id = def.COUNT_TABLE_ID;
    table.classList.add("canSort");
    fillTableHeader(table, data.vakLeraars);
    let tbody = document.createElement("tbody");
    table.appendChild(tbody);
    mapCloudData(data.fromCloud);

    let lastVak = "";
    let rowClass = undefined;
    clearTotals();

    for(let [vakLeraarKey, vakLeraar] of data.vakLeraars) {
        let tr = document.createElement("tr");
        tbody.appendChild(tr);
        tr.dataset["vak_leraar"] = vakLeraarKey;
        tr.id = createValidId(vakLeraarKey);
        if(vakLeraar.vak !== lastVak) {
            rowClass = (rowClass === ""? "darkRow" : "");
        }
        if(rowClass !== "")
            tr.classList.add(rowClass);
        lastVak = vakLeraar.vak;
        for(let [colKey, colDef] of colDefs) {
            let td = document.createElement("td");
            tr.appendChild(td);
            td.classList.add(...colDef.classList);
            let ctx = {td, colKey, colDef, vakLeraar, tr, colDefs, data};
            calculateAndSumCell(colDef, ctx, false);
        }
    }
    let tFoot = document.createElement("tfoot");
    table.appendChild(tFoot);
    tFoot.classList.add("separatorLine");
    let trTotal = document.createElement("tr");
    tFoot.appendChild(trTotal);
    
    trTotal.id = "__totals__";
    for(let [_colKey, colDef] of colDefs) {
        let td = document.createElement("td") as HTMLTableCellElement;
        trTotal.appendChild(td);
        if(colDef.totals) {
            td.innerText = trimNumber(colDef.total);
        }
    }

    let editables = table.querySelectorAll("td.editable_number");
    editables.forEach((td) => td.setAttribute("contenteditable", "true"));
    observeTable(true);
    isUpdatePaused = false;
}

function calcUren(ctx: Context, keys: string[]) {
    let tot = 0;
    for(let key of keys) {
        let colDef = ctx.colDefs.get(key);
        let cnt = ctx.vakLeraar.countMap.get(colDef.label).students.length;
        tot += cnt;
    }
    return tot;
}

function calcUrenFactored(ctx: Context, keys: string[]) {
    let tot = 0;
    for(let key of keys) {
        let colDef = ctx.colDefs.get(key);
        let cnt = ctx.vakLeraar.countMap.get(colDef.label).students.length;
        let factor = colDefs.get(key).factor;
        tot += cnt * factor;
    }
    return tot;
}

function trimNumber(num: number) {
    if(isNaN(num))
        return "";
    // @ts-ignore `num` is checked too be number
    return (Math.round(num * 100) / 100).toFixed(2).replace(".00", "");
}

function fillTableHeader(table: HTMLTableElement, _vakLeraars: Map<string, VakLeraar>) {
    let thead = document.createElement("thead");
    table.appendChild(thead);
    let tr_head = document.createElement("tr");
    thead.appendChild(tr_head);
    let th = document.createElement("th");
    for (let colDef of colDefs.values()) {
        th = document.createElement("th");
        tr_head.appendChild(th);
        th.innerText = colDef.label;
    }
}

function fillGraadCell(ctx: Context) {
    let graadJaar = ctx.vakLeraar.countMap.get(ctx.colDef.label);
    let button = document.createElement("button") as HTMLButtonElement;
    ctx.td.appendChild(button);
    if(graadJaar.count === 0)
        return graadJaar.count;
    button.innerText = graadJaar.count.toString();
    popoverIndex++;
    button.setAttribute("popovertarget", "students_" + popoverIndex);
    let popoverDiv = document.createElement("div");
    ctx.td.appendChild(popoverDiv);
    popoverDiv.id = "students_" + popoverIndex;
    popoverDiv.setAttribute("popover", "auto");
    for (let student of graadJaar.students) {
        let studentDiv = document.createElement("div");
        popoverDiv.appendChild(studentDiv);
        studentDiv.innerText = student.voornaam + " " + student.naam;
        const anchor = document.createElement("a");
        studentDiv.appendChild(anchor);
        anchor.href = "/?#leerlingen-leerling?id=" + student.id + ",tab=inschrijvingen";
        anchor.classList.add("pl-1");
        anchor.dataset.studentid = student.id.toString();

        const iTag = document.createElement("i");
        anchor.appendChild(iTag);
        iTag.classList.add('fas', "fa-user-alt");
    }
    return graadJaar.count;
}
