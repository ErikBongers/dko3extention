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

export function setupTabNavigation(beforeTabSwitch?: BeforeTabSwitch) {
    let tabs = document.querySelector(".tabs")!;
    switchTab(tabs.querySelector(".tab")!);
    document.querySelectorAll(".tabs > button.tab")
        .forEach(btn => btn
            .addEventListener("click", (ev) => {
                let button: HTMLButtonElement = ev.currentTarget as HTMLButtonElement;
                if(beforeTabSwitch?.(button, button.dataset.tabId!) != "cancel")
                    switchTab(ev.currentTarget as HTMLButtonElement);
            }));
}