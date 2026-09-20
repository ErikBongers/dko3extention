import {Schoolyear, wrapElement} from "../globals";
import {HashObserver} from "../pageObserver";
import {options} from "../plugin_options/options";
import {fetchLes} from "../les/fetch";
import {DropDownMenu} from "../dropDownMenus";
import {DomeinString, LessenFilterBuilder} from "../lessen/fetch";
import {emmet} from "../../libs/Emmeter/html";
import {GradeYear} from "../gradeYear";
import {restorePage, savePage} from "../restorePage";
import {buildLesTitle, createLesCard, LesInfo, Opleiding, scrapeOpleidingen} from "./scrape";

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
        // noinspection JSIgnoredPromiseFromCall
        onInschrijvingChanged(tabInschrijving);
        return true;
    }
    let contactsTable = document.querySelector("#card-contact table");
    if (contactsTable) {
        decoratePhoneNumbers();
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

function decoratePhoneNumbers() {
    console.log("decoratePhoneNumbers");
    let contactCardsDiv = document.getElementById("card-contact") as HTMLDivElement;
    if (!contactCardsDiv)
        return;
    [...contactCardsDiv.querySelectorAll("table a") as NodeListOf<HTMLAnchorElement>]
        .filter((anchor) => anchor.href.startsWith("tel:"))
        .forEach((anchor) => {
            if(anchor.dataset.decorated === "true")
                return;
            anchor.dataset.decorated = "true";
            let text = anchor.textContent!.trim();
            if(text.startsWith("00")) {
                text = text.replaceAll(" ", "");
                let blocks: string[] = [];
                blocks.push(text.substring(0, 4));
                blocks.push(text.substring(4, 7));
                blocks.push(text.substring(7, 9));
                blocks.push(text.substring(9, 11));
                blocks.push(text.substring(11, 13));
                blocks.push(text.substring(13, 15));
                anchor.textContent = blocks.join(" ");
            }
        });
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
    decorateSchooljaar();
    decorateTrimModules(tabInschrijving);
    if (options.showNotAssignedClasses) {
        setStripedLessons();
    }

    if (options.leerlingGotoLes)
        addGotoLesMenus();
}

function addGotoLesMenus() {
    for (let opleiding of scrapeOpleidingen()) {
        for (let lesInfo of opleiding.lessen) {
            if (!lesInfoHasButton(lesInfo))
                continue;
            let btnOnClick = lesInfo.gotoButton.getAttribute("onclick");
            if (!btnOnClick)
                continue;
            //todo: scrape lesId inside scrapeOpleidingen.
            let matchLesId = btnOnClick.match(/id=(\d+)/);
            if (matchLesId) {
                let lesId = matchLesId[1];
                let wrapper = wrapElement(lesInfo.gotoButton, "div");
                lesInfo.gotoButton.removeAttribute("onclick");
                let newBtnGotoLes = lesInfo.gotoButton.cloneNode(true) as HTMLElement;
                lesInfo.gotoButton.replaceWith(newBtnGotoLes);
                newBtnGotoLes.dataset.originalOnClick = btnOnClick;
                newBtnGotoLes.onclick = () => showGotoLesMenu(wrapper, newBtnGotoLes, btnOnClick, lesInfo, opleiding, lesId);
            }
        }
    }
}

async function showGotoLesMenu(wrapper: HTMLElement, button: HTMLElement, btnOnClick: string, lesInfo: LesInfo, opleiding: Opleiding, lesId: string, abortController?: AbortController) {
    try {
        savePage();
        let menu = new DropDownMenu(wrapper, button, false, true, abortController);
        menu.setPosition("left");
        menu.addItem(emmet.createElement(`span.noClipboard{Ga naar les}`), 0, btnOnClick);
        menu.addSeparator(`Bezig met laden...`, 0);
        menu.show();
        let lesDetails = await fetchLes(lesId);
        if (lesDetails.isIndividualLes) {
            menu.clickItem(0);
            return;
        }
        await fillClassesMenu(menu, opleiding, lesInfo.vak, btnOnClick);
    } catch (e) {
        console.error(e);
        await restorePage(true);
    }

}

type LesInfoWitButton = Omit<LesInfo, 'gotoButton'> & { gotoButton: HTMLButtonElement };

function lesInfoHasButton(lesInfo: LesInfo): lesInfo is LesInfoWitButton {
    return lesInfo.gotoButton !== null;
}

async function fillClassesMenu(menu: DropDownMenu, opleiding: Opleiding, vak: string, gotoLesCmd: string) {
    menu.removeAllItems();
    menu.addItem(emmet.createElement(`span.noClipboard{Ga naar les}`), 0, gotoLesCmd);
    menu.addSeparator(`Bezig met laden...`, 0);
    let schoolYear = Schoolyear.findInPage();
    let lessenBuilder = await LessenFilterBuilder.create(schoolYear, opleiding.domein as DomeinString);
    lessenBuilder.addGraad(GradeYear.toString([opleiding.gradeYears[0]]));
    if(opleiding.adminGroup != "")
        lessenBuilder.addAdminGroup(opleiding.adminGroup);
    if(!lessenBuilder.hasVak(vak))
    lessenBuilder.addVak(vak);
    let lessons = await lessenBuilder.fetch();
    lessons.sort((a, b) => buildLesTitle(a.les.naam, a.les.vakNaam).localeCompare(buildLesTitle(b.les.naam, b.les.vakNaam)));
    menu.removeItem(1);
    menu.addSeparator(emmet.createElement(`span.noClipboard{Alternatieven:}`), 0);
    for(let les of lessons) {
        let lesmoment = les.les.formattedLesmoment.replace('(wekelijks)', "").trim();
        let full = les.les.aantal >= les.les.maxAantal;
        let infoBlock = createLesCard(les.les.naam, {
            vakName:les.les.vakNaam,
            full,
            lesmoment,
            aantal: les.les.aantal,
            maxAantal: les.les.maxAantal,
            wachtlijst: les.les.wachtlijst,
            vestiging: les.les.vestiging}
        );
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
