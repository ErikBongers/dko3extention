import {emmet} from "../libs/Emmeter/html";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, StartPageGotoState} from "./gotoState";
import {options} from "./plugin_options/options";
import {Schoolyear} from "./globals";
import {gotoWerklijstUrenNextYear, gotoWerklijstUrenPrevYear} from "./powerQuery/setupPowerQuery";

export function setupMenu() {
    if(!options.showPluginMenu)
        return;
    let mainMenuUl = document.querySelector("#dko3_navbar > ul") as HTMLUListElement;
    let listItems = mainMenuUl.querySelectorAll("li");

    let lastItem = listItems[listItems.length - 1];
    let {last:dropdown} = emmet.insertBefore(lastItem, `li.nav-item.dropdown>a{ Plugin }.nav-link.dropdown-toggle[href="#" role="button" data-toggle="dropdown" aria-expanded="false"]>div.dropdown-menu`);

    let year = Schoolyear.calculateSetupYear();
    let prevSchoolyearShort = Schoolyear.toShortString(year - 1);
    let nextSchoolyearShort = Schoolyear.toShortString(year);
    addMenuItem(dropdown as HTMLElement, `Lerarenuren ${prevSchoolyearShort}`, gotoWerklijstUrenPrevYear);
    addMenuItem(dropdown as HTMLElement, `Lerarenuren ${nextSchoolyearShort}`, gotoWerklijstUrenNextYear);
    addMenuItem(dropdown as HTMLElement, "Vergelijk uurroosters", gotoDiffPage);
    addMenuItem(dropdown as HTMLElement, "Lessen snapshots", gotoSnapshotPage);
}

function addMenuItem(dropdown: HTMLElement, label: string, func: () => any) {
    let menu = emmet.appendChild(dropdown, `a.dropdown-item.pointer[href=\"#"]{${label}}`).first as HTMLAnchorElement;
    menu.onclick = () => {
        func();
    }
}

export function gotoDiffPage() {
    let pageState = getGotoStateOrDefault(PageName.StartPage) as StartPageGotoState;
    pageState.goto = Goto.Start_page;
    pageState.showPage = "diff";
    saveGotoState(pageState);
    if (location.hash == "#start-mijn_tijdslijn")
        location.reload();
    else
        location.href = "/#start-mijn_tijdslijn";
}

export function gotoSnapshotPage() {
    let pageState = getGotoStateOrDefault(PageName.StartPage) as StartPageGotoState;
    pageState.goto = Goto.Start_page;
    pageState.showPage = "snapshots";
    saveGotoState(pageState);
    if (location.hash == "#start-mijn_tijdslijn")
        location.reload();
    else
        location.href = "/#start-mijn_tijdslijn";
}
