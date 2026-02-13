import {db3, getOptions, Schoolyear} from "../globals";
import {HashObserver} from "../pageObserver";
import {options} from "../plugin_options/options";

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
        onAttestenChanged(tabInschrijving);
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
            anchor.className = "nav-link";
            tabBefore.insertAdjacentElement("afterend", li);
        }
    }
}

function onAttestenChanged(_tabInschrijving: HTMLElement) {
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
    let view = document.getElementById("view_contents");
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

function onInschrijvingChanged(tabInschrijving: HTMLElement) {
    db3("inschrijving (tab) changed.");

    decorateSchooljaar();

    //Show trimester instruments.
    let moduleButtons = tabInschrijving.querySelectorAll("tr td.right_center > button");
    for(let btn of moduleButtons) {
        let onClick = btn.getAttribute("onclick");
        let tr = btn.parentNode.parentNode;
        onClick = onClick.substring(10, onClick.length- 1);
        let args = onClick
            .split(", ")
            .map((arg) => arg.replaceAll("'", ""));
        // @ts-ignore
        getModules(...args) // making assumptions about the arguments here.
            .then((modNames) => {
                let instrumentText = "";
                if(modNames.length) {
                    (tr.children[0] as HTMLTableCellElement).innerText += ": ";
                    let rxBasic = /Initiatie +(.*) *- *trimester.*/i;
                    let rxWide = /Initiatie +(.*) *- *trimester.* *- *(.*)/i;
                    let rxDesperate = /Initiatie +(.*)/i;
                    instrumentText += modNames
                        .map(modName => {
                            let matches = modName.match(rxWide);
                            if (matches?.length >= 2) {
                                return matches[1].trim() + " - " + matches[2].trim();
                            }
                            matches = modName.match(rxBasic);
                            if (matches?.length >= 1) {
                                return matches[1].trim();
                            }
                            matches = modName.match(rxDesperate);
                            if (matches?.length >= 1) {
                                return matches[1].trim();
                            }
                            return ": ???";
                        })
                        .join(", ");
                }
                let span = document.createElement("span");
                tr.children[0].appendChild(span);
                if(modNames.length > 1) {
                    span.classList.add("badge-warning");
                }
                span.innerText = instrumentText;
            });
    }

    if(options.showNotAssignedClasses) {
        setStripedLessons();
    }

}

function setStripedLessons() {
    let classRows = document.querySelectorAll("#leerling_inschrijvingen_weergave tr");
    let classCells = Array.from(classRows)
        .filter(row => row.querySelector(".table-info") !== null)
        .map(row => row.children.item(row.children.length - 2));

    for (let td of classCells) {
        let classDate = td.querySelector("span.text-muted");
        if (!classDate)
            continue;
        if (classDate.textContent === "(geen lesmomenten)")
            continue;
        for (let tdd of td.parentElement.children) {
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
        .map(check => check.parentNode.parentNode.parentNode.querySelector("strong").textContent);
}

