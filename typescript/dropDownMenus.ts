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

export type CancelDropDown = (ev: MouseEvent) => boolean | Promise<boolean>;

export class DropDownMenu {
    private readonly menu: HTMLElement;
    private readonly container: HTMLElement;
    private button: HTMLElement;
    public cancelDropDown: CancelDropDown | undefined;

    constructor(container: HTMLElement, button: HTMLElement, position: "left" | "right" = "right") {
        this.container = container;
        this.button = button;
        initMenuEvents();
        this.container.classList.add("dropDownContainer");
        this.button.classList.add("dropDownIgnoreHide", "dropDownButton");
        let {first} = emmet.appendChild(this.container as HTMLElement, "div.dropDownMenu");
        this.menu = first as HTMLElement;
        if(position === "left")
            this.container.classList.add("shiftMenuLeft");
        this.button.onclick = async ev => {
            ev.preventDefault();
            ev.stopPropagation();
            if (await this.cancelDropDown?.(ev))
                return;
            let dropDownMenu = (ev.target as HTMLElement).closest(".dropDownContainer")!.querySelector(".dropDownMenu")!;
            if (dropDownMenu.classList.contains("show")) {
                closeMenus();
                return;
            }
            closeMenus();
            dropDownMenu.classList.add("show");
        }
    }

    addItem(title: string, indentLevel: number, onClick: ((ev: MouseEvent) => void) | string) {
        let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
        let {first} = emmet.appendChild(this.menu, `button.naked.dropDownItem${indentClass}{${title}}`);
        let item = first as HTMLButtonElement;
        if(typeof onClick === "string")
            item.setAttribute("onclick", onClick);
        else if(typeof onClick === "function")
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

    addInfo(element: HTMLElement, indentLevel: number) {
        let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
        let {first} = emmet.appendChild(this.menu, `div.dropDownSeparator.dropDownIgnoreHide${indentClass}`);
        let item = first as HTMLElement;
        item.onclick = (ev) => {
            ev.stopPropagation();
        }
        item.appendChild(element);
    }

    clickItem(itemIndex: number) {
        let items = this.menu.querySelectorAll(".dropDownItem") as NodeListOf<HTMLButtonElement>;
        items[itemIndex].click();
    }

    removeItem(index: number) {
        this.menu.removeChild(this.menu.children[index]);
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

