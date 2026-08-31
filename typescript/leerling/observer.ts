import {db3, Schoolyear, wrapElement} from "../globals";
import {HashObserver} from "../pageObserver";
import {options} from "../plugin_options/options";
import {fetchLes, LesDetails} from "../les/fetch";
import {DropDownMenu} from "../dropDownMenus";
import {textsToYearGrades} from "../lessen/scrape";
import {GradeYear} from "../roster_diff/calcDiff";
import {DomeinString, LessenFilterBuilder, LessenFilterDomein} from "../lessen/fetch";
import {emmet} from "../../libs/Emmeter/html";

class LeerlingObserver extends HashObserver {
    constructor() {
        super("#leerlingen-leerling", onMutation);
    }
    isPageReallyLoaded(): boolean {
        throw new Error("Method not implemented.");
    }
}

export default new LeerlingObserver();

function onMutation(mutation: MutationRecord) {
    checkAndExpandTabs();
    checkAndDecorateName();
    let tabInschrijving = document.getElementById("leerling_inschrijvingen_weergave");
    if (mutation.target === tabInschrijving) {
        onInschrijvingChanged(tabInschrijving);
        return true;
    }
    if ((mutation.target as HTMLElement).id.includes("_uitleningen_table")){
        onUitleningenChanged(mutation.target as HTMLElement);
        return true;
    }
    let tabAttesten = document.getElementById("attesten");
    if (mutation.target === tabAttesten) {
        onAttestenChanged();
        return true;
    }
    return false;
}

function checkAndDecorateName(): void {
    let header = document.getElementById("vh_header_leerlingen_leerling_left_title") as HTMLHeadingElement;
    if (!header)
        return;
    if (header.dataset.nameDecorated === "true")
        return;

    decorateName(header);
    header.dataset.nameDecorated = "true";
    return;
}

function decorateName(header: HTMLHeadingElement): void {
    if(!options.reorderStudentName)
        return;
    let name = header.textContent;
    let split = name.split(",");
    let firstName = split.pop() ?? "";
    let lastName = split.pop() ?? "";
    let officialFirstName = "";
    if(firstName.includes("(")) {
        let matches = firstName.match(/(\S*) *\((.*)\)/);
        if(matches?.length === 3) {
            firstName = matches[2];
            officialFirstName = matches[1];
        }
    }

    header.textContent = "";
    let spanFirstName = document.createElement("span");
    spanFirstName.classList.add("firstName");
    spanFirstName.innerText = firstName;
    header.appendChild(spanFirstName);
    header.appendChild(document.createTextNode(" "));
    let spanLastName = document.createElement("span");
    spanLastName.classList.add("lastName");
    spanLastName.innerText = lastName;
    header.appendChild(spanLastName);
    if(officialFirstName) {
        header.appendChild(document.createTextNode(" ("));
        let spanCallName = document.createElement("span");
        spanCallName.classList.add("officialName");
        spanCallName.innerText = officialFirstName;
        header.appendChild(spanCallName);
        header.appendChild(document.createTextNode(")"));
    }
}

function checkAndExpandTabs(): void {
    let tabsLeerling = document.querySelector("#tab_leerling") as HTMLDivElement;
    if (!tabsLeerling)
        return;
    if (tabsLeerling.dataset.expanded === "true")
        return;

    expandTabs(tabsLeerling);
    tabsLeerling.dataset.expanded = "true";
    return;
}

function expandTabs(tabsLeerling: HTMLDivElement): void {
    let tabBefore = tabsLeerling.querySelector("div.card-header > ul > li:nth-child(4)");
    if (!tabBefore)
        return;

    let anchors = tabsLeerling.querySelectorAll("a.dropdown-item") as NodeListOf<HTMLAnchorElement>;
    for (let anchor of anchors) {
        if(["#evaluatie2", "#aanwezigheden", "#uitleningen"].includes(anchor.getAttribute("href") ?? "")) {
            let li = document.createElement("li");
            li.classList.add("nav-item");
            li.appendChild(anchor);
            anchor.classList.remove("dropdown-item");
            anchor.classList.add("nav-link");
            tabBefore.insertAdjacentElement("afterend", li);
        }
    }
}

