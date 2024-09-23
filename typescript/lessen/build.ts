import {FULL_CLASS_BUTTON_ID, isButtonHighlighted, TRIM_DIV_ID} from "../def.js";
import {db3} from "../globals.js";
import {RowInfo} from "./convert.js";
import {StudentInfo} from "./scrape";

const NBSP = 160;

export function buildTrimesterTable(instruments: RowInfo[]) {
    instruments.sort((instr1, instr2) => instr1.instrumentName.localeCompare(instr2.instrumentName));
    let trimDiv = document.getElementById(TRIM_DIV_ID);
    let newTable = document.createElement("table");
    newTable.id = "trimesterTable";
    newTable.style.width = "100%";

    let col = document.createElement("col");
    col.setAttribute("width", "100");
    newTable.appendChild(col);
    col = document.createElement("col");
    col.setAttribute("width", "100");
    newTable.appendChild(col);
    col = document.createElement("col");
    col.setAttribute("width", "100");
    newTable.appendChild(col);

    const newTableBody = document.createElement("tbody");

    let totTrim1 = 0;
    let totTrim2 = 0;
    let totTrim3 = 0;
    for (let instrument of instruments) {
        totTrim1 += instrument.trimesters[0]?.students?.length ?? 0;
        totTrim2 += instrument.trimesters[1]?.students?.length ?? 0;
        totTrim3 += instrument.trimesters[2]?.students?.length ?? 0;
    }

    //header
    const tHead = document.createElement("thead");
    newTable.appendChild(tHead);
    tHead.classList.add("table-secondary")
    const trHeader = document.createElement("tr");
    tHead.appendChild(trHeader);

    const th1 = document.createElement("th");
    trHeader.appendChild(th1);
    let div1 = document.createElement("div");
    th1.appendChild(div1);
    let span1 = document.createElement("span");
    div1.appendChild(span1);
    span1.classList.add("bold");
    span1.innerHTML = `Trimester 1`;
    let spanTot1 = document.createElement("span");
    div1.appendChild(spanTot1);
    spanTot1.classList.add("plain");
    spanTot1.innerHTML = ` (${totTrim1} lln) `;

    const th2 = document.createElement("th");
    trHeader.appendChild(th2);
    let div2 = document.createElement("div");
    th2.appendChild(div2);
    let span2 = document.createElement("span");
    div2.appendChild(span2);
    span2.classList.add("bold");
    span2.innerHTML = `Trimester 2`;
    let spanTot2 = document.createElement("span");
    div2.appendChild(spanTot2);
    spanTot2.classList.add("plain");
    spanTot2.innerHTML = ` (${totTrim2} lln) `;

    const th3 = document.createElement("th");
    trHeader.appendChild(th3);
    let div3 = document.createElement("div");
    th3.appendChild(div3);
    let span3 = document.createElement("span");
    div3.appendChild(span3);
    span3.classList.add("bold");
    span3.innerHTML = `Trimester 3`;
    let spanTot3 = document.createElement("span");
    div3.appendChild(spanTot3);
    spanTot3.classList.add("plain");
    spanTot3.innerHTML = ` (${totTrim3} lln) `;


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
    trimDiv.dataset.showFullClass= isButtonHighlighted(FULL_CLASS_BUTTON_ID) ? "true" : "false";
    trimDiv.appendChild(newTable);
}

function buildInstrument(newTableBody: HTMLTableSectionElement, instrument: RowInfo) {
    // creates a table row
    let headerRows = buildInstrumentHeader(newTableBody, instrument);
    let studentTopRowNo = newTableBody.children.length;
    let rowCount = Math.max(...instrument.trimesters
        .map((trim) => {
            if (!trim) return 0;
            return trim.maxAantal > 100 ? 4 : trim.maxAantal;
        }));
    let hasWachtlijst = instrument.trimesters.find((trim) => (trim?.wachtlijst?? 0) > 0);
    if (hasWachtlijst) {
        rowCount++;
    }

    headerRows.trName.dataset.hasFullClass = "false";
    headerRows.trModuleLinks.dataset.hasFullClass = "false";
    let hasFullClass = false;
    for (let rowNo = 0; rowNo < rowCount; rowNo++) {
        let row = document.createElement("tr");
        newTableBody.appendChild(row);
        row.classList.add("trimesterRow");
        row.dataset.hasFullClass = "false";

        for (let trimNo = 0; trimNo < 3; trimNo++) {
            let trimester = instrument.trimesters[trimNo];
            let student: StudentInfo = undefined;
            if (trimester) {
                student = trimester.students[rowNo];
                if (trimester.aantal >= trimester.maxAantal) {
                    row.dataset.hasFullClass = "true";
                    hasFullClass = true;
                }
            }
            let cell = buildStudentCell(student);
            row.appendChild(cell);
            if (trimester?.maxAantal <= rowNo) {
                cell.classList.add("gray");
            }
            if(student?.instruments[trimNo].length > 1) {
                cell.classList.add("yellowMarker");
            }
        }
    }
    if(hasFullClass) {
        headerRows.trName.dataset.hasFullClass = "true";
        headerRows.trModuleLinks.dataset.hasFullClass = "true";
    }
    if (!hasWachtlijst) {
        return;
    }

    //build the wachtlijst row
    for (let trimNo = 0; trimNo < 3; trimNo++) {
        let colNo = trimNo;
        let rowNo = newTableBody.children.length-1;
        newTableBody.children[rowNo].classList.add("wachtlijst");
        let cell = newTableBody.children[rowNo].children[colNo];
        cell.classList.add("wachtlijst");
        let trimester = instrument.trimesters[trimNo];
        if ((trimester?.wachtlijst ?? 0) === 0) {
            continue;
        }
        const small = document.createElement("small");
        cell.appendChild(small);
        small.appendChild(document.createTextNode(`(${trimester.wachtlijst} op wachtlijst)`));
        small.classList.add("text-danger");

        if (trimester.wachtlijst > 0 && trimester.aantal < trimester.maxAantal) {
            cell.querySelector("small").classList.add("yellowMarker");
            newTableBody.children[studentTopRowNo + trimester.aantal].children[colNo].classList.add("yellowMarker");
        }
    }
}

