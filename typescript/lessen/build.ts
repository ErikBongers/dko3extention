import {FULL_CLASS_BUTTON_ID, TRIM_DIV_ID} from "../def";
import {db3, isButtonHighlighted, stripStudentName} from "../globals";
import {BlockInfo, mergeBlockStudents, TableData} from "./convert";
import {StudentInfo} from "./scrape";
import * as html from "../../libs/Emmeter/html";
import {emmet} from "../../libs/Emmeter/html";
import {NBSP} from "../../libs/Emmeter/tokenizer";
import {PageName} from "../gotoState";
import {getTrimPageElements} from "./observer";
import {getPageSettings, PageSettings, savePageSettings} from "../pageState";

export enum NameSorting {
    FirstName, LastName
}

export enum TrimesterGrouping {
    TeacherInstrumentHour,
    InstrumentTeacherHour ,
    TeacherHour,
    InstrumentHour,
    Instrument,
    Teacher
}

export interface LessenPageState extends PageSettings {
    pageName: PageName
    nameSorting: NameSorting,
    grouping: TrimesterGrouping,
    searchText: string,
    filterOffline: boolean
    filterOnline: boolean
    filterNoTeacher: boolean;
    filterNoMax: boolean;
    filterFullClass: boolean;
    filterOnlineAlc: boolean;
    filterWarnings: boolean;
}

export function getDefaultPageSettings() {
    return {
        pageName: PageName.Lessen,
        nameSorting: NameSorting.LastName,
        grouping: TrimesterGrouping.InstrumentTeacherHour,
        searchText: "",
        filterOffline: false,
        filterOnline: false,
        filterNoTeacher: false,
        filterNoMax: false,
        filterFullClass: false,
        filterOnlineAlc: false,
        filterWarnings: false,
    } as LessenPageState;
}

let pageState: LessenPageState = getDefaultPageSettings();

export function setSavedNameSorting(sorting: NameSorting) {
    pageState.nameSorting = sorting;
    savePageSettings(pageState);
}

export function getSavedNameSorting() {
    pageState = getPageSettings(PageName.Lessen, pageState) as LessenPageState;
    return pageState.nameSorting;
}

export function buildTrimesterTable(tableData: TableData, trimElements: TrimElements) {
    pageState = getPageSettings(PageName.Lessen, pageState) as LessenPageState;
    tableData.blocks.sort((block1, block2) => block1.instrumentName.localeCompare(block2.instrumentName));
    trimElements.trimTableDiv = html.emmet.create(`#${TRIM_DIV_ID}>table#trimesterTable[border="2" style.width="100%"]>colgroup>col*3`).root as HTMLDivElement;

    trimElements.trimTableDiv.dataset.showFullClass= isButtonHighlighted(FULL_CLASS_BUTTON_ID) ? "true" : "false";

    let { root: newTable, last: trHeader } = html.emmet.create("#trimesterTable>tbody+thead.table-secondary>tr");
    Object.assign(trimElements, getTrimPageElements()); //update trimElements

    let newTableBody = newTable.querySelector("tbody");

    let totTrim = [0,0,0];
    for (let block of tableData.blocks) {
        let totJaar = block.jaarModules.map(mod => mod.students.length).reduce((prev, curr) => prev + curr, 0);
        for(let trimNo of [0,1,2]) {
            totTrim[trimNo] += totJaar + (block.trimesters[trimNo][0]?.students?.length ?? 0);
        }
    }

    html.emmet.append(trHeader as HTMLTableRowElement, "(th>div>span.bold{Trimester $}+span.plain{ ($$ lln)})*3", (index) => totTrim[index].toString());
    switch(pageState.grouping) {
        case TrimesterGrouping.InstrumentTeacherHour:
            for (let [instrumentName, instrument] of tableData.instruments) {
                buildGroup(newTableBody, instrument.blocks, instrumentName, (block) => block.teacher, DisplayOptions.Hour | DisplayOptions.Location);
            }
            break;
        case TrimesterGrouping.TeacherInstrumentHour:
            for (let [teacherName, teacher] of tableData.teachers) {
                buildGroup(newTableBody, teacher.blocks, teacherName, (block) => block.instrumentName, DisplayOptions.Hour | DisplayOptions.Location);
            }
            break;
        case TrimesterGrouping.TeacherHour:
            for (let [teacherName, teacher] of tableData.teachers) {
                buildTitleRow(newTableBody, teacherName);
                for (let [hour, block] of teacher.lesMomenten) {
                    buildBlock(newTableBody, block, teacherName, (_block) => hour, DisplayOptions.Location);
                }
            }
            break;
        case TrimesterGrouping.InstrumentHour:
            for (let [instrumentName, instrument] of tableData.instruments) {
                buildTitleRow(newTableBody, instrumentName);
                for (let [hour, block] of instrument.lesMomenten) {
                    buildBlock(newTableBody, block, instrumentName, (_block) => hour, DisplayOptions.Location);
                }
            }
            break;
        case TrimesterGrouping.Instrument:
            for (let [instrumentName, instrument] of tableData.instruments) {
                buildTitleRow(newTableBody, instrumentName);
                for (let [, block] of instrument.mergedBlocks) {
                    buildBlock(newTableBody, block, instrumentName, undefined, DisplayOptions.Hour | DisplayOptions.Location | DisplayOptions.Teacher);
                }
            }
            break;
        case TrimesterGrouping.Teacher:
            for (let [teacherName, teacher] of tableData.teachers) {
                buildTitleRow(newTableBody, teacherName);
                for (let [, block] of teacher.mergedBlocks) {
                    buildBlock(newTableBody, block, teacherName, undefined, DisplayOptions.Hour | DisplayOptions.Location | DisplayOptions.Instrument);
                }
            }
            break;
    }
}

