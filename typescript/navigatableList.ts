import {emmet} from "../libs/Emmeter/html";
import {ClampedValue} from "./clampedValue";

export class NavigatableList {
    readonly list: HTMLElement;
    private index: ClampedValue;

    constructor(list: HTMLElement) {
        this.list = list;
        this.list.setAttribute("popover", "");
        this.list.addEventListener("keydown", this.onMenuKeyDown);
        //keep this statement last as it triggers setSelected().
        this.index = new ClampedValue(NaN, NaN, NaN, (index) => this.setSelected(index));
    }

    onMenuKeyDown = (ev: KeyboardEvent) => {
        console.log("keydown");
        if(ev.key == "ArrowDown")
            this.index.value++;
        else if(ev.key == "ArrowUp")
            this.index.value--;
        else if(ev.key == "Tab") {
            //try to keep focus inside menu
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            ev.preventDefault();
        } else if(ev.key == "Enter") {
            this.getItem(this.index.value).click();
            this.list.remove();
            setTimeout(() => {
                if(document.activeElement instanceof HTMLElement)
                    document.activeElement?.blur();
            });
        }

    }

    addItem(title: string | HTMLElement, indentLevel: number, onClick: ((ev: MouseEvent) => void) | string) {
        let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
        let item = emmet.appendChild(this.list, `button.naked.hideFocus.dropDownItem.pre${indentClass}`).first as HTMLButtonElement;
        this.setItemContent(this.list.children.length - 1, title);
        if(typeof onClick === "string")
            item.setAttribute("onclick", onClick);
        else if(typeof onClick === "function")
        item.onclick = (ev) => {
            onClick(ev);
        };
        this.index.setRange(0, this.list.children.length - 1);
        return this.list.children.length - 1;
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
        let {first} = emmet.appendChild(this.list, `div.dropDownSeparator.dropDownIgnoreHide${indentClass}{${title}}`);
        let item = first as HTMLElement;
        item.onclick = (ev) => {
            ev.stopPropagation();
        }
    }

    addInfo(element: HTMLElement, indentLevel: number) {
        let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
        let {first} = emmet.appendChild(this.list, `div.dropDownInfo.dropDownIgnoreHide${indentClass}`);
        let item = first as HTMLElement;
        item.onclick = (ev) => {
            ev.stopPropagation();
        }
        item.appendChild(element);
    }

    clickItem(itemIndex: number) {
        (this.list.children[itemIndex] as HTMLElement).click();
    }

    removeItem(index: number) {
        if(index < 0 || index >= this.list.children.length)
            return false;
        this.list.removeChild(this.list.children[index]);
        this.index.setRange(0, this.list.children.length - 1);
        return true;
    }

    getItem(index: number) {
        return this.list.children[index] as HTMLElement;
    }

    removeAllItems() {
        this.list.innerHTML = "";
        this.index.setRange(NaN, NaN);
    }

    setSelected(itemIndex: number) {
        console.log("setSelected", itemIndex);
        for(let item of this.list.children)
            item.classList.remove("selected");
        if(!isNaN(itemIndex))
            this.list.children[itemIndex].classList.add("selected");
    }
}


