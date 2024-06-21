import * as def  from "../lessen/def.js";

let colDefsArray = [
    {key:"Uren", def: { classList: ["editable_number"], factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => "test"}},
    {key:"Vak", def: { classList: [], factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => vakLeraar.vak}},
    {key:"Leraar", def: { classList: [], factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => vakLeraar.leraar}},
    {key:"2.1", def: { classList: [], factor: 1/4, fill: fillGraadCell }},
    {key:"2.2", def: { classList: [], factor: 1/4, fill: fillGraadCell }},
    {key:"2.3", def: { classList: [], factor: 1/3, fill: fillGraadCell }},
    {key:"2.4", def: { classList: [], factor: 1/3, fill: fillGraadCell }},

    {key:"uren\n2e gr", def: { classList: ["yellow"], factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => calcUrenFactored(vakLeraar, ["2.1", "2.2", "2.3", "2.4"])}},

    {key:"3.1", def: { classList: [], factor: 1/3, fill: fillGraadCell }},
    {key:"3.2", def: { classList: [], factor: 1/3, fill: fillGraadCell }},
    {key:"3.3", def: { classList: [], factor: 1/2, fill: fillGraadCell }},

    {key:"uren\n3e gr", def: { classList: ["yellow"], factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => calcUrenFactored(vakLeraar, ["3.1", "3.2", "3.3"])}},

    {key:"4.1", def: { classList: [], factor: 1/2, fill: fillGraadCell }},
    {key:"4.2", def: { classList: [], factor: 1/2, fill: fillGraadCell }},
    {key:"4.3", def: { classList: [], factor: 1/2, fill: fillGraadCell }},

    {key:"uren\n4e gr", def: { classList: ["yellow"], factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => calcUrenFactored(vakLeraar, ["4.1", "4.2", "4.3"])}},

    {key:"S.1", def: { classList: [], factor: 1/2, fill: fillGraadCell }},
    {key:"S.2", def: { classList: [], factor: 1/2, fill: fillGraadCell }},

    {key:"uren\nspec", def: { classList: ["yellow"], factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => calcUrenFactored(vakLeraar, ["S.1", "S.2"])}},

    {key:"aantal\nlln", def: { classList: ["blueish"], factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => calcUren(vakLeraar, ["2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3", "4.1", "4.2", "4.3", "S.1", "S.2"])}},
    {key:"tot\nuren", def: { classList: ["creme"], factor: 1.0, fill: (td, colKey, colDef, vakLeraar) => calcUrenFactored(vakLeraar, ["2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3", "4.1", "4.2", "4.3", "S.1", "S.2"])}},
];

colDefsArray.forEach((colDef, index) => colDef.def.colIndex = index);

let colDefs = new Map(colDefsArray.map((def) => [def.key, def.def]));

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
    let data = { rows: []};
    for(let tr of document.querySelectorAll("#"+def.COUNT_TABLE_ID+" tbody tr")) {
        let row = {
            key: tr.id,
            value: tr.children[0].textContent
        };
        data.rows.push(row);
    }
    console.log(data);
    fetch("https://us-central1-ebo-tain.cloudfunctions.net/json?fileName=brol.json", {
        method: "POST",
        body: JSON.stringify(data)
    })
        .then((res) => res.text().then((text) => {
            console.log(text);
        }));
}

setInterval(checkAndUpdate, 5000);

let editableObserver = new MutationObserver((mutationList, observer) => editableObserverCallback(mutationList, observer));

function createValidId(id) {
    return id
        .replaceAll(" ", "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\W/g,'');
}

function reloadFromCloud(table) {
    fetch("https://us-central1-ebo-tain.cloudfunctions.net/json?fileName=brol.json", { method: "GET"})
        .then((res) => res.json().then((json) => {
            console.log(json);
            for(let row of json.rows){
                console.log(row);
                let tr = document.getElementById(row.key);
                tr.children[0].textContent = row.value;
            }
        }));
}

export function buildTable(vakLeraars) {
    let originalTable = document.querySelector("#table_leerlingen_werklijst_table");
    let table = document.createElement("table");
    originalTable.parentElement.appendChild(table);
    table.id = def.COUNT_TABLE_ID;
    fillTableHeader(table, vakLeraars);
    let tbody = document.createElement("tbody");
    table.appendChild(tbody);
    for(let [vakLeraarKey, vakLeraar] of vakLeraars) {
        let tr = document.createElement("tr");
        tbody.appendChild(tr);
        tr.dataset["vak_leraar"] = vakLeraarKey;
        tr.id = createValidId(vakLeraarKey);
        for(let [key, colDef] of colDefs) {
            let td = document.createElement("td");
            tr.appendChild(td);
            td.classList.add(...colDef.classList);
            let celltext = colDef.fill(td, key, colDef, vakLeraar);
            if(celltext)
                td.innerText = celltext;
        }
    }

    reloadFromCloud(table);

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

function fillGraadCell(td, colKey, colDef, vakLeraar) {
    fillStudentCell(td, vakLeraar.countMap.get(colKey));
}

function calcUren(vakLeraar, keys) {
    let tot = 0;
    for(let key of keys) {
        let cnt = vakLeraar.countMap.get(key).students.length;
        tot += cnt;
    }
    return trimNumber(tot);
}

function calcUrenFactored(vakLeraar, keys) {
    let tot = 0;
    for(let key of keys) {
        let cnt = vakLeraar.countMap.get(key).students.length;
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
