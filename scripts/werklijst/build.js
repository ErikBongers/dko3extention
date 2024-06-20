import * as def  from "../lessen/def.js";

let colDefsArray = [
    {key:"Vak", def: {colIndex: -1, factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => vakLeraar.vak}},
    {key:"Leraar", def: {colIndex: -1, factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => vakLeraar.leraar}},
    {key:"2.1", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},
    {key:"2.2", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},
    {key:"2.3", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},
    {key:"2.4", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},

    // {key:"uren 2e gr", def: {colIndex: -1, factor: 1.0, fill: (td, colKey, colDef, vakLeraar} => },

    {key:"3.1", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},
    {key:"3.2", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},
    {key:"3.3", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},

    // {key:"uren 3e gr", def: {colIndex: -1, factor: 1.0, fill: (td, colKey, colDef, vakLeraar} => },

    {key:"4.1", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},
    {key:"4.2", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},
    {key:"4.3", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},

    // {key:"uren 4e gr", def: {colIndex: -1, factor: 1.0, fill: (td, colKey, colDef, vakLeraar} => },

    {key:"S.1", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},
    {key:"S.2", def: {colIndex: -1, factor: 1.0, fill: fillGraadCell }},

    // {key:"uren spec", def: {colIndex: -1, factor: 1.0, fill: (td, colKey, colDef, vakLeraar} => },
];

colDefsArray.forEach((colDef, index) => colDef.def.colIndex = index);

let colDefs = new Map(colDefsArray.map((def) => [def.key, def.def]));

console.log(colDefs);

let popoverIndex = 1;

export function buildTable(vakLeraars) {
    let originalTable = document.querySelector("#table_leerlingen_werklijst_table");
    let table = document.createElement("table");
    originalTable.parentElement.appendChild(table);
    table.id = def.COUNT_TABLE_ID;
    fillTableHeader(table, vakLeraars);
    let tbody = document.createElement("tbody");
    table.appendChild(tbody);
    for(let vakLeraar of vakLeraars.values()) {
        let tr = document.createElement("tr");
        tbody.appendChild(tr);

        for(let [key, colDef] of colDefs) {
            let td = document.createElement("td");
            tr.appendChild(td);
            let celltext = colDef.fill(td, key, colDef, vakLeraar);
            if(celltext)
                td.innerText = celltext;
        }
    }
}

function fillGraadCell(td, colKey, colDef, vakLeraar) {
    fillStudentCell(td, vakLeraar.countMap.get(colKey));
}

function fillTableHeader(table, vakLeraars) {
    let thead = document.createElement("thead");
    table.appendChild(thead);
    let tr_head = document.createElement("tr");
    thead.appendChild(tr_head);
    let th = document.createElement("th");
    for (let key of colDefs.keys()) {
        th = document.createElement("th");
        tr_head.appendChild(th);
        th.innerText = key;
    }
}

function fillStudentCell(td, graadJaar) {
    let button = document.createElement("button");
    td.appendChild(button);
    if(graadJaar.count === 0)
        return;
    button.innerText = graadJaar.count;
    popoverIndex++;
    button.setAttribute("popovertarget", "students_" + popoverIndex);
    let popoverDiv = document.createElement("div");
    td.appendChild(popoverDiv);
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