function buildGroup(newTableBody: HTMLTableSectionElement, blocks: BlockInfo[], groupId: string, getBlockTitle: (block: BlockInfo) => string, displayOptions: DisplayOptions) {
    buildTitleRow(newTableBody, groupId);
    for (let block of blocks) {
        buildBlock(newTableBody, block, groupId, getBlockTitle, displayOptions);
    }
}

function createStudentRow(tableBody: HTMLTableSectionElement, rowClass: string, groupId: string, blockId: number) {
    let row = createLesRow(groupId, blockId);
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

function buildBlock(newTableBody: HTMLTableSectionElement, block: BlockInfo, groupId: string, getBlockTitle: (undefined | ((block: BlockInfo) => string)), displayOptions: DisplayOptions) {
    let mergedBlockStudents = mergeBlockStudents(block);

    let trimesterHeaders = [0,1,2] .map(trimNo => {
        if(mergedBlockStudents.trimesterStudents[trimNo].length < 5 && mergedBlockStudents.maxAantallen[trimNo] < 5)
            return "";
        return `${mergedBlockStudents.trimesterStudents[trimNo].length + mergedBlockStudents.jaarStudents.length} van ${mergedBlockStudents.maxAantallen[trimNo]} lln`;
    });

    let trTitle = buildBlockTitle(newTableBody, block, getBlockTitle, groupId);
    let headerRows = buildBlockHeader(newTableBody, block, groupId, trimesterHeaders, displayOptions);
    let studentTopRowNo = newTableBody.children.length;


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
        sortStudents(mergedBlockStudents.jaarStudents);
        for(let student of mergedBlockStudents.jaarStudents) {
            let row = createStudentRow(newTableBody, "jaarRow", groupId, block.id);
            for (let trimNo = 0; trimNo < 3; trimNo++) {
                let cell = buildStudentCell(student);
                row.appendChild(cell);
                cell.classList.add("jaarStudent");
                if (filledRowCount >= mergedBlockStudents.maxAantallen[trimNo]) {
                    cell.classList.add("gray");
                }
            }
            filledRowCount++;
        }

    //Fill trimester rows
    let hasFullClass = false;
    for (let rowNo = 0; filledRowCount < mergedBlockStudents.blockNeededRows; rowNo++) {
        let row = createStudentRow(newTableBody,"trimesterRow", groupId, block.id);

        for (let trimNo = 0; trimNo < 3; trimNo++) {
            let trimester = mergedBlockStudents.trimesterStudents[trimNo];
            sortStudents(trimester);
            let student: StudentInfo = undefined;
            if (trimester) {
                student = trimester[rowNo];
                let maxTrimStudentCount = Math.max(mergedBlockStudents.maxAantallen[trimNo], mergedBlockStudents.maxJaarStudentCount);
                if (trimester.length > 0 && trimester.length >= maxTrimStudentCount) {
                    row.dataset.hasFullClass = "true";
                    hasFullClass = true;
                }
            }
            let cell = buildStudentCell(student);
            row.appendChild(cell);
            cell.classList.add("trimesterStudent");
            if (filledRowCount >= mergedBlockStudents.maxAantallen[trimNo]) {
                cell.classList.add("gray");
            }
            if(student?.trimesterInstruments) {
                if (student?.trimesterInstruments[trimNo].length > 1) {
                    cell.classList.add("yellowMarker");
                }
            }
        }
        filledRowCount++;
    }
    if(hasFullClass) {
        if(trTitle)
            trTitle.dataset.hasFullClass = "true"; //todo:  replace with class as it's display only.
        headerRows.trModuleLinks.dataset.hasFullClass = "true";
    }
    if (!mergedBlockStudents.hasWachtlijst) {
        return;
    }

    //build the wachtlijst row
    for (let trimNo of [0,1,2]) {
        let row = newTableBody.children[newTableBody.children.length-1];
        row.classList.add("wachtlijst");
        let cell = row.children[trimNo];
        if (mergedBlockStudents.wachtlijsten[trimNo] === 0) {
            continue;
        }
        const small = document.createElement("small");
        cell.appendChild(small);
        small.appendChild(document.createTextNode(`(${mergedBlockStudents.wachtlijsten[trimNo]} op wachtlijst)`));
        small.classList.add("text-danger");

        //studens on wachtlijst and there is still room available?
        if (mergedBlockStudents.wachtlijsten[trimNo] > 0 && mergedBlockStudents.trimesterStudents[trimNo].length < mergedBlockStudents.maxAantallen[trimNo]) {
            cell.querySelector("small").classList.add("yellowMarker");
            newTableBody.children[studentTopRowNo + mergedBlockStudents.trimesterStudents[trimNo].length].children[trimNo].classList.add("yellowMarker");
        }
    }
}

function createLesRow(groupId: string, blockId: number) {
    let tr = document.createElement("tr");
    tr.dataset.blockId = ""+blockId;
    if(blockId)
        tr.dataset.groupId = groupId;
    else
        tr.dataset.blockId = "groupTitle";// a title row does not belong to a block.
    return tr;
}

function buildTitleRow(newTableBody: HTMLTableSectionElement, title: string) {
    const trTitle = createLesRow(title, undefined);
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

function buildBlockTitle(newTableBody: HTMLTableSectionElement, block: BlockInfo, getBlockTitle: (undefined | ((block: BlockInfo) => string)), groupId: string) {
    if(!getBlockTitle && !block.errors)
        return undefined;
    const trBlockTitle = newTableBody.appendChild(createLesRow(groupId, block.id));
    trBlockTitle.classList.add("blockRow");

    let {last: divBlockTitle} = html.emmet.append(trBlockTitle, "td.infoCell[colspan=3]>div.text-muted");
    if(getBlockTitle) {
        emmet.appendChild(divBlockTitle as HTMLDivElement, `span.blockTitle{${getBlockTitle(block)}}`);
    }

    for (let jaarModule of block.jaarModules) {
        divBlockTitle.appendChild(buildModuleButton(">", jaarModule.id, false))
    }

    if(block.errors) {
        let errorSpan = document.createElement("span");
        errorSpan.appendChild(document.createTextNode(block.errors));
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

function buildInfoRow(newTableBody: HTMLTableSectionElement, _text: string, show: boolean, groupId: string, blockId: number) {
    const trBlockInfo = newTableBody.appendChild(createLesRow(groupId, blockId));
    trBlockInfo.classList.add("blockRow");
    if(show===false)
        trBlockInfo.dataset.keepHidden = "true";
    trBlockInfo.dataset.groupId = groupId;

    return html.emmet.append(trBlockInfo, "td.infoCell[colspan=3]>div.text-muted");
}

function buildInfoRowWithText(newTableBody: HTMLTableSectionElement, show: boolean, blockId: number, groupId: string, text: string)  {
    let {last: divMuted} = buildInfoRow(newTableBody, "", show, groupId, blockId);
    divMuted.appendChild(document.createTextNode(text));
}

function buildBlockHeader(newTableBody: HTMLTableSectionElement, block: BlockInfo, groupId: string, trimesterHeaders: string[], displayOptions: DisplayOptions) {
    //INFO
    buildInfoRowWithText(newTableBody, Boolean((DisplayOptions.Teacher & displayOptions)), block.id, groupId, block.teacher);
    buildInfoRowWithText(newTableBody, Boolean((DisplayOptions.Instrument & displayOptions)), block.id, groupId, block.instrumentName);
    buildInfoRowWithText(newTableBody, Boolean((DisplayOptions.Hour & displayOptions)), block.id, groupId, block.formattedLesmoment);
    buildInfoRowWithText(newTableBody, Boolean((DisplayOptions.Location & displayOptions)), block.id, groupId, block.vestiging);
    if(block.tags.length > 0) {
        let {last: divMuted} = buildInfoRow(newTableBody, block.tags.join(), true, groupId, block.id);
        emmet.appendChild(divMuted as HTMLDivElement, block.tags.map(tag => {
            let mutedClass = tag.partial ? ".muted" : "";
            return `span.badge.badge-ill.badge-warning${mutedClass}{${tag.name}}`;
        }).join('+'))
    }

    //build row for module links(the tiny numbered buttons)
    const trModuleLinks = createLesRow(groupId, block.id);
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
        trModuleLinks: trModuleLinks
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
    let displayName = String.fromCharCode(NBSP);
    studentSpan.appendChild(document.createTextNode(displayName));
    cell.appendChild(studentSpan);
    if (!student) {
        return cell;
    }

    if(pageState.nameSorting === NameSorting.LastName)
        displayName = student.naam + " " + student.voornaam;
    else
        displayName = student.voornaam + " " + student.naam;
    studentSpan.textContent = displayName;

    if (student.allYearSame) {
        studentSpan.classList.add("allYear");
    }

    const button = cell.appendChild(document.createElement("button"));
    button.classList.add("student");
    button.title = student.info;
    button.onclick= async function () {
        let id = await fetchStudentId(student.name);
        if(id <= 0)
            window.location.href = "/#zoeken?zoek="+ stripStudentName(student.name).replaceAll(" ", "+");
        else {
            window.location.href = "#leerlingen-leerling?id=" + id + ",tab=inschrijvingen";
        }
        return false;
    };
    const iTag = document.createElement("i");
    button.appendChild(iTag);
    iTag.classList.add('fas', "fa-user-alt");
    if (student.notAllTrimsHaveAnInstrument) {
        iTag.classList.add("no3trims");
    }
    return cell;
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

export interface TrimElements {
    trimTable: HTMLTableElement;
    trimTableDiv: HTMLDivElement;
    lessenTable: HTMLTableElement;
    trimButton: HTMLButtonElement;
}

export function sortStudents(students: StudentInfo[]) {
    if (!students) return;
    let comparator = new Intl.Collator();
    let sorting = getSavedNameSorting();
    students
        //sort full year students on top.
        .sort((a, b) => {
            if (a.allYearSame && (!b.allYearSame)) {
                return -1;
            } else if ((!a.allYearSame) && b.allYearSame) {
                return 1;
            } else {
                let aName = sorting === NameSorting.LastName ? a.naam + a.voornaam : a.voornaam + a.naam;
                let bName = sorting === NameSorting.LastName ? b.naam + b.voornaam : b.voornaam + b.naam;
                return comparator.compare(aName, bName);
            }
        });
}
