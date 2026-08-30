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


export class DropDownMenu {
    private readonly menu: HTMLElement;
    private readonly container: HTMLElement;
    private button: HTMLElement;

    constructor(container: HTMLElement, button: HTMLElement) {
        this.container = container;
        this.button = button;
        initMenuEvents();
        this.container.classList.add("dropDownContainer");
        this.button.classList.add("dropDownIgnoreHide", "dropDownButton");
        let {first} = emmet.appendChild(this.container as HTMLElement, "div.dropDownMenu");
        this.menu = first as HTMLElement;
        this.button.onclick = ev => {
            ev.preventDefault();
            ev.stopPropagation();
            let dropDowwnMenu = (ev.target as HTMLElement).closest(".dropDownContainer")!.querySelector(".dropDownMenu")!;
            if (dropDowwnMenu.classList.contains("show")) {
                closeMenus();
                return;
            }
            closeMenus();
            dropDowwnMenu.classList.add("show");
        }
    }

    addItem(title: string, indentLevel: number, onClick: (ev: MouseEvent) => void) {
        let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
        let {first} = emmet.appendChild(this.menu, `button.naked.dropDownItem${indentClass}{${title}}`);
        let item = first as HTMLElement;
        item.onclick = (ev) => {
            closeMenus();
            onClick(ev);
        };
    }

    addSeparator(title: string, indentLevel: number) {
        let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
        let {first} = emmet.appendChild(this.menu, `div.dropDownSeparator.dropDownIgnoreHide${indentClass}{${title}}`);
        let item = first as HTMLElement;
        item.onclick = (ev) => {
            ev.stopPropagation();
        }
    }

}

export function closeMenus() {
    let dropdowns = document.getElementsByClassName("dropDownMenu");
    for (let dropDown of dropdowns) {
        dropDown.classList.remove('show');
    }
}

function onWindowClick(event: MouseEvent) {
    if ((event.target as Element).matches('.dropDownIgnoreHide'))
        return;
    closeMenus();
}

function initMenuEvents() {
    window.onclick = onWindowClick;
}

