import * as def  from "../lessen/def.js";

export function buildTable(studentCountMap) {
    console.log("building table");
    console.log(studentCountMap);
    let originalTable = document.querySelector("#table_leerlingen_werklijst_table");
    let table = document.createElement("table");
    originalTable.parentElement.appendChild(table);
    table.id = def.COUNT_TABLE_ID;
    for(let student of studentCountMap) {
        let tr = document.createElement("tr");
        table.appendChild(tr);
        console.log(student);
        let fields = student[0].split("_");
        console.log(fields);
        for(let field of fields) {
            let td = document.createElement("td");
            tr.appendChild(td);
            td.innerText = field;
            td.style.borderStyle = "solid";
            td.style.borderWidth = "1px";
            td.style.paddingLeft = "4px";
            td.style.paddingRight = "4px";
            // tr.style.width = "100px";
        }
        tr.children[0].style.width = "150px";
        let td = document.createElement("td");
        tr.appendChild(td);
        td.innerText = student[1].count;
        td.style.borderStyle = "solid";
        td.style.borderWidth = "1px";
    }
}
