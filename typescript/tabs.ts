import {emmet} from "../libs/Emmeter/html";

export type BeforeTabSwitch = (tab: HTMLButtonElement, tabId: string) => "cancel" | "continue";

export interface TabDef {
    btnId: string,
    btnContent: HTMLElement | string,
    tabId: string,
}

export class Tabs {
    tabDefs: TabDef[];
    tabs: HTMLDivElement;
    private readonly beforeTabSwitch: BeforeTabSwitch | null;

    constructor(parent: HTMLElement, tabDefs: TabDef[], beforeTabSwitch?: BeforeTabSwitch) {
        this.tabDefs = tabDefs;
        this.beforeTabSwitch = beforeTabSwitch ?? null;
        this.tabs = emmet.appendChild(parent, "div.tabs").first as HTMLDivElement;
        for (let tabDef of tabDefs) {
            let button = emmet.appendChild(this.tabs, `
            button#${tabDef.btnId}.naked.hand.tab.notSelected[data-tab-id="${tabDef.tabId}"]
        `).first as HTMLButtonElement;
            if (typeof(tabDef.btnContent) == "string") {
                button.innerHTML = tabDef.btnContent;
            } else {
                button.appendChild(tabDef.btnContent);
            }
        }
        this.addNavigation();
    }

    switch(to: number | HTMLButtonElement) {
        let btn: HTMLButtonElement;
        if(typeof(to) == "number")
            btn = document.getElementById(this.tabDefs[to].btnId) as HTMLButtonElement;
        else
            btn = to;
        let tabId = btn.dataset.tabId!;
        let tabs = btn.parentElement!;
        tabs.querySelectorAll(".tab")!.forEach((tab: HTMLElement) => {
            tab.classList.add("notSelected");
            document.getElementById(tab.dataset.tabId!)!.style.display = "none";
        });
        btn.classList.remove("notSelected");
        document.getElementById(tabId)!.style.display = "block";
    }

    addNavigation() {
        document.querySelectorAll(".tabs > button.tab")
            .forEach(btn => btn
                .addEventListener("click", (ev) => {
                    let button: HTMLButtonElement = ev.currentTarget as HTMLButtonElement;
                    if(this.beforeTabSwitch?.(button, button.dataset.tabId!) != "cancel")
                        this.switch(ev.currentTarget as HTMLButtonElement);
                }));
    }}
