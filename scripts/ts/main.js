//to avoid "unused function" errors in linters, this file is called as a module.
import { observers, options, registerObserver } from "./globals.js";
import leerlingObserver from "./leerling/observer.js";
import lessenObserver from "./lessen/observer.js";
import academieObserver from "./academie/observer.js";
import werklijstObserver from "./werklijst/observer.js";
import tableObserver from "./table/observer.js";
// noinspection JSUnusedGlobalSymbols
export function init() {
    getOptions(() => {
        // @ts-ignore
        chrome.storage.onChanged.addListener((_changes, area) => {
            if (area === 'sync') {
                getOptions();
            }
        });
        // @ts-ignore
        window.navigation.addEventListener("navigatesuccess", () => {
            onPageChanged();
        });
        window.addEventListener("load", () => {
            onPageChanged();
        });
        registerObserver(leerlingObserver);
        registerObserver(lessenObserver);
        registerObserver(academieObserver);
        registerObserver(werklijstObserver);
        registerObserver(tableObserver);
        onPageChanged();
        setupPowerQuery();
    });
}
export function onPageChanged() {
    for (let observer of observers) {
        observer.onPageChanged();
    }
}
function getOptions(callback) {
    // @ts-ignore
    chrome.storage.sync.get(null, //get all
    (items) => {
        // @ts-ignore
        Object.assign(options, items);
        callback();
    });
}
let powerQueryItems = [];
let popoverVisible = false;
let selectedItem = 0;
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function setupPowerQuery() {
    document.body.addEventListener("keydown", (ev) => {
        if (ev.key === "q" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
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
            .map((item, index) => `<div>${item.label}</div>`)
            .join("\n");
        selectedItem = clamp(selectedItem, 0, list.children.length - 1);
        list.children[selectedItem].classList.add("selected");
    }
}
function isAlphaNumeric(str) {
    if (str.length > 1)
        return false;
    let code;
    let i;
    let len;
    for (i = 0, len = str.length; i < len; i++) {
        code = str.charCodeAt(i);
        if (!(code > 47 && code < 58) && // numeric (0-9)
            !(code > 64 && code < 91) && // upper alpha (A-Z)
            !(code > 96 && code < 123)) { // lower alpha (a-z)
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=main.js.map