function buildInstrumentHeader(newTableBody: HTMLTableSectionElement, instrument: RowInfo) {
    const trName = document.createElement("tr");
    newTableBody.appendChild(trName);
    trName.classList.add("instrumentRow");

    const tdInstrumentName = document.createElement("td");
    trName.appendChild(tdInstrumentName);
    tdInstrumentName.classList.add("instrumentName", "instrumentCell");
    tdInstrumentName.setAttribute("colspan", "3");

    let nameDiv = document.createElement("div");
    tdInstrumentName.appendChild(nameDiv);
    nameDiv.classList.add("moduleName");
    nameDiv.appendChild(document.createTextNode(instrument.instrumentName));
    let div = document.createElement("div");
    tdInstrumentName.appendChild(div);
    div.classList.add("text-muted");
    div.appendChild(document.createTextNode(instrument.lesmoment));
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createTextNode(instrument.teacher));
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createTextNode(instrument.vestiging));

    //build row for module links(the tiny numbered buttons)
    const trModuleLinks = document.createElement("tr");
    newTableBody.appendChild(trModuleLinks);
    trModuleLinks.classList.add("instrumentRow");
    const tdLink1 = document.createElement("td");
    trModuleLinks.appendChild(tdLink1);
    trModuleLinks.classList.add("instrumentCell");
    if (instrument.trimesters[0]) {
        tdLink1.appendChild(buildModuleButton("1", instrument.trimesters[0].id));
    }
    const tdLink2 = document.createElement("td");
    trModuleLinks.appendChild(tdLink2);
    trModuleLinks.classList.add("instrumentCell");
    if (instrument.trimesters[1]) {
        tdLink2.appendChild(buildModuleButton("2", instrument.trimesters[1].id));
    }
    const tdLink3 = document.createElement("td");
    trModuleLinks.appendChild(tdLink3);
    trModuleLinks.classList.add("instrumentCell");
    if (instrument.trimesters[2]) {
        tdLink3.appendChild(buildModuleButton("3", instrument.trimesters[2].id));
    }
    return {
        "trName": trName,
        "trModuleLinks": trModuleLinks
    };
}

function buildModuleButton(buttonText: string, id: string) {
    const button = document.createElement("a");
    button.href = "#";
    button.setAttribute("onclick", `showView('lessen-les','','id=${id}'); return false;`);
    button.classList.add("float-right", "trimesterButton");
    button.innerText = buttonText;
    return button;
}

function buildStudentCell(student: StudentInfo) {
    const cell = document.createElement("td");
    let studentSpan = document.createElement("span");
    studentSpan.appendChild(document.createTextNode(student?.name ??  String.fromCharCode(NBSP)));
    cell.appendChild(studentSpan);
    if (student?.allYearSame) {
        studentSpan.classList.add("allYear");
    }
    if (!student) {
        return cell;
    }

    const anchor = document.createElement("a");
    cell.appendChild(anchor);
    anchor.href = "#";
    anchor.classList.add("pl-2");
    anchor.title = student.info;
    anchor.onclick= function () {
        fetchStudentId(student.name)
            .then((id) => window.location.href = "/?#leerlingen-leerling?id="+id+",tab=inschrijvingen");
        return false;
    };
    const iTag = document.createElement("i");
    anchor.appendChild(iTag);
    iTag.classList.add('fas', "fa-user-alt");
    return cell;
}

async function fetchStudentId(studentName: string) {
    let studentNameForUrl = studentName.replaceAll(",", "").replaceAll("(", "").replaceAll(")", "");
    return fetch("/view.php?args=zoeken?zoek="+encodeURIComponent(studentNameForUrl))
        .then((response) => response.text())
        .then((_text) => fetch("/views/zoeken/index.view.php"))
        .then((response) => response.text())
        .then((text) => findStudentId(studentName, text))
        .catch(err => {
            console.error('Request failed', err)
        });
}

function findStudentId(studentName: string, text: string) {
    db3(text);
    studentName = studentName.replaceAll(",", "");
    let namePos = text.indexOf(studentName);
    if (namePos < 0) {
        return -1
    }
    //the name comes AFTER the id, hence the backward search of the leftmost slice of the string.
    let idPos = text.substring(0, namePos).lastIndexOf("'id=", namePos);
    let id = text.substring(idPos, idPos+10);
    id = id.match(/\d+/)[0]; //TODO: may fail!
    db3(id);
    return parseInt(id);
}
