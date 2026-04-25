import {emmet} from "../libs/Emmeter/html";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState, StartPageGotoState} from "./gotoState";
import {options} from "./plugin_options/options";

export function setupMenu() {
    if(!options.showPluginMenu)
        return;
    let mainMenuUl = document.querySelector("#dko3_navbar > ul") as HTMLUListElement;
    let listItems = mainMenuUl.querySelectorAll("li");

    let lastItem = listItems[listItems.length - 1];
    let {last:dropdown} = emmet.insertBefore(lastItem, `li.nav-item.dropdown>a{ Plugin }.nav-link.dropdown-toggle[href="#" role="button" data-toggle="dropdown" aria-expanded="false"]>div.dropdown-menu`);
    let menu1 = emmet.appendChild(dropdown as HTMLElement, `a.dropdown-item.pointer[href=\"#"]{Vergelijk lessen met Excel uurroosters}`).first as HTMLAnchorElement;
    menu1.onclick = () => {
        gotoDiffPage();
    }
    let menu2 = emmet.appendChild(dropdown as HTMLElement, `a.dropdown-item.pointer[href=\"#"]{Lessen snapshots}`).first as HTMLAnchorElement;
    menu2.onclick = () => {
        gotoSnapshotPage();
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
