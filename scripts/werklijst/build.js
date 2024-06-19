import * as def  from "../lessen/def.js";

export function buildTable(vakLeraars) {
    let originalTable = document.querySelector("#table_leerlingen_werklijst_table");
    let table = document.createElement("table");
    originalTable.parentElement.appendChild(table);
    table.id = def.COUNT_TABLE_ID;
    let thead = document.createElement("thead");
    table.appendChild(thead);
    let tr_head = document.createElement("tr");
    thead.appendChild(tr_head);
    let th = document.createElement("th");
    tr_head.appendChild(th);
    th.innerText = "Vak";
    th = document.createElement("th");
    tr_head.appendChild(th);
    th.innerText = "Leraar";
    for (let graadJaar of vakLeraars.entries().next().value[1]) {
        th = document.createElement("th");
        tr_head.appendChild(th);
        th.innerText = graadJaar[0];
        th = document.createElement("th");
    }
    let tbody = document.createElement("tbody");
    table.appendChild(tbody);
    for(let vakLeraar of vakLeraars) {
        let tr = document.createElement("tr");
        tbody.appendChild(tr);
        let fields = vakLeraar[0].split("_");
        for(let field of fields) {
            let td = document.createElement("td");
            tr.appendChild(td);
            td.innerText = field;
        }
        for (let graadJaar of vakLeraar[1]) {
            let td = document.createElement("td");
            tr.appendChild(td);
            td.innerText = graadJaar[1].count;
            if (td.innerText === "0")
                td.innerText = "";
        }
    }
}
