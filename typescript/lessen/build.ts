import {FULL_CLASS_BUTTON_ID, isButtonHighlighted, TRIM_DIV_ID} from "../def";
import {db3} from "../globals";
import {BlockInfo, mergeBlockStudents, TableData, TOO_LARGE_MAX} from "./convert";
import {StudentInfo} from "./scrape";
import * as html from "../html";
import {NBSP} from "../html";

export enum TrimesterSorting { TeacherInstrumentHour, InstrumentTeacherHour , TeacherHour}

export function buildTrimesterTable(tableData: TableData, trimesterSorting: TrimesterSorting) {
    tableData.blocks.sort((block1, block2) => block1.instrumentName.localeCompare(block2.instrumentName));
    let trimDiv = html.emmet.create(`#${TRIM_DIV_ID}>table#trimesterTable[border="2" style.width="100%"]>colgroup>col*3`).root;

    trimDiv.dataset.showFullClass= isButtonHighlighted(FULL_CLASS_BUTTON_ID) ? "true" : "false";

    let { root: newTable, last: trHeader } = html.emmet.create("#trimesterTable>tbody+thead.table-secondary>tr");

    let newTableBody = newTable.querySelector("tbody");

    let totTrim = [0,0,0];
    for (let block of tableData.blocks) {
        let totJaar = block.jaarModules.map(mod => mod.students.length).reduce((prev, curr) => prev + curr, 0);
        for(let trimNo of [0,1,2]) {
            totTrim[trimNo] += totJaar + (block.trimesters[trimNo][0]?.students?.length ?? 0);
        }
    }

    html.emmet.append(trHeader, "(th>div>span.bold{Trimester $}+span.plain{ ($$ lln)})*3", (index) => totTrim[index].toString());
    switch(trimesterSorting) {
        case TrimesterSorting.InstrumentTeacherHour:
            for (let [instrument, blocks] of tableData.instruments) {
                buildGroup(newTableBody, blocks, instrument, (block) => block.teacher);
            }
            break;
        case TrimesterSorting.TeacherInstrumentHour:
            for (let [teacherName, teacher] of tableData.teachers) {
                buildGroup(newTableBody, teacher.blocks, teacherName, (block) => block.instrumentName);
            }
            break;
        case TrimesterSorting.TeacherHour:
            for (let [teacherName, teacher] of tableData.teachers) {
                buildTitleRow(newTableBody, teacherName);
                for (let [hour, block] of teacher.lesMomenten) {
                    buildBlock(newTableBody, block, teacherName, (_block) => hour);
                }
            }
            break;
    }
}

function buildGroup(newTableBody: HTMLTableSectionElement, blocks: BlockInfo[], groupId: string, getBlockTitle: (block: BlockInfo) => string) {
    buildTitleRow(newTableBody, groupId);
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

    let trTitle= buildBlockTitle(newTableBody, block, getBlockTitle(block), groupId);
    let headerRows = buildBlockHeader(newTableBody, block, groupId, trimesterHeaders);
    let studentTopRowNo = newTableBody.children.length;

    trTitle.dataset.hasFullClass = "false";
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
                if (trimester.length > 0 && trimester.length >= maxTrimStudentCount) {
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
        trTitle.dataset.hasFullClass = "true";
        headerRows.trModuleLinks.dataset.hasFullClass = "true";
    }
    if (!mergedBlock.hasWachtlijst) {
        return;
    }

    //build the wachtlijst row
    for (let trimNo of [0,1,2]) {
        let row = newTableBody.children[newTableBody.children.length-1];
        row.classList.add("wachtlijst");
        let cell = row.children[trimNo];
        if (mergedBlock.wachtlijsten[trimNo] === 0) {
            continue;
        }
        const small = document.createElement("small");
        cell.appendChild(small);
        small.appendChild(document.createTextNode(`(${mergedBlock.wachtlijsten[trimNo]} op wachtlijst)`));
        small.classList.add("text-danger");

        //studens on wachtlijst and there is still room available?
        if (mergedBlock.wachtlijsten[trimNo] > 0 && mergedBlock.trimesterStudents[trimNo].length < mergedBlock.maxAantallen[trimNo]) {
            cell.querySelector("small").classList.add("yellowMarker");
            newTableBody.children[studentTopRowNo + mergedBlock.trimesterStudents[trimNo].length].children[trimNo].classList.add("yellowMarker");
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

function buildTitleRow(newTableBody: HTMLTableSectionElement, title: string) {
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

function buildBlockTitle(newTableBody: HTMLTableSectionElement, block: BlockInfo, subTitle: string, groupId: string) {
    const trBlockTitle = createLesRow(groupId);
    newTableBody.appendChild(trBlockTitle);
    trBlockTitle.classList.add("blockRow");

    const tdBlockTitle = document.createElement("td");
    trBlockTitle.appendChild(tdBlockTitle);
    tdBlockTitle.classList.add("infoCell");
    tdBlockTitle.setAttribute("colspan", "3");

    let divBlockTitle = document.createElement("div");
    tdBlockTitle.appendChild(divBlockTitle);
    divBlockTitle.classList.add("text-muted");
    let spanSubtitle = document.createElement("span");
    divBlockTitle.appendChild(spanSubtitle);
    spanSubtitle.classList.add("subTitle"); //TODO: rename to blockTitle
    spanSubtitle.appendChild(document.createTextNode(subTitle));

    for (let jaarModule of block.jaarModules) {
        divBlockTitle.appendChild(buildModuleButton(">", jaarModule.id, false))
    }

    let errorsAndWarnings = "";
    let maxMoreThan100 = block.jaarModules
        .map(module => module.maxAantal > TOO_LARGE_MAX)
        .includes(true);
    if(!maxMoreThan100) {
        maxMoreThan100 = block.trimesters.flat()
            .map(module => module?.maxAantal > TOO_LARGE_MAX)
            .includes(true);
    }
    if(maxMoreThan100)
        errorsAndWarnings += "Max aantal lln > " + TOO_LARGE_MAX;

    if(errorsAndWarnings) {
        let errorSpan = document.createElement("span");
        errorSpan.appendChild(document.createTextNode(errorsAndWarnings));
        errorSpan.classList.add("lesError");
        divBlockTitle.appendChild(errorSpan);
    }
    return trBlockTitle;
}

enum DisplayOptions {
    Teacher = 0x01,
    Hour = 0x02,
    Instrument = 0x04,
    Location = 0x08
}

function buildInfoRow(newTableBody: HTMLTableSectionElement, text: string, show: boolean) {
    const trBlockInfo = newTableBody.appendChild(createLesRow(groupId));
    trBlockInfo.classList.add("blockRow");
    trBlockInfo.style.visibility = show ? "visible" : "collapse";

    let divBlockInfo = html.emmet.append(trBlockInfo, "td.infoCell[colspan=3]>div.text-muted");
    divBlockInfo.appendChild(document.createTextNode(text)); // don't emmet this as I may use html templates for this.
}

function buildBlockHeader(newTableBody: HTMLTableSectionElement, block: BlockInfo, groupId: string, trimesterHeaders: string[], displayOptions: number) {
    //INFO
    buildInfoRow(newTableBody, block.instrumentName, (DisplayOptions.Instrument & displayOptions));
    buildInfoRow(newTableBody, block.lesmoment, (DisplayOptions.Hour & displayOptions));
    buildInfoRow(newTableBody, block.vestiging, (DisplayOptions.Location & displayOptions));

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