function onAttestenChanged() {
    decorateSchooljaar();
}

function onUitleningenChanged(tableUitleningen: HTMLElement) {
    let firstCells :NodeListOf<HTMLTableCellElement> = tableUitleningen.querySelectorAll("tbody > tr > td:first-child");
    for(let cell of firstCells) {
        if (cell.classList.contains("text-muted")) {
            break;//empty table with fake row.
        }
        let anchor = document.createElement("a");
        anchor.innerText = cell.innerText;
        anchor.setAttribute("href", "/#extra-assets-uitleningen-uitlening?id="+anchor.innerText);
        cell.textContent = "";
        cell.appendChild(anchor);
    }
}

function getSchooljaarElementAndListen() {
    let schooljaar = Schoolyear.getSelectElement();
    let listening = "changeListerenAdded";
    if(!schooljaar?.classList.contains(listening)){
        schooljaar?.classList.add(listening);
        schooljaar?.addEventListener("click", () => {
           decorateSchooljaar();
        });
    }
    return schooljaar;
}

function isActiveYear() {
    let selectedYearElement = getSchooljaarElementAndListen();
    if(!selectedYearElement)
        return true;
    let selectedYear = parseInt(selectedYearElement.value);//only parses the first valid number in the string.
    let now = new Date();
    let month = now.getMonth();
    let registrationSchoolYearStart = now.getFullYear();
    if (month <= 3) {
        registrationSchoolYearStart--;
    }
    return selectedYear === registrationSchoolYearStart;
}

function decorateSchooljaar() {
    let view = document.getElementById("view_contents")!;
    let activeYear = isActiveYear();
    if (activeYear) {
        view.classList.remove("oldYear");
    } else {
        view.classList.add("oldYear");
    }
    if(!activeYear) {
        let toewijzingButtons = document.querySelectorAll("#leerling_inschrijvingen_weergave button");
        Array.from(toewijzingButtons)
            .filter((el) => (el.textContent === "toewijzing") || (el.textContent === "inschrijving"))
            .forEach((btn) => btn.classList.add("oldYear"));
    }
}

function decorateTrimModules(tabInschrijving: HTMLElement) {
    let moduleButtons = tabInschrijving.querySelectorAll("tr td.right_center > button");
    for (let btn of moduleButtons) {
        let onClick = btn.getAttribute("onclick")!;
        let tr = btn.parentNode!.parentNode!;
        onClick = onClick.substring(10, onClick.length - 1);
        let args = onClick
            .split(", ")
            .map((arg) => arg.replaceAll("'", ""));
        // @ts-ignore
        getModules(...args) // making assumptions about the arguments here.
            .then((modNames) => {
                let instrumentText = "";
                if (modNames.length) {
                    (tr.children[0] as HTMLTableCellElement).innerText += ": ";
                    let rxBasic = /Initiatie +(.*) *- *trimester.*/i;
                    let rxWide = /Initiatie +(.*) *- *trimester.* *- *(.*)/i;
                    let rxDesperate = /Initiatie +(.*)/i;
                    instrumentText += modNames
                        .map(modName => {
                            let matches = modName.match(rxWide);
                            if (matches && matches?.length >= 2) {
                                return matches[1].trim() + " - " + matches[2].trim();
                            }
                            matches = modName.match(rxBasic);
                            if (matches && matches?.length >= 1) {
                                return matches[1].trim();
                            }
                            matches = modName.match(rxDesperate);
                            if (matches && matches?.length >= 1) {
                                return matches[1].trim();
                            }
                            return ": ???";
                        })
                        .join(", ");
                }
                let span = document.createElement("span");
                tr.children[0].appendChild(span);
                if (modNames.length > 1) {
                    span.classList.add("badge-warning");
                }
                span.innerText = instrumentText;
            });
    }
}

