import { clamp, isAlphaNumeric } from "./globals.js";
let powerQueryItems;
let popoverVisible = false;
let selectedItem = 0;
export function setupPowerQuery() {
    function scrapeMainMenu() {
        let menu = document.getElementById("dko3_navbar");
        powerQueryItems = Array.from(menu.querySelectorAll("a"))
            .map((item) => {
            return {
                label: item.textContent.trim(),
                href: item.href
            };
        })
            .filter((item) => item.label != "" && item.href != "" && item.href != "https://administratie.dko3.cloud/#");
        console.log(powerQueryItems);
    }
    document.body.addEventListener("keydown", (ev) => {
        if (ev.key === "q" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
            scrapeMainMenu();
            popover.showPopover();
            filterItems(searchField.textContent);
        }
        else {
            if (popoverVisible === false)
                return;
            if (isAlphaNumeric(ev.key)) {
                searchField.textContent += ev.key;
            }
            else if (ev.key == "Backspace") {
                searchField.textContent = searchField.textContent.slice(0, -1);
            }
            else if (ev.key == "ArrowDown") {
                selectedItem++;
                ev.preventDefault();
            }
            else if (ev.key == "ArrowUp") {
                selectedItem--;
                ev.preventDefault();
            }
            else if (ev.key == "Enter") {
                let item = powerQueryItems.find((item) => item.label === list.children[selectedItem].textContent);
                popover.hidePopover();
                location.href = item.href;
                console.log(`selected: `);
                console.log(item);
                ev.preventDefault();
            }
            filterItems(searchField.textContent);
        }
    });
    let popover = document.createElement("div");
    document.querySelector("main").appendChild(popover);
    popover.setAttribute("popover", "auto");
    popover.id = "powerQuery";
    popover.addEventListener("toggle", (ev) => {
        // @ts-ignore
        popoverVisible = ev.newState === "open";
    });
    let searchField = document.createElement("label");
    popover.appendChild(searchField);
    let list = document.createElement("div");
    popover.appendChild(list);
    function filterItems(needle) {
        powerQueryItems.forEach((item) => {
            item.weight = 0;
            item.lowerCase = item.label.toLowerCase();
        });
        powerQueryItems
            .filter((item) => item.lowerCase.includes(needle))
            .forEach((item) => item.weight += 100);
        list.innerHTML = powerQueryItems
            .filter((item) => item.weight != 0)
            .map((item) => `<div>${item.label}</div>`)
            .join("\n");
        selectedItem = clamp(selectedItem, 0, list.children.length - 1);
        list.children[selectedItem].classList.add("selected");
    }
}
//# sourceMappingURL=setupPowerQuery.js.map