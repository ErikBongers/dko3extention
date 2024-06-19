import * as def  from "../lessen/def.js";

export function buildTable(studentCountMap) {
    console.log("building table");
    console.log(studentCountMap);
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
    th = document.createElement("th");
    tr_head.appendChild(th);
    th.innerText = "Graad.Jaar";
    th = document.createElement("th");
    tr_head.appendChild(th);
    th.innerText = "Telling";

    let tbody = document.createElement("tbody");
    table.appendChild(tbody);
    for(let student of studentCountMap) {
        let tr = document.createElement("tr");
        tbody.appendChild(tr);
        console.log(student);
        let fields = student[0].split("_");
        console.log(fields);
        for(let field of fields) {
            let td = document.createElement("td");
            tr.appendChild(td);
            td.innerText = field;
        }
        // tr.children[0].style.width = "150px";
        let td = document.createElement("td");
        tr.appendChild(td);
        td.innerText = student[1].count;
        td.style.borderStyle = "solid";
        td.style.borderWidth = "1px";
    }
}
