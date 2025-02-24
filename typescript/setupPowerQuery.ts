import {clamp, isAlphaNumeric} from "./globals";
import * as def from "./def";
import {getPageStateOrDefault, Goto, PageName, savePageState} from "./pageState";

let powerQueryItems: QueryItem[] = [];
let popoverVisible = false;
let selectedItem = 0;
type GotoFunc = (queryItem: QueryItem) => void;

export interface QueryItem {
    headerLabel: string;
    label: string;
    href: string;
    weight: number;
    longLabel: string;
    lowerCase: string;
    func?: GotoFunc;
}

export function saveQueryItems(page: string, queryItems: QueryItem[]) {
    let savedPowerQueryString = localStorage.getItem(def.POWER_QUERY_ID);
    if(!savedPowerQueryString) {
        savedPowerQueryString = "{}";
    }
    let savedPowerQuery = JSON.parse(savedPowerQueryString);
    savedPowerQuery[page] = queryItems;
    localStorage.setItem(def.POWER_QUERY_ID, JSON.stringify(savedPowerQuery));
}

function getSavedQueryItems(): QueryItem[] {
    let savedPowerQueryString = localStorage.getItem(def.POWER_QUERY_ID);
    if(!savedPowerQueryString) {
        return [];
    }
    let allItems = [];
    let savedPowerQuery = JSON.parse(savedPowerQueryString);
    for(let page in savedPowerQuery) {
        allItems.push(...savedPowerQuery[page]);
    }
    return allItems;
}

function screpeDropDownMenu(headerMenu: Element) {
    let headerLabel = headerMenu.querySelector("a").textContent.trim();

    let newItems = Array.from(headerMenu.querySelectorAll("div.dropdown-menu > a") as NodeListOf<HTMLAnchorElement>)
        .map((item) => {
            let queryItem: QueryItem = {
                func: undefined,
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
    for(let headerMenu of headerMenus.values()) {
        screpeDropDownMenu(headerMenu);
    }
}

export function setupPowerQuery() {
    //don' do nottin' - just initialize this module, below.
}

function gotoWerklijstUren(_queryItem: QueryItem) {
    let pageState = getPageStateOrDefault(PageName.Werklijst);
    pageState.goto = Goto.Werklijst_uren;
    savePageState(pageState);
    location.href = "/#leerlingen-werklijst";
}

function getHardCodedQueryItems() {
    let items: QueryItem[] = [];
    let item: QueryItem = {
        headerLabel: "Werklijst", href: "", label: "Uren per vak per leraar", longLabel: "", lowerCase: "", weight: 0
    }
    item.longLabel = item.headerLabel + " > " + item.label;
    item.lowerCase = item.longLabel.toLowerCase();
    item.func = gotoWerklijstUren;
    items.push(item);
    return items;
}

document.body.addEventListener("keydown", showPowerQuery);

function showPowerQuery(ev: KeyboardEvent) {
    if (ev.key === "q" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
        scrapeMainMenu();
        powerQueryItems.push(...getSavedQueryItems());
        powerQueryItems.push(...getHardCodedQueryItems());
        popover.showPopover();
    } else {
        if (popoverVisible === false)
            return;
        if (isAlphaNumeric(ev.key) || ev.key === ' ') {
            searchField.textContent += ev.key;
            selectedItem = 0; //back to top.
        } else if (ev.key == "Escape") {
            if(searchField.textContent !== "") {
                searchField.textContent = "";
                selectedItem = 0;
                ev.preventDefault();
            }
            //else: default behaviour: close popup.
        } else if (ev.key == "Backspace") {
            searchField.textContent = searchField.textContent.slice(0, -1);
        } else if (ev.key == "ArrowDown") {
            selectedItem++;
            ev.preventDefault();
        } else if (ev.key == "ArrowUp") {
            selectedItem--;
            ev.preventDefault();
        } else if (ev.key == "Enter") {
            let item = powerQueryItems.find((item) => item.longLabel === (list.children[selectedItem] as HTMLElement).dataset.longLabel);
            popover.hidePopover();
            if (item.func) {
                item.func(item);
            } else {
                location.href = item.href;
            }
            ev.preventDefault();
        }
    }
    filterItems(searchField.textContent);
}

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
list.classList.add("list");

function filterItems(needle: string) {
    for (const item of powerQueryItems) {
        item.weight = 0;
        //exact match
        if (item.lowerCase.includes(needle))
            item.weight += 1000;

        //exact match of each word in needle.
        let needleWordsWithSeparator = needle.split(/(?= )/g);
        if (needleWordsWithSeparator.every(word => item.lowerCase.includes(word)))
            item.weight += 500;

        //all chars match  in order
        let indices = needle.split('')
            .map(char => item.lowerCase.indexOf(char));
        if(indices.every(num => num !== -1) && isSorted(indices))
            item.weight += 50;

        //all chars match
        if (needle.split('')
            .every(char => item.lowerCase.includes(char)))
            item.weight += 20;
    }

    const MAX_VISIBLE_QUERY_ITEMS = 30;
    list.innerHTML = powerQueryItems
        .filter((item) => item.weight != 0)
        .sort((a, b) => b.weight - a.weight)
        .map((item) => `<div data-long-label="${item.longLabel}">${item.longLabel}</div>`)
        .slice(0, MAX_VISIBLE_QUERY_ITEMS)
        .join("\n");
    selectedItem = clamp(selectedItem, 0, list.children.length - 1);
    list.children[selectedItem]?.classList.add("selected");
}

function isSorted(arr: number[]) {
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] > arr[i + 1]) {
            return false;
        }
    }
    return true;
}