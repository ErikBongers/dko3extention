import {clamp, isAlphaNumeric, Schoolyear} from "../globals";
import * as def from "../def";
import {getGotoStateOrDefault, Goto, PageName, saveGotoState} from "../gotoState";
import {default_items as defaultQueryItems } from "default_items";
import {gotoDiffPage, gotoSnapshotPage} from "../menu";
import {NavigatableList} from "../navigatableList";
import { emmet } from "../../libs/Emmeter/html";

export function setupPowerQuery() {
    //dummy function to force this module to be loaded.
}

let powerQueryItems: QueryItem[] = [];

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

    //merge saved pages and default pages.
    let mergedPages = {...defaultQueryItems};
    for(let page in savedPowerQuery) {
        // @ts-ignore
        mergedPages[page] = savedPowerQuery[page];
    }

    for(let page in mergedPages) {
        allItems.push(...mergedPages[page]);
    }
    return allItems;
}

function screpeDropDownMenu(headerMenu: Element) {
    let headerLabel = headerMenu.querySelector("a")!.textContent.trim();

    Array.from(headerMenu.querySelectorAll("div.dropdown-menu > a") as NodeListOf<HTMLAnchorElement>)
        .map((item) => {
            return {
                label:  item.textContent.trim(),
                href: item.href
            };
        })
        .filter((item) => item.label != "" && item.href != "" && item.href != def.DKO3_FULL_BASE_URL+"#")
        .forEach(item => addQueryItem(headerLabel, item.label, item.href, undefined));
}

function scrapeMainMenu() {
    powerQueryItems = [];
    let menu = document.getElementById("dko3_navbar")!;
    let headerMenus = menu.querySelectorAll("#dko3_navbar > ul.navbar-nav > li.nav-item.dropdown");
    for(let headerMenu of headerMenus.values()) {
        screpeDropDownMenu(headerMenu);
    }
}

export function gotoWerklijstUrenNextYear() {
    let pageState = getGotoStateOrDefault(PageName.Werklijst);
    pageState.goto = Goto.Werklijst_uren_nextYear;
    saveGotoState(pageState);
    location.href = "/#leerlingen-werklijst";
}

export function gotoWerklijstUrenPrevYear() {
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
    addQueryItem("Werklijst", "Lerarenuren " + Schoolyear.toShortString(Schoolyear.calculateSetupYear()-1), "", gotoWerklijstUrenPrevYear);
    addQueryItem("Werklijst", "Lerarenuren " +Schoolyear.toShortString(Schoolyear.calculateSetupYear()), "", gotoWerklijstUrenNextYear);
    addQueryItem("Lessen", "Trimester modules", "", gotoTrimesterModules);
    addQueryItem("Plugin", "Vergelijk uurroosters", "", gotoDiffPage);
    addQueryItem("Plugin", "Lessen snapshots", "", gotoSnapshotPage);
}

let powerQueryVisible = false;

document.body.addEventListener("keydown", showPowerQuery);

function showPowerQuery(ev: KeyboardEvent) {
    if (ev.key === "q" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
        if(powerQueryVisible) {
            ev.preventDefault();
            popover.hidePopover();
            (document.querySelector("#snel_zoeken_veld_zoektermen") as HTMLElement).focus();
            return;
        }
        scrapeMainMenu();
        powerQueryItems.push(...getSavedAndDefaultQueryItems());
        getHardCodedQueryItems();
        popover.showPopover();
        list.focus();
        filterItems(searchField.textContent);
    }
}

function menuKeyDownHandler(ev: KeyboardEvent) {
    if (!powerQueryVisible) //todo: maybe not even needed as it already depends on focus?
        return;
    if (ev.ctrlKey || ev.altKey)
        return;
    if (isAlphaNumeric(ev.key) || ev.key === ' ') {
        searchField.textContent += ev.key;
        filterItems(searchField.textContent);
        list.setSelected(0);
    } else if (ev.key == "Escape") {
        if(searchField.textContent !== "") {
            searchField.textContent = "";
            list.setSelected(0);
            ev.preventDefault();
        }
        //else: default behaviour: close popup.
    } else if (ev.key == "Backspace") {
        searchField.textContent = searchField.textContent.slice(0, -1);
        filterItems(searchField.textContent);
        list.setSelected(0);
    }
}

let popover = document.createElement("div");
document.querySelector("main")!.appendChild(popover);
popover.setAttribute("popover", "auto");
popover.id = "powerQuery";
popover.addEventListener("toggle", (ev) => {
    // @ts-ignore
    powerQueryVisible = ev.newState === "open";
});

let searchField = document.createElement("label");
popover.appendChild(searchField);
let listDiv = document.createElement("div");
popover.appendChild(listDiv);
listDiv.classList.add("list");
let list = new NavigatableList(listDiv);
list.addKeyDownListener(menuKeyDownHandler);

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
    let itemsToShow = powerQueryItems
        .filter((item) => item.weight != 0)
        .sort((a, b) => b.weight - a.weight)
        .slice(0, MAX_VISIBLE_QUERY_ITEMS);
    list.removeAllItems();
    for (const item of itemsToShow) {
        let itemDiv = emmet.indent.createElement(`
            div[data-long-label="${item.longLabel}"]{${item.longLabel}}
        `);
        list.addItem(itemDiv, 0, () => {
            onItemSelected(item);
        });
    }
}

function onItemSelected(item: QueryItem) {
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