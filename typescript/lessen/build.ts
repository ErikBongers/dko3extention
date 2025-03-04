import {FULL_CLASS_BUTTON_ID, isButtonHighlighted, TRIM_DIV_ID} from "../def";
import {db3} from "../globals";
import {BlockInfo} from "./convert";
import {StudentInfo} from "./scrape";

const NBSP = 160;

export function buildTrimesterTable(blocks: BlockInfo[]) {
    blocks.sort((block1, block2) => block1.instrumentName.localeCompare(block2.instrumentName)); //TODO: also sort on teacher and lesmoment.
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
    for (let block of blocks) {
        totTrim1 += block.trimesters[0]?.students?.length ?? 0;
        totTrim2 += block.trimesters[1]?.students?.length ?? 0;
        totTrim3 += block.trimesters[2]?.students?.length ?? 0;
        let totJaar = block.jaarModules.map(mod => mod.students.length).reduce((prev, curr) => prev + curr, 0);
        totTrim1 +=  totJaar;
        totTrim2 +=  totJaar;
        totTrim3 +=  totJaar;
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
    for (let block of blocks) {
        buildBlock(newTableBody, block);
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

function createStudentRow(tableBody: HTMLTableSectionElement, rowClass: string) {
    let row = document.createElement("tr");
    tableBody.appendChild(row);
    row.classList.add(rowClass);
    row.dataset.hasFullClass = "false";
    return row;
}

/*

A block should have only ONE les per trimester and ONE per jaar.
In case multiple: Show error next to class link? Or show 2 class links?
But merge all students anyway (and waitinglists).

A block has a max number of rows,
 For trimesters: based on the max for the trimesters. (plus one in case of a waitinglist)
 For jaarmodules: based on max of all jaarmodules. (plus one in case of a waitinglist)

Sinde both are on the same lesmoment, the max numbers should not be added.

Say we have a jaarmodule of 2 students and trimestermodules of max() 4 students.
Total max = 4.
If jaarmodule has 3 students, and trimester only 1...fine. Note that they are on the SAME lesmoment.
What is tot max allowed per trimester? The max of jaar and trimester.


First draw the 2 jaarmodule students.


 */

function buildBlock(newTableBody: HTMLTableSectionElement, block: BlockInfo) {
    let headerRows = buildBlockHeader(newTableBody, block);
    let studentTopRowNo = newTableBody.children.length;
    let blockNeededRows = Math.max(...block.trimesters
        .map((trim) => {
            if (!trim) return 0;
            let cnt = trim.maxAantal > 100 ? 4 : trim.maxAantal;
            return cnt > trim.students.length ? cnt : trim.students.length;
        }));
    let hasWachtlijst = block.trimesters.find((trim) => (trim?.wachtlijst?? 0) > 0);
    if (hasWachtlijst) {
        blockNeededRows++;
    }

    let maxJaarStudentCount = block.jaarModules.map(mod => mod.maxAantal).reduce((prev, count) => Math.max(prev, count), 0);
    headerRows.trName.dataset.hasFullClass = "false";
    headerRows.trModuleLinks.dataset.hasFullClass = "false";
    let hasFullClass = false;

    /*

    Say, we may have 2 jaar rows available...but only one filled.
    > first fill that row
    > start filling trims on the next row, but do mark that 2nd row as "jaarRow"
      > give that overlapping row a different color.
        > give the filled cells a class of "trimesterStudent".

  >>> give a cell.trimesterStudent in a row.jaarModule a different color to indicate the overlap.
     */
    //TODO: DOES NOT WORK FOR MULTIPLE JAAR MODULES !!!!! What about the max number of rows???

    //Fill jaar rows
    let filledRowCount = 0;
    for(let jaarModule of block.jaarModules)  {
        for(let student of jaarModule.students) {
            let row = createStudentRow(newTableBody, "jaarRow");
            for (let trimNo = 0; trimNo < 3; trimNo++) {
                let cell = buildStudentCell(student);
                row.appendChild(cell);
                cell.classList.add("jaarStudent");
                if (jaarModule.maxAantal <= filledRowCount) {
                    cell.classList.add("gray");
                }
                //TODO: add all jaarModules to the students, and if more than one: yellow
                // if (student? trimesterInstruments[trimNo].length > 1) {
                //     cell.classList.add("yellowMarker");
                // }
            }
            filledRowCount++;
        }
    }

    //Fill trimester rows
    for (let rowNo = 0; rowNo < (blockNeededRows - filledRowCount); rowNo++) {
        let row = createStudentRow(newTableBody,"trimesterRow");

        for (let trimNo = 0; trimNo < 3; trimNo++) {
            let trimester = block.trimesters[trimNo];
            let student: StudentInfo = undefined;
            if (trimester) {
                student = trimester.students[rowNo];
                let maxTrimStudentCount = Math.max(trimester.maxAantal, maxJaarStudentCount);
                if (trimester.aantal >= maxTrimStudentCount) {
                    row.dataset.hasFullClass = "true";
                    hasFullClass = true;
                }
            }
            let cell = buildStudentCell(student);
            row.appendChild(cell);
            cell.classList.add("trimesterStudent");
            if (trimester?.maxAantal <= rowNo) {
                cell.classList.add("gray");
            }
            if(student?.trimesterInstruments[trimNo].length > 1) {
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
        let trimester = block.trimesters[trimNo];
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

function buildBlockHeader(newTableBody: HTMLTableSectionElement, block: BlockInfo) {
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
    nameDiv.appendChild(document.createTextNode(block.instrumentName));
    for(let jaarModule of block.jaarModules) {
        nameDiv.appendChild(buildModuleButton(">", jaarModule.id, false))
    }

    let errorsAndWarnings = "";
    //todo: put the max of 100 in a const.
    let maxMoreThan100 = block.jaarModules
        .map(module => module.maxAantal > 100)
        .includes(true);
    if(!maxMoreThan100) {
        maxMoreThan100 = block.trimesters.flat()
            .map(module => module?.maxAantal > 100)
            .includes(true);
    }
    if(maxMoreThan100)
        errorsAndWarnings += "Max aantal lln > 100";

    if(errorsAndWarnings) {
        let errorSpan = document.createElement("span");
        errorSpan.appendChild(document.createTextNode(errorsAndWarnings));
        errorSpan.classList.add("lesError");
        nameDiv.appendChild(errorSpan);
    }

    let div = document.createElement("div");
    tdInstrumentName.appendChild(div);
    div.classList.add("text-muted");
    div.appendChild(document.createTextNode(block.lesmoment));
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createTextNode(block.teacher));
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createTextNode(block.vestiging));

    //build row for module links(the tiny numbered buttons)
    const trModuleLinks = document.createElement("tr");
    newTableBody.appendChild(trModuleLinks);
    trModuleLinks.classList.add("instrumentRow");
    const tdLink1 = document.createElement("td");
    trModuleLinks.appendChild(tdLink1);
    trModuleLinks.classList.add("instrumentCell");
    if (block.trimesters[0]) {
        tdLink1.appendChild(buildModuleButton("1", block.trimesters[0].id, true));
    }
    const tdLink2 = document.createElement("td");
    trModuleLinks.appendChild(tdLink2);
    trModuleLinks.classList.add("instrumentCell");
    if (block.trimesters[1]) {
        tdLink2.appendChild(buildModuleButton("2", block.trimesters[1].id, true));
    }
    const tdLink3 = document.createElement("td");
    trModuleLinks.appendChild(tdLink3);
    trModuleLinks.classList.add("instrumentCell");
    if (block.trimesters[2]) {
        tdLink3.appendChild(buildModuleButton("3", block.trimesters[2].id, true));
    }
    return {
        "trName": trName,
        "trModuleLinks": trModuleLinks
    };
}

function buildModuleButton(buttonText: string, id: string, floatRight: boolean) {
    const button = document.createElement("a");
    button.href = "#";
    button.setAttribute("onclick", `showView('lessen-les','','id=${id}'); return false;`);
    button.classList.add("lesButton");
    if(floatRight)
        button.classList.add("float-right");
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
    anchor.onclick= async function () {
        let id = await fetchStudentId(student.name);
        if(id <= 0)
            window.location.href = "/?#zoeken?zoek="+ stripStudentName(student.name);
        else {
            await fetch("https://administratie.dko3.cloud/view.php?args=leerlingen-leerling?id="+id);
            await fetch("https://administratie.dko3.cloud/views/leerlingen/leerling/index.inschrijvingen.tab.php");
            window.location.href = "/?#leerlingen-leerling?id=" + id + ",tab=inschrijvingen";
        }
        return false;
    };
    const iTag = document.createElement("i");
    anchor.appendChild(iTag);
    iTag.classList.add('fas', "fa-user-alt");
    return cell;
}

function stripStudentName(name: string): string {
    return name.replaceAll(/[,()'-]/g, " ").replaceAll("  ", " ");
}

async function fetchStudentId(studentName: string) {
    let strippedStudentName = stripStudentName(studentName);
    return fetch("/view.php?args=zoeken?zoek="+encodeURIComponent(strippedStudentName))
        .then((response) => response.text())
        .then((_text) => fetch("/views/zoeken/index.view.php"))
        .then((response) => response.text())
        .then((text) => findStudentId(studentName, text))
        .catch(err => {
            console.error('Request failed', err);
            return -1;
        });
}

function findStudentId(studentName: string, text: string) {
    studentName = studentName.replaceAll(",", ""); // search results do not contain a comma between first and last name.
    db3(studentName);
    db3(text);
    let namePos = text.indexOf(studentName);
    if (namePos < 0) {
        return 0
    }
    //the name comes AFTER the id, hence the backward search of the leftmost slice of the string.
    let idPos = text.substring(0, namePos).lastIndexOf("'id=", namePos);
    let id = text.substring(idPos, idPos+10);
    let found = id.match(/\d+/);
    if(found?.length)
        return parseInt(found[0]);
    throw `No id found for student ${studentName}.`;
}
