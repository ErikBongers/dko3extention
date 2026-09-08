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
    readonly menu: HTMLElement;
    private readonly container: HTMLElement;
    private button: HTMLElement;
    public cancelDropDown: CancelDropDown | undefined;

    constructor(container: HTMLElement, button: HTMLElement, showOnClick: boolean = true) {
        this.container = container;
        this.button = button;
        this.container.classList.add("dropDownContainer");
        this.button.classList.add("dropDownIgnoreHide", "dropDownButton");
        let {first} = emmet.appendChild(this.container as HTMLElement, "div.dropDownMenu.popoverMenu");
        this.menu = first as HTMLElement;
        this.menu.setAttribute("popover", "");
        if (showOnClick) {
            this.button.onclick = async ev => {
                ev.preventDefault();
                ev.stopPropagation();
                if (await this.cancelDropDown?.(ev))
                    return;
                this.show();
            }
        }
    }

    setPosition(position: "left" | "right") {
        if(position === "left")
            this.container.classList.add("shiftMenuLeft");
        else
            this.container.classList.remove("shiftMenuLeft");
    }

    onMenuKeyDown = (ev: KeyboardEvent) => {
        console.log("keydown");
    }

    onMenuKeyUp = (ev: KeyboardEvent) => {
        console.log("keyup");
    }

    show() {
        console.log("show");
        document.querySelectorAll(".activePopoverButton").forEach(p => p.classList.remove("activePopoverButton"));
        this.button.classList.add("activePopoverButton");
        this.menu.addEventListener("keydown", this.onMenuKeyDown);
        this.menu.addEventListener("keyup", this.onMenuKeyUp);
        this.menu.showPopover();
        if (document.activeElement instanceof HTMLElement)
            document.activeElement?.blur();
    }

    hide() {
        this.menu.hidePopover();
    }

    addItem(title: string | HTMLElement, indentLevel: number, onClick: ((ev: MouseEvent) => void) | string) {
        let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
        let item = emmet.appendChild(this.menu, `button.naked.dropDownItem.pre${indentClass}`).first as HTMLButtonElement;
        this.setItemContent(this.menu.children.length - 1, title);
        if(typeof onClick === "string")
            item.setAttribute("onclick", onClick);
        else if(typeof onClick === "function")
        item.onclick = (ev) => {
            onClick(ev);
        };
    }

    setItemContent(index: number, title: string | HTMLElement) {
        let item = this.getItem(index);
        if(typeof title === "string")
            item.innerHTML = title;
        else {
            item.innerHTML = "";
            item.appendChild(title);
        }
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
        let {first} = emmet.appendChild(this.menu, `div.dropDownInfo.dropDownIgnoreHide${indentClass}`);
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
        if(index < 0 || index >= this.menu.children.length)
            return false;
        this.menu.removeChild(this.menu.children[index]);
        return true;
    }

    getItem(index: number) {
        return this.menu.children[index] as HTMLElement;
    }

    removeAllItems() {
        this.menu.innerHTML = "";
    }

    clearItemClass(className: string) {
        let items = this.menu.querySelectorAll(".dropDownItem") as NodeListOf<HTMLButtonElement>;
    }

    setSelected(itemIndex: number) {
        let items = this.menu.querySelectorAll(".dropDownItem") as NodeListOf<HTMLButtonElement>;
        for(let item of items)
            item.classList.remove("selected");
        items[itemIndex].classList.add("selected");
    }
}