async function onInschrijvingChanged(tabInschrijving: HTMLElement) {
    db3("inschrijving (tab) changed.");

    decorateSchooljaar();

    decorateTrimModules(tabInschrijving);

    if (options.showNotAssignedClasses) {
        setStripedLessons();
    }

    let opleidingen = scrapeOpleidingen();
    console.log("scrapeOpleidingen", opleidingen);
    // let iGotoClassList = document.querySelectorAll("#leerling_inschrijvingen_weergave div table tbody i.fa-list-ul") as NodeListOf<HTMLSpanElement>;
    for(let opleiding of opleidingen) {
        for(let lesInfo of opleiding.lessen) {
            if(!lesInfo.gotoButton)
                continue;
            let btnOnClick = lesInfo.gotoButton.getAttribute("onclick");
            if(!btnOnClick)
                continue;
            let matchLesId = btnOnClick.match(/id=(\d+)/);
            if (matchLesId) {
                let lesId = matchLesId[1];
                let wrapper = wrapElement(lesInfo.gotoButton, "div");
                lesInfo.gotoButton.removeAttribute("onclick");
                let newBtnGotoLes = lesInfo.gotoButton.cloneNode(true) as HTMLElement;
                lesInfo.gotoButton.replaceWith(newBtnGotoLes);
                newBtnGotoLes.dataset.originalOnClick = btnOnClick;
                let menu = new DropDownMenu(wrapper, newBtnGotoLes, "left");
                menu.cancelDropDown = async () => {
                    let lesDetails = await fetchLes(lesId);
                    if (!lesDetails.isIndividualLes) {
                        fillClassesMenu(menu, opleiding.domein as DomeinString, opleiding.gradeYears[0], lesInfo.vak, btnOnClick).then(() => {
                        }); //fallthrough
                        return false;
                    }
                    menu.clickItem(0);
                    return true; //CANCEL
                }
            }
        }
    }
}

interface LesInfo {
    vak: string;
    lesNaam: string
    gotoButton: HTMLButtonElement | null;
}


interface Opleiding {
    domein: DomeinString | "";
    gradeYears: GradeYear[];
    lessen: LesInfo[];
}

function scrapeOpleidingen() {
    let divOpleidingen = document.getElementById("leerling_inschrijvingen_weergave") as HTMLDivElement;
    let tBody = divOpleidingen.querySelector("tbody") as HTMLTableSectionElement;
    let opleidingen: Opleiding[] = [];
    for(let tr of tBody.querySelectorAll("tr")) {
        let detailsTdOffset = 0;
        if([...tr.classList].find(c => c.includes("inschrijvingen_domein"))) {
            let rowSpan = tr.cells[0].getAttribute("rowspan");
            if (rowSpan) {
                let opleiding = scrapeOpleidingRow(tr);
                opleidingen.push(opleiding);
                detailsTdOffset = 3; //todo: find the exact number of cells to skip
            }
        }
        //scrape details
        let lesInfo = scrapeLesInfoDetails(tr, detailsTdOffset);

        opleidingen[opleidingen.length-1].lessen.push(lesInfo);
    }
    return opleidingen;
}

function scrapeOpleidingRow(tr: HTMLTableRowElement) {
    let tdOpleiding = tr.querySelector("td:nth-child(2)") as HTMLTableCellElement;
    let tdText = tdOpleiding.textContent;
    let domein: DomeinString | "" = "";
    if (tdText.includes("DomeinOv")) domein = "DomeinOV";
    if (tdText.includes("Muziek")) domein = "Muziek";
    if (tdText.includes("Woord")) domein = "Woord";
    console.log("tdOpleiding", tdText, domein);
    let rx = new RegExp(`${domein}\\s*-\\s*<strong>(.*?)</strong>`);
    let gradeYearText = rx.exec(tdOpleiding.innerHTML)?.at(1);
    let gradeYears: GradeYear[] = [];
    if (gradeYearText)
        gradeYears = textsToYearGrades([gradeYearText]);
    let opleiding: Opleiding = {domein, gradeYears, lessen: []};
    return opleiding;
}

