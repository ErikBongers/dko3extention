import {emmet} from "../libs/Emmeter/html";

export function switchTab(btn: HTMLButtonElement) {
    let tabId = btn.dataset.tabId!;
    let tabs = btn.parentElement!;
    tabs.querySelectorAll(".tab")!.forEach((tab: HTMLElement) => {
        tab.classList.add("notSelected");
        document.getElementById(tab.dataset.tabId!)!.style.display = "none";
    });
    btn.classList.remove("notSelected");
    document.getElementById(tabId)!.style.display = "block";
}

export type BeforeTabSwitch = (tab: HTMLButtonElement, tabId: string) => "cancel" | "continue";

export interface TabDef {
    btnId: string,
    btnContent: HTMLElement | string,
    tabId: string,
}

export class Tabs {
    tabDefs: TabDef[];
    constructor(tabDefs: TabDef[]) {
        this.tabDefs = tabDefs;
    }
    switchTab(index: number) {
        let btn = document.getElementById(this.tabDefs[index].btnId) as HTMLButtonElement;
        switchTab(btn);
    }
}

export function createTabs(parent: HTMLElement, tabDefs: TabDef[], beforeTabSwitch?: BeforeTabSwitch) {
    let divTabs = emmet.appendChild(parent, "div.tabs").first as HTMLDivElement;
    for (let tabDef of tabDefs) {
        let button = emmet.appendChild(divTabs, `
            button#${tabDef.btnId}.naked.hand.tab.notSelected[data-tab-id="${tabDef.tabId}"]
        `).first as HTMLButtonElement;
        if (typeof(tabDef.btnContent) == "string") {
            button.innerHTML = tabDef.btnContent;
        } else {
            button.appendChild(tabDef.btnContent);
        }
    }
    addNavigation(divTabs, beforeTabSwitch);
    return new Tabs(tabDefs);
}

export function setupTabNavigation(beforeTabSwitch?: BeforeTabSwitch) {
    let tabs = document.querySelector(".tabs") as HTMLDivElement;
    addNavigation(tabs, beforeTabSwitch);
    switchTab(tabs.querySelector(".tab")!);
}

function addNavigation(tabDiv: HTMLDivElement, beforeTabSwitch?: BeforeTabSwitch) {
    document.querySelectorAll(".tabs > button.tab")
        .forEach(btn => btn
            .addEventListener("click", (ev) => {
                let button: HTMLButtonElement = ev.currentTarget as HTMLButtonElement;
                if(beforeTabSwitch?.(button, button.dataset.tabId!) != "cancel")
                    switchTab(ev.currentTarget as HTMLButtonElement);
            }));
}