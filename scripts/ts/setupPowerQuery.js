import { clamp, isAlphaNumeric } from "./globals.js";
let powerQueryItems = [];
let popoverVisible = false;
let selectedItem = 0;
function screpeDropDownMenu(headerMenu) {
    let headerLabel = headerMenu.querySelector("a").textContent.trim();
    let newItems = Array.from(headerMenu.querySelectorAll("div.dropdown-menu > a"))
        .map((item) => {
        let queryItem = {
            headerLabel,
            label: item.textContent.trim(),
            href: item.href,
            weight: 0,
            longLabel: "",
            lowerCase: ""
        };
        queryItem.longLabel = queryItem.headerLabel + " > " + queryItem.label;
        queryItem.lowerCase = queryItem.longLabel.toLowerCase();
        return queryItem;
    })
        .filter((item) => item.label != "" && item.href != "" && item.href != "https://administratie.dko3.cloud/#");
    powerQueryItems.push(...newItems);
}
function scrapeMainMenu() {
    powerQueryItems = [];
    let menu = document.getElementById("dko3_navbar");
    let headerMenus = menu.querySelectorAll("#dko3_navbar > ul.navbar-nav > li.nav-item.dropdown");
    for (let headerMenu of headerMenus.values()) {
        screpeDropDownMenu(headerMenu);
    }
    console.log(powerQueryItems);
}
export function setupPowerQuery() {
    document.body.addEventListener("keydown", (ev) => {
        if (ev.key === "q" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
            scrapeMainMenu();
            popover.showPopover();
            filterItems(searchField.textContent);
        }
        else {
            if (popoverVisible === false)
                return;
            if (isAlphaNumeric(ev.key) || ev.key === ' ') {
                searchField.textContent += ev.key;
                selectedItem = 0; //back to top.
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
                let item = powerQueryItems.find((item) => item.longLabel === list.children[selectedItem].dataset.longLabel);
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
        });
        //exact match
        powerQueryItems
            .filter(item => item.lowerCase.includes(needle))
            .forEach(item => item.weight += 1000);
        //exact match of each word in needle.
        powerQueryItems
            .filter(item => {
            let needleWordsWithSeparator = needle.split(/(?= )/g);
            return needleWordsWithSeparator.every(word => item.lowerCase.includes(word));
        })
            .forEach(item => item.weight += 500);
        //all chars match  in order
        powerQueryItems
            .filter(item => {
            let indices = needle.split('')
                .map(char => item.lowerCase.indexOf(char));
            if (indices.find(num => num === -1))
                return false;
            return checkSorted(indices);
        })
            .forEach(item => item.weight += 50);
        //all chars match
        powerQueryItems
            .filter(item => {
            return needle.split('')
                .every(char => item.lowerCase.includes(char));
        })
            .forEach(item => item.weight += 20);
        list.innerHTML = powerQueryItems
            .filter((item) => item.weight != 0)
            .sort((a, b) => b.weight - a.weight)
            .map((item) => `<div data-long-label="${item.longLabel}">${item.weight}: ${item.longLabel}</div>`)
            .join("\n");
        selectedItem = clamp(selectedItem, 0, list.children.length - 1);
        list.children[selectedItem]?.classList.add("selected");
    }
}
function checkSorted(arr) {
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] > arr[i + 1]) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=setupPowerQuery.js.map