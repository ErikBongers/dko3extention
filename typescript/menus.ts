import {emmet} from "../libs/Emmeter/html";

/*
##  Construct menus as follows:
    div : container for menu
        >button : button to open/close menu
     >>> dropdown menu will be added below this button.

## Setup after call to setupMenu():
    div.dropDownContainer
        >button.dropDownButton.dropDownIgnoreHide
        >div.dropDownMenu
            button.dropDownItem
            div.dropDownItem
            ...
 */

export function addMenuItem(menu: HTMLElement, title: string, indentLevel: number, onClick: (ev: MouseEvent) => void) {
    let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
    let {first} = emmet.appendChild(menu, `button.naked.dropDownItem.dropDownIgnoreHide${indentClass}{${title}}`); //todo: do we need .ignoreHide here?
    let item = first as HTMLElement;
    item.onclick = (ev) => {
        closeMenus();
        onClick(ev);
    };
}

export function closeMenus() {
    let dropdowns = document.getElementsByClassName("dropDownMenu");
    for (let dropDown of dropdowns) {
        dropDown.classList.remove('show');
    }
}

function onWindowClick(event) {
    console.log("window clicked!!!");
    if (event.target.matches('.dropDownIgnoreHide'))
        return;
    closeMenus();
}

function initMenuEvents() {
    window.onclick = onWindowClick;
}

export function addMenuSeparator(menu: HTMLElement, title: string, indentLevel: number) {
    let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
    let {first} = emmet.appendChild(menu, `div.dropDownSeparator.dropDownIgnoreHide${indentClass}{${title}}`);
    let item = first as HTMLElement;
    item.onclick = (ev) => {
        ev.stopPropagation();
    }
}

export function setupMenu(container: HTMLElement, button: HTMLElement) {
    initMenuEvents();
    container.classList.add("dropDownContainer");
    button.classList.add("dropDownIgnoreHide", "dropDownButton");
    let {first} = emmet.appendChild(container as HTMLElement, "div.dropDownMenu");
    let menu = first as HTMLElement;

    button.onclick = ev => {
        ev.preventDefault();
        ev.stopPropagation();
        let dropDowwnMenu = (ev.target as HTMLElement).closest(".dropDownContainer").querySelector(".dropDownMenu");
        if (dropDowwnMenu.classList.contains("show")) {
            closeMenus();
            return;
        }
        closeMenus();
        dropDowwnMenu.classList.add("show");
    }
    return menu;
}