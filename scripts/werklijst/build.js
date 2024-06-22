import * as def from "../lessen/def.js";
import {createValidId} from "../globals.js";
import {uploadData} from "../cloud.js";

let colDefsArray = [
    {key:"uren_23_24", def: { label:"Uren\n23-24", classList: ["editable_number"], factor: 1.0, getValue: (ctx) => ctx.fromCloud.columnMap.get("uren_23_24")?.get(ctx.vakLeraar.id), totals:true}},
    {key:"uren_24_25", def: { label:"Uren\n24-25", classList: ["editable_number"], factor: 1.0, getValue: (ctx) => ctx.fromCloud.columnMap.get("uren_24_25")?.get(ctx.vakLeraar.id), totals:true}},
    {key:"vak", def: { label:"Vak", classList: [], factor: 1.0, getValue: (ctx) => ctx.vakLeraar.vak}},
    {key:"leraar", def: { label:"Leraar", classList: [], factor: 1.0, getValue: (ctx) => ctx.vakLeraar.leraar.replaceAll("{", "").replaceAll("}", "")}},
    {key:"grjr2_1", def: { label:"2.1", classList: [], factor: 1/4, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr2_2", def: { label:"2.2", classList: [], factor: 1/4, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr2_3", def: { label:"2.3", classList: [], factor: 1/3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr2_4", def: { label:"2.4", classList: [], factor: 1/3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},

    {key:"uren_2e_gr", def: { label:"uren\n2e gr", classList: ["yellow"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr2_1", "grjr2_2", "grjr2_3", "grjr2_4"]), totals:true}},

    {key:"grjr3_1", def: { label:"3.1", classList: [], factor: 1/3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr3_2", def: { label:"3.2", classList: [], factor: 1/3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr3_3", def: { label:"3.3", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},

    {key:"uren_3e_gr", def: { label:"uren\n3e gr", classList: ["yellow"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr3_1", "grjr3_2", "grjr3_3"]), totals:true}},

    {key:"grjr4_1", def: { label:"4.1", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr4_2", def: { label:"4.2", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr4_3", def: { label:"4.3", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},

    {key:"uren_4e_gr", def: { label:"uren\n4e gr", classList: ["yellow"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr4_1", "grjr4_2", "grjr4_3"]), totals:true}},

    {key:"grjr_s_1", def: { label:"S.1", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},
    {key:"grjr_s_2", def: { label:"S.2", classList: [], factor: 1/2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell }},

    {key:"uren_spec", def: { label:"uren\nspec", classList: ["yellow"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr_s_1", "grjr_s_2"]), totals:true}},

    {key:"aantal_lln", def: { label:"aantal\nlln", classList: ["blueish"], factor: 1.0, getValue: (ctx) => calcUren(ctx, ["grjr2_1", "grjr2_2", "grjr2_3", "grjr2_4", "grjr3_1", "grjr3_2", "grjr3_3", "grjr4_1", "grjr4_2", "grjr4_3", "grjr_s_1", "grjr_s_2"]), totals:true}},
    {key:"tot_uren", def: { label:"tot\nuren", classList: ["creme"], factor: 1.0, getValue: (ctx) => calcUrenFactored(ctx, ["grjr2_1", "grjr2_2", "grjr2_3", "grjr2_4", "grjr3_1", "grjr3_2", "grjr3_3", "grjr4_1", "grjr4_2", "grjr4_3", "grjr_s_1", "grjr_s_2"]), totals:true}},
    {key:"over", def: { label:"Over", classList: [], factor: 1.0, getValue: calcOver}},
];

colDefsArray.forEach((colDef, index) => colDef.def.colIndex = index);
let colDefs = new Map(colDefsArray.map((def) => [def.key, def.def]));

function calcOver(ctx) {
    let totUren = parseFloat(getColValue(ctx, "tot_uren"));
    if (isNaN(totUren)) {
        totUren = 0;
    }
    let urenJaar = parseFloat(getColValue(ctx, "uren_24_25"));
    if (isNaN(urenJaar)) {
        urenJaar = 0;
    }
    return trimNumber(totUren - urenJaar);

}
function getColValue(ctx, colKey) {
    let newCtx = {...ctx};
    newCtx.colKey = colKey;
    newCtx.colDef = newCtx.colDefs.get(colKey);
    return newCtx.colDef.getValue(newCtx);

}

console.log(colDefs);

let popoverIndex = 1;
let cellChanged = false;

function editableObserverCallback(mutationList, observer) {
    cellChanged = true;
}

function checkAndUpdate() {
    if(!cellChanged)
        return;
    console.log("updating!");
    cellChanged = false;
    let data = {
        version: "1.0",
        columns: []
    };
    data.version = "1.0";
    addColumnData(data, "uren_23_24");
    addColumnData(data, "uren_24_25");
    console.log(data);
    uploadData("brol.json", data);
}

function addColumnData(data, colKey) {
    let colDef = colDefs.get(colKey);
    console.log(colDef);
    let rows = [];
    for(let tr of document.querySelectorAll("#"+def.COUNT_TABLE_ID+" tbody tr")) {
        let row = {
            key: tr.id,
            value: tr.children[colDef.colIndex].textContent
        };
        rows.push(row);
    }
    data.columns.push({
        key: colKey,
        rows
    })
}

setInterval(checkAndUpdate, 5000);

let editableObserver = new MutationObserver((mutationList, observer) => editableObserverCallback(mutationList, observer));

export function buildTable(vakLeraars, fromCloud) {
    let originalTable = document.querySelector("#table_leerlingen_werklijst_table");
    let table = document.createElement("table");
    originalTable.parentElement.appendChild(table);
    table.id = def.COUNT_TABLE_ID;
    fillTableHeader(table, vakLeraars);
    let tbody = document.createElement("tbody");
    table.appendChild(tbody);

    for(let column of fromCloud.columns) {
        column.rowMap = new Map(column.rows.map((row) => [row.key, row.value]));
    }
    fromCloud.columnMap = new Map(fromCloud.columns.map((col) => [col.key, col.rowMap]));
    console.log(fromCloud);

    for(let [vakLeraarKey, vakLeraar] of vakLeraars) {
        let tr = document.createElement("tr");
        tbody.appendChild(tr);
        tr.dataset["vak_leraar"] = vakLeraarKey;
        tr.id = createValidId(vakLeraarKey);
        for(let [colKey, colDef] of colDefs) {
            let td = document.createElement("td");
            tr.appendChild(td);
            td.classList.add(...colDef.classList);
            let ctx = { td, colKey, colDef, vakLeraar, tr, colDefs, fromCloud };
            if(colDef.fill) {
                colDef.fill(ctx);
            } else {
                let celltext = colDef.getValue(ctx);
                if(celltext)
                    td.innerText = celltext;
                }
        }
    }

    let editables = table.querySelectorAll("td.editable_number");
    editables.forEach((td) => td.setAttribute("contenteditable", "true"));

    const config = {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true
    };

    editableObserver.observe(table, config);
}

function calcUren(ctx, keys) {
    let tot = 0;
    for(let key of keys) {
        let colDef = ctx.colDefs.get(key);
        let cnt = ctx.vakLeraar.countMap.get(colDef.label).students.length;
        tot += cnt;
    }
    return trimNumber(tot);
}

function calcUrenFactored(ctx, keys) {
    let tot = 0;
    for(let key of keys) {
        let colDef = ctx.colDefs.get(key);
        let cnt = ctx.vakLeraar.countMap.get(colDef.label).students.length;
        let factor = colDefs.get(key).factor;
        tot += cnt * factor;
    }
    return trimNumber(tot);
}

function trimNumber(num) {
    return (Math.round(num * 100) / 100).toFixed(2);
}

function fillTableHeader(table, vakLeraars) {
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

function fillGraadCell(ctx) {
    console.log(ctx);
    let graadJaar = ctx.vakLeraar.countMap.get(ctx.colDef.label);
    let button = document.createElement("button");
    ctx.td.appendChild(button);
    if(graadJaar.count === 0)
        return;
    button.innerText = graadJaar.count;
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
        anchor.dataset.studentid = student.id;

        const iTag = document.createElement("i");
        anchor.appendChild(iTag);
        iTag.classList.add('fas', "fa-user-alt");
    }
}
