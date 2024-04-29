const NBSP = 160;

function buildTrimesterTable(instruments) {
    let orininalTable = document.getElementById("table_lessen_resultaat_tabel");
    let newTable = document.createElement("table");
    newTable.id = "trimesterTable";
    newTable.style.width = "100%";
    const newTableBody = document.createElement("tbody");

    //header
    const tHead = document.createElement("thead");
    newTable.appendChild(tHead);
    tHead.classList.add("table-secondary")
    const trHeader = document.createElement("tr");
    tHead.appendChild(trHeader);
    const th1 = document.createElement("th");
    trHeader.appendChild(th1);
    th1.innerHTML = "Trimester 1";
    const th2 = document.createElement("th");
    trHeader.appendChild(th2);
    th2.innerHTML = "Trimester 2";
    const th3 = document.createElement("th");
    trHeader.appendChild(th3);
    th3.innerHTML = "Trimester 3";

    // creating all cells
    for (let instrument of instruments) {
        buildInstrument(newTableBody, instrument);
    }

    // put the <tbody> in the <table>
    newTable.appendChild(newTableBody);
    // appends <table> into <body>
    document.body.appendChild(newTable);
    // sets the border attribute of newTable to '2'
    newTable.setAttribute("border", "2");
    orininalTable.insertAdjacentElement("afterend", newTable);
}

function buildInstrument(newTableBody, instrument) {
    // creates a table row
    buildInstrumentHeader(newTableBody, instrument);
    for (let rowNo = 0; rowNo < 4; rowNo++) {//TODO: use maxAantal, unless 999, in which case use effective max aantal.
        let row = document.createElement("tr");
        newTableBody.appendChild(row);
        for (let trimNo = 0; trimNo < 3; trimNo++) {
            let trimester = instrument.trimesters[trimNo];
            let studentName = undefined;
            if (trimester) {
                let student = trimester.students[rowNo];
                if (student) {
                    studentName = student.name;
                }
            }
            row.appendChild(buildStudentCell(studentName));
        }
    }
}

function buildInstrumentHeader(newTableBody, instrument) {
    const trName = document.createElement("tr");
    newTableBody.appendChild(trName);
    trName.classList.add("instrumentRow");

    const tdInstrumentName = document.createElement("td");
    trName.appendChild(tdInstrumentName);
    tdInstrumentName.classList.add("instrumentName", "instrumentCell");
    tdInstrumentName.appendChild(document.createTextNode(instrument.instrumentName));
    if (instrument.trimesters[0]) {
        tdInstrumentName.appendChild(buildModuleButton("1", instrument.trimesters[0].id));
    }

    const tdCell2 = document.createElement("td");
    trName.appendChild(tdCell2);
    tdCell2.classList.add("instrumentCell");
    tdCell2.appendChild(document.createTextNode(String.fromCharCode(NBSP)));
    if (instrument.trimesters[1]) {
        tdCell2.appendChild(buildModuleButton("2", instrument.trimesters[1].id));
    }
    const tdCell3 = document.createElement("td");
    trName.appendChild(tdCell3);
    tdCell3.classList.add("instrumentCell");
    tdCell3.appendChild(document.createTextNode(String.fromCharCode(NBSP)));
    if (instrument.trimesters[2]) {
        tdCell3.appendChild(buildModuleButton("3", instrument.trimesters[2].id));
    }
}

function buildModuleButton(buttonText, id) {
    const button = document.createElement("a");
    button.href = "/?#lessen-les?id=" + id
    button.classList.add("float-right", "trimesterButton");
    button.innerText = buttonText;
    return button;
}

function buildStudentCell(studentName) {
    const cell = document.createElement("td");
    cell.appendChild(document.createTextNode(studentName ??  String.fromCharCode(NBSP)));
    if (!studentName)
        return cell;

    const anchor = document.createElement("a");
    cell.appendChild(anchor);
    anchor.href = "#";
    anchor.classList.add("pl-2");
    anchor.onclick= function () { searchText(studentName); };
    const iTag = document.createElement("i");
    anchor.appendChild(iTag);
    iTag.classList.add('fas', "fa-user-alt");
    return cell;
}
