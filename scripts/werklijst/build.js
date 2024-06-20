import * as def  from "../lessen/def.js";

export function buildTable(vakLeraars) {
    let popoverIndex = 1;
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
            td.innerText = field === "{nieuw}" ? "" : field;
        }
        for (let graadJaar of vakLeraar[1]) {
            let td = document.createElement("td");
            tr.appendChild(td);
            if(graadJaar[1].count === 0)
                continue;
            let button = document.createElement("button");
            td.appendChild(button);
            button.innerText = graadJaar[1].count;
            button.setAttribute("popovertarget", "students_"+popoverIndex);
            let popoverDiv = document.createElement("div");
            td.appendChild(popoverDiv);
            popoverDiv.id = "students_" + popoverIndex;
            popoverDiv.setAttribute("popover", "auto");
            for (let student of graadJaar[1].students) {
                let studentDiv = document.createElement("div");
                popoverDiv.appendChild(studentDiv);
                studentDiv.innerText = student.voornaam + " " + student.naam;
                const anchor = document.createElement("a");
                studentDiv.appendChild(anchor);
                anchor.href = "/?#leerlingen-leerling?id="+student.id+",tab=inschrijvingen";
                anchor.classList.add("pl-1");
                anchor.dataset.studentid = student.id;

                const iTag = document.createElement("i");
                anchor.appendChild(iTag);
                iTag.classList.add('fas', "fa-user-alt");

            }
            popoverIndex++;
        }
    }
}
