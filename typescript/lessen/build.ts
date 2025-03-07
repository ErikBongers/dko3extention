import {FULL_CLASS_BUTTON_ID, isButtonHighlighted, TRIM_DIV_ID} from "../def";
import {db3} from "../globals";
import {BlockInfo, mergeBlockStudents, TableData} from "./convert";
import {StudentInfo} from "./scrape";

const NBSP = 160;

export enum TrimesterSorting { TeacherInstrumentHour, InstrumentTeacherHour , TeacherHour}

export function buildTrimesterTable(tableData: TableData, trimesterSorting: TrimesterSorting) {
    let blocks = tableData.blocks;//todo: temp - get rid of this.

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
        totTrim1 += block.trimesters[0][0]?.students?.length ?? 0;
        totTrim2 += block.trimesters[1][0]?.students?.length ?? 0;
        totTrim3 += block.trimesters[2][0]?.students?.length ?? 0;
        let totJaar = block.jaarModules.map(mod => mod.students.length).reduce((prev, curr) => prev + curr, 0);
        totTrim1 +=  totJaar;
        totTrim2 +=  totJaar;
        totTrim3 +=  totJaar;
    }

    //header
    const tHead = document.createElement("thead");
    newTable.appendChild(tHead);
    tHead.classList.add("table-secondary")
    const trHeader = createLesRow("tableheader");
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

    switch(trimesterSorting) {
        case TrimesterSorting.InstrumentTeacherHour: {
            for (let [instrument, blocks] of tableData.instruments) {
                buildGroup(newTableBody, blocks, trimesterSorting, instrument, (block) => block.teacher);
            }
            break;
        }
        case TrimesterSorting.TeacherInstrumentHour: {
            for (let [teacherName, teacher] of tableData.teachers) {
                buildGroup(newTableBody, teacher.blocks, trimesterSorting, teacherName, (block) => block.instrumentName);
            }
            break;
        }
        case TrimesterSorting.TeacherHour: {
            for (let [teacherName, teacher] of tableData.teachers) {
                buildTitleRow(newTableBody, trimesterSorting, teacherName);
                for (let [hour, block] of teacher.lesMomenten) {
                    buildBlock(newTableBody, block, teacherName, (_block) => hour);
                }
            }
            break;
        }

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

function buildGroup(newTableBody: HTMLTableSectionElement, blocks: BlockInfo[], trimesterSorting: TrimesterSorting, groupId: string, getBlockTitle: (block: BlockInfo) => string) {
    buildTitleRow(newTableBody, trimesterSorting, groupId);
    for (let block of blocks) {
        buildBlock(newTableBody, block, groupId, getBlockTitle);
    }
}

function createStudentRow(tableBody: HTMLTableSectionElement, rowClass: string, groupId: string) {
    let row = createLesRow(groupId);
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

function buildBlock(newTableBody: HTMLTableSectionElement, block: BlockInfo, groupId: string, getBlockTitle: (block: BlockInfo) => string) {
    blockCounter++;

    let mergedBlock = mergeBlockStudents(block);

    let trimesterHeaders = [0,1,2] .map(trimNo => {
        if(mergedBlock.trimesterStudents[trimNo].length < 5 && mergedBlock.maxAantallen[trimNo] < 5)
            return "";
        return `${mergedBlock.trimesterStudents[trimNo].length} van ${mergedBlock.maxAantallen[trimNo]} lln`;
    });

    buildBlockTitle(newTableBody, block, getBlockTitle(block), groupId);
    let headerRows = buildBlockHeader(newTableBody, block, groupId, getBlockTitle, trimesterHeaders);
    let studentTopRowNo = newTableBody.children.length;

    //TODO: headerRows.trTitle.dataset.hasFullClass = "false";
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
        for(let student of mergedBlock.jaarStudents) {
            let row = createStudentRow(newTableBody, "jaarRow", groupId);
            for (let trimNo = 0; trimNo < 3; trimNo++) {
                let cell = buildStudentCell(student);
                row.appendChild(cell);
                cell.classList.add("jaarStudent");
                if (mergedBlock.maxAantallen[trimNo] <= filledRowCount) {
                    cell.classList.add("gray");
                }
                //TODO: add all jaarModules to the students, and if more than one: yellow
                // if (student? trimesterInstruments[trimNo].length > 1) {
                //     cell.classList.add("yellowMarker");
                // }
            }
            filledRowCount++;
        }

    //Fill trimester rows
    for (let rowNo = 0; rowNo < (mergedBlock.blockNeededRows - filledRowCount); rowNo++) {
        let row = createStudentRow(newTableBody,"trimesterRow", groupId);

        for (let trimNo = 0; trimNo < 3; trimNo++) {
            let trimester = mergedBlock.trimesterStudents[trimNo];
            let student: StudentInfo = undefined;
            if (trimester) {
                student = trimester[rowNo];
                let maxTrimStudentCount = Math.max(mergedBlock.maxAantallen[trimNo], mergedBlock.maxJaarStudentCount);
                if (trimester.length >= maxTrimStudentCount) {
                    row.dataset.hasFullClass = "true";
                    hasFullClass = true;
                }
            }
            let cell = buildStudentCell(student);
            row.appendChild(cell);
            cell.classList.add("trimesterStudent");
            if (mergedBlock.maxAantallen[trimNo] <= rowNo) {
                cell.classList.add("gray");
            }
            if(student?.trimesterInstruments) {
                if (student?.trimesterInstruments[trimNo].length > 1) {
                    cell.classList.add("yellowMarker");
                }
            }
        }
    }
    if(hasFullClass) {
        //todo: headerRows.trTitle.dataset.hasFullClass = "true";
        headerRows.trModuleLinks.dataset.hasFullClass = "true";
    }
    if (!mergedBlock.hasWachtlijst) {
        return;
    }

    //build the wachtlijst row
    for (let trimNo = 0; trimNo < 3; trimNo++) {
        let colNo = trimNo;
        let rowNo = newTableBody.children.length-1;
        newTableBody.children[rowNo].classList.add("wachtlijst");
        let cell = newTableBody.children[rowNo].children[colNo];
        cell.classList.add("wachtlijst");
        let trimester = mergedBlock.trimesterStudents[trimNo];
        if (mergedBlock.wachtlijsten[trimNo] === 0) {
            continue;
        }
        const small = document.createElement("small");
        cell.appendChild(small);
        small.appendChild(document.createTextNode(`(${mergedBlock.wachtlijsten[trimNo]} op wachtlijst)`));
        small.classList.add("text-danger");

        if (mergedBlock.wachtlijsten[trimNo] > 0 && mergedBlock.trimesterStudents[trimNo].length < mergedBlock.maxAantallen[trimNo]) {
            cell.querySelector("small").classList.add("yellowMarker");
            newTableBody.children[studentTopRowNo + mergedBlock.trimesterStudents[trimNo].length].children[colNo].classList.add("yellowMarker");
        }
    }
}

let blockCounter = 0;

function createLesRow(groupId: string) {
    let tr = document.createElement("tr");
    tr.dataset.blockId = "block"+blockCounter;
    tr.dataset.groupId = groupId;
    return tr;
}

function buildTitleRow(newTableBody: HTMLTableSectionElement, trimesterSorting: TrimesterSorting, title: string) {
    const trTitle = createLesRow(title);
    trTitle.dataset.blockId = "groupTitle";// a title row does not belong to a block.
    newTableBody.appendChild(trTitle);
    trTitle.classList.add("blockRow", "groupHeader");
    trTitle.dataset.groupId = title;

    const tdTitle = document.createElement("td");
    trTitle.appendChild(tdTitle);
    tdTitle.classList.add("titleCell");
    tdTitle.setAttribute("colspan", "3");

    let divTitle = document.createElement("div");
    tdTitle.appendChild(divTitle);
    divTitle.classList.add("blockTitle");
    divTitle.appendChild(document.createTextNode(title));
    return {trTitle, divTitle};
}

function buildBlockTitle(newTableBody: HTMLTableSectionElement, block: BlockInfo, subTitle: string, groupId) {
    //SUBTITLE
    const trSubtitle = createLesRow(groupId);
    newTableBody.appendChild(trSubtitle);
    trSubtitle.classList.add("blockRow");

    const tdSubtitle = document.createElement("td");
    trSubtitle.appendChild(tdSubtitle);
    tdSubtitle.classList.add("infoCell");
    tdSubtitle.setAttribute("colspan", "3");

    let divSubtitle = document.createElement("div");
    tdSubtitle.appendChild(divSubtitle);
    divSubtitle.classList.add("text-muted");
    let spanSubtitle = document.createElement("span");
    divSubtitle.appendChild(spanSubtitle);
    spanSubtitle.classList.add("subTitle");
    spanSubtitle.appendChild(document.createTextNode(subTitle));

    for (let jaarModule of block.jaarModules) {
        divSubtitle.appendChild(buildModuleButton(">", jaarModule.id, false))
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
        divSubtitle.appendChild(errorSpan);
    }

}

function buildBlockHeader(newTableBody: HTMLTableSectionElement, block: BlockInfo, groupId: string, getBlockTitle: (block: BlockInfo) => string, trimesterHeaders: string[]) {
    //INFO
    const trBlockInfo = createLesRow(groupId);
    newTableBody.appendChild(trBlockInfo);
    trBlockInfo.classList.add("blockRow");

    const tdBlockkInfo = document.createElement("td");
    trBlockInfo.appendChild(tdBlockkInfo);
    tdBlockkInfo.classList.add("infoCell");
    tdBlockkInfo.setAttribute("colspan", "3");

    let divBlockInfo = document.createElement("div");
    tdBlockkInfo.appendChild(divBlockInfo);
    divBlockInfo.classList.add("text-muted");
    if(block.lesmoment) {
        divBlockInfo.appendChild(document.createTextNode(block.lesmoment));
    }
    if(block.vestiging) {
        if(block.lesmoment) divBlockInfo.appendChild(document.createElement("br"));
        divBlockInfo.appendChild(document.createTextNode(block.vestiging));
    }

    //build row for module links(the tiny numbered buttons)
    const trModuleLinks = createLesRow(groupId);
    newTableBody.appendChild(trModuleLinks);
    trModuleLinks.classList.add("blockRow");
    const tdLink1 = document.createElement("td");
    trModuleLinks.appendChild(tdLink1);
    tdLink1.appendChild(document.createTextNode(trimesterHeaders[0]));
    if (block.trimesters[0][0]) {
        tdLink1.appendChild(buildModuleButton("1", block.trimesters[0][0].id, true));
    }
    const tdLink2 = document.createElement("td");
    trModuleLinks.appendChild(tdLink2);
    tdLink2.appendChild(document.createTextNode(trimesterHeaders[1]));
    if (block.trimesters[1][0]) {
        tdLink2.appendChild(buildModuleButton("2", block.trimesters[1][0].id, true));
    }
    const tdLink3 = document.createElement("td");
    trModuleLinks.appendChild(tdLink3);
    tdLink3.appendChild(document.createTextNode(trimesterHeaders[2]));
    if (block.trimesters[2][0]) {
        tdLink3.appendChild(buildModuleButton("3", block.trimesters[2][0].id, true));
    }
    return {
        trModuleLinks: trModuleLinks,
        blockId: blockCounter
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