function scrapeLesInfoDetails(tr: HTMLTableRowElement, detailsTdOffset: number) {
    let tdVakLes = tr.cells[detailsTdOffset+1] as HTMLTableCellElement;
    let strong = tdVakLes.querySelector("strong") as HTMLHeadingElement | null;
    let vakNaam = strong?.textContent ?? "";
    let small = tdVakLes.querySelector("small") as HTMLHeadingElement | null;
    let lesNaam = small?.textContent ?? "";
    let iGotoClass = tr.querySelector("i.fa-list-ul") as HTMLSpanElement | null;
    let gotoButton: HTMLButtonElement | null = null;
    if(iGotoClass) {
        gotoButton = iGotoClass.parentElement as HTMLButtonElement;
    }

    let lesInfo: LesInfo = {vak: vakNaam, lesNaam, gotoButton};
    return lesInfo;
}

async function fillClassesMenu(menu: DropDownMenu, domein: DomeinString, gradeYear: GradeYear, vak: string, gotoLesCmd: string) {
    menu.removeAllItems();
    menu.addItem("Ga naar les", 0, gotoLesCmd);
    menu.addSeparator(`Bezig met laden...`, 0);
    let schoolYear = Schoolyear.findInPage();
    let lessenBuilder = await LessenFilterBuilder.create(schoolYear, domein);
    lessenBuilder.addGraad(GradeYear.toString([gradeYear]));
    if(!lessenBuilder.hasVak(vak))
    lessenBuilder.addVak(vak);
    let lessons = await lessenBuilder.fetch();
    menu.removeItem(1);
    for(let les of lessons) {
        let infoBlock = emmet.createElement(`
            div.small>(
                div.bold{${les.les.naam? les.les.naam : les.les.vakNaam+" "+les.les.naam}}+
                div{${les.les.formattedLesmoment}}+
                div{ ${les.les.aantal}/${les.les.maxAantal} lln}
            )
        `);
        menu.addInfo(infoBlock, 0);
    }
}

function setStripedLessons() {
    let classRows = document.querySelectorAll("#leerling_inschrijvingen_weergave tr");
    let classCells = Array.from(classRows)
        .filter(row => row.querySelector(".table-info") !== null)
        .map(row => row.children.item(row.children.length - 2)!);

    for (let td of classCells) {
        let classDate = td.querySelector("span.text-muted");
        if (!classDate)
            continue;
        if (classDate.textContent === "(geen lesmomenten)")
            continue;
        for (let tdd of td.parentElement!.children) {
            if (tdd.classList.contains("table-info")) {
                tdd.classList.add("runningStripes");
            }
        }
    }
}

async function getModules(_size: string, _modal: string, _file: string, args: string) {
    // let folder = modal.split("-").join("/");

    // This call is being skipped: (probably ok)
    // let res = await fetch('views/'+folder+'/'+file+'.modal.php?'+args);
    // let text = await res.text();

    // This call uses the `args` param, although that contains an extra schooljaar paran which is not really needed.
    // > 'inschrijving_vak_id=289840&schooljaar=2024-2025&lesmoment_id=4102'
    // let lesmoment_id = args.substring(args.lastIndexOf("=")+1);
    // let res2 = await fetch("/views/leerlingen/leerling/inschrijvingen/modules_kiezen.modules.div.php?inschrijving_vak_id=289840&lesmoment_id=" + lesmoment_id);
    let res2 = await fetch("/views/leerlingen/leerling/inschrijvingen/modules_kiezen.modules.div.php?"+args);

    let text2 = await res2.text();
    const template = document.createElement('template');
    template.innerHTML = text2;
    let checks = template.content.querySelectorAll("i.fa-check-square");
    return Array.from(checks)
        .map(check => check.parentNode!.parentNode!.parentNode!.querySelector("strong")!.textContent);
}

