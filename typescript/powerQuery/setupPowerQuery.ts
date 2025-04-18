import {calculateSchooljaar, clamp, createShortSchoolyearString, isAlphaNumeric, openTab} from "../globals";
import * as def from "../def";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState} from "../gotoState";
import {default_items as defaultQueryItems } from "default_items";
export function setupPowerQuery() {
    //dummy function to force this module to be loaded.
}

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

export function addQueryItem(headerLabel: string, label: string, href: string, func?: GotoFunc, longLabelText?: string){
    powerQueryItems.push(createQueryItem(headerLabel, label, href, func, longLabelText));
}

export function createQueryItem(headerLabel: string, label: string, href: string, func?: GotoFunc, longLabelText?: string){
    let longLabel = longLabelText ?? headerLabel + " > " + label;
    return <QueryItem>{
        headerLabel,
        label,
        href,
        weight: 0,
        longLabel,
        lowerCase: longLabel.toLowerCase(),
        func
    };
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

function getSavedAndDefaultQueryItems(): QueryItem[] {
    let savedPowerQuery = {};
    let allItems = [];
    let savedPowerQueryString = localStorage.getItem(def.POWER_QUERY_ID);
    if(savedPowerQueryString) {
        savedPowerQuery = JSON.parse(savedPowerQueryString);
    }

    //merge saved pages into default pages.
    for(let page in savedPowerQuery) {
        defaultQueryItems[page] = savedPowerQuery[page];
    }

    for(let page in defaultQueryItems) {
        allItems.push(...defaultQueryItems[page]);
    }
    return allItems;
}

function screpeDropDownMenu(headerMenu: Element) {
    let headerLabel = headerMenu.querySelector("a").textContent.trim();

    Array.from(headerMenu.querySelectorAll("div.dropdown-menu > a") as NodeListOf<HTMLAnchorElement>)
        .map((item) => {
            return {
                label:  item.textContent.trim(),
                href: item.href
            };
        })
        .filter((item) => item.label != "" && item.href != "" && item.href != "https://administratie.dko3.cloud/#")
        .forEach(item => addQueryItem(headerLabel, item.label, item.href, undefined));
}

function scrapeMainMenu() {
    powerQueryItems = [];
    let menu = document.getElementById("dko3_navbar");
    let headerMenus = menu.querySelectorAll("#dko3_navbar > ul.navbar-nav > li.nav-item.dropdown");
    for(let headerMenu of headerMenus.values()) {
        screpeDropDownMenu(headerMenu);
    }
}

function gotoWerklijstUrenNextYear(_queryItem: QueryItem) {
    let pageState = getGotoStateOrDefault(PageName.Werklijst);
    pageState.goto = Goto.Werklijst_uren_nextYear;
    saveGotoState(pageState);
    location.href = "/#leerlingen-werklijst";
}

function gotoWerklijstUrenPrevYear(_queryItem: QueryItem) {
    let pageState = getGotoStateOrDefault(PageName.Werklijst);
    pageState.goto = Goto.Werklijst_uren_prevYear;
    saveGotoState(pageState);
    location.href = "/#leerlingen-werklijst";
}

function gotoTrimesterModules(_queryItem: QueryItem) {
    let pageState = getGotoStateOrDefault(PageName.Lessen);
    pageState.goto = Goto.Lessen_trimesters_set_filter;
    saveGotoState(pageState);
    location.href = "/#lessen-overzicht";
}

function getHardCodedQueryItems() {
    addQueryItem("Werklijst", "Lerarenuren " +createShortSchoolyearString(calculateSchooljaar()), "", gotoWerklijstUrenPrevYear);
    addQueryItem("Werklijst", "Lerarenuren " +createShortSchoolyearString(calculateSchooljaar()+1), "", gotoWerklijstUrenNextYear);
    addQueryItem("Lessen", "Trimester modules", "", gotoTrimesterModules);
}

document.body.addEventListener("keydown", showPowerQuery);

function addOpenTabQueryItem() {
    addQueryItem('Test', "Open tab", undefined, () => openTab("Important TYPESCRIPT data for this tab!!!", "Test 123"));
}

function showPowerQuery(ev: KeyboardEvent) {
    if (ev.key === "q" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
        scrapeMainMenu();
        powerQueryItems.push(...getSavedAndDefaultQueryItems());
        getHardCodedQueryItems();
        addOpenTabQueryItem();
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
            let selectedDiv = list.children[selectedItem] as HTMLElement;
            onItemSelected(selectedDiv);
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
    for(let item of list.querySelectorAll("div")) {
        item.onclick = (ev: PointerEvent) => {
            onItemSelected(ev.target as HTMLElement);
            // ev.preventDefault();
        };
    }
    list.children[selectedItem]?.classList.add("selected");
}

function onItemSelected(selectedElement: HTMLElement) {
    let item = powerQueryItems.find((item) => item.longLabel === (selectedElement).dataset.longLabel);
    popover.hidePopover();
    if (item.func) {
        item.func(item);
    } else {
        location.href = item.href;
    }
}

function isSorted(arr: number[]) {
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] > arr[i + 1]) {
            return false;
        }
    }
    return true;
}

export function scrapeMenuPage(longLabelPrefix: string, linkConverter: LinkToQueryConverter) {
    let queryItems: QueryItem[] = [];
    let blocks = document.querySelectorAll("div.card-body");
    for (let block of blocks) {
        let header = block.querySelector('h5');
        if (!header) {
            continue;
        }
        let headerLabel = header.textContent.trim();
        let links = block.querySelectorAll("a");
        for (let link of links) {
            if (!link.href)
                continue;
            let item = linkConverter(headerLabel, link, longLabelPrefix);
            queryItems.push(item);
        }
    }
    return queryItems;
}

type LinkToQueryConverter = (headerLabel: string, link: HTMLAnchorElement, longLabelPrefix: string) => QueryItem;