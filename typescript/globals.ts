import {Observer} from "./pageObserver";
import * as def from "./def";
import {emmet} from "../libs/Emmeter/html";
import {PageName} from "./gotoState";
import {PageSettings} from "./lessen/build";
import {fetchGlobalSettings, getGlobalSettings, GlobalSettings, options, setGlobalSetting} from "./plugin_options/options";

export let observers = [];
export let settingsObservers: (() => void)[] = [];

export function db3(message: any) {
    if (options?.showDebug) {
        console.log(message);
        console.log(Error().stack.split("\n")[2]);
    }
}

export function createValidId(id: string) {
    return id
        .replaceAll(" ", "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\W/g,'');
}


export function registerObserver(observer: Observer) {
    observers.push(observer);
    if(observers.length > 20) //just in case...
        console.error("Too many observers!");
}

export function registerSettingsObserver(observer: () => void) {
    settingsObservers.push(observer);
    if(settingsObservers.length > 20) //just in case...
        console.error("Too many settingsObservers!");
}

// noinspection JSUnusedGlobalSymbols
export function searchText(text: string) {
    let input: HTMLInputElement = document.querySelector("#snel_zoeken_veld_zoektermen");
    input.value = text;
    let evUp = new KeyboardEvent("keyup", {key: "Enter", keyCode: 13, bubbles: true}); //doesn't seem to be working other than with this deprecated property.
    input.dispatchEvent(evUp);
}

export function setButtonHighlighted(buttonId: string, show: boolean) {
    if (show) {
        document.getElementById(buttonId).classList.add("toggled");
    } else {
        document.getElementById(buttonId).classList.remove("toggled");
    }
}

export function addButton(targetElement: HTMLElement, buttonId: string, title: string, clickFunction: (ev:PointerEvent) => void, imageId: string, classList: string[], text = "", where: InsertPosition = "beforebegin") {
    let button = document.getElementById(buttonId);
    if (button === null) {
        const button = document.createElement("button");
        button.classList.add("btn"/*, "btn-sm", "btn-outline-secondary", "w-100"*/, ...classList);
        button.id = buttonId;
        button.style.marginTop = "0";
        button.onclick = clickFunction;
        button.title = title;
        if(text) {
            let span = document.createElement("span");
            button.appendChild(span);
            span.innerText = text;
        }
        const buttonContent = document.createElement("i");
        button.appendChild(buttonContent);
        if(imageId)
            buttonContent.classList.add("fas", imageId);
        targetElement.insertAdjacentElement(where, button);
    }
}

export function getSchooljaarSelectElement() {
    let selects = document.querySelectorAll("select");
    return Array.from(selects)
        .filter((element) => element.id.includes("schooljaar"))
        .pop();
}

export function getHighestSchooljaarAvailable() {
    let el = getSchooljaarSelectElement();
    if(!el)
        return undefined;
    return Array.from(el.querySelectorAll("option"))
        .map(option => option.value)
        .sort()
        .pop();
}

//Tries to return "202x-202y".
export function findSchooljaar() {
    let el = getSchooljaarSelectElement();
    if(el)
        return el.value;
    el = document.querySelector("div.alert-primary");
    return el.textContent.match(/schooljaar *= (\d{4}-\d{4})*/)[1];
}

export function calculateSchooljaar() {
    let now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    if(month < 8) //zero-based juli !
        return year-1; //schoolyear started last year.
    return year;
}

export function createSchoolyearString(startYear: number) {
    return `${startYear}-${startYear+1}`;
}

export function createShortSchoolyearString(startYear: number) {
    return `${startYear%1000}-${(startYear%1000)+1}`;
}

export function getUserAndSchoolName() {
    let footer = document.querySelector("body > main > div.row > div.col-auto.mr-auto > small");
    const reInstrument = /.*Je bent aangemeld als (.*)\s@\s(.*)\./;
    const match = footer.textContent.match(reInstrument);
    if (match?.length !== 3) {
        throw new Error(`Could not process footer text "${footer.textContent}"`);
    }
    let userName = match[1];
    let schoolName = match[2];
    return {userName, schoolName};
}

export function getSchoolIdString() {
    let {schoolName} = getUserAndSchoolName();
    schoolName = schoolName
        .replace("Academie ", "")
        .replace("Muziek", "M")
        .replace("Woord", "W")
        .toLowerCase();
    return createValidId(schoolName);
}

export function millisToString(duration: number) {
    let seconds = Math.floor((duration / 1000) % 60);
    let minutes = Math.floor((duration / (1000 * 60)) % 60);
    let hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    let days = Math.floor((duration / (1000 * 60 * 60 * 24)));

    if (days > 0)
        return days + (days === 1 ? " dag" : " dagen");
    else if (hours > 0)
        return hours + " uur";
    else if (minutes > 0)
        return minutes + (minutes === 1 ? " minuut" : " minuten");
    else if (seconds > 0)
        return seconds + " seconden";
    else return "";
}

export function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

export function isAlphaNumeric(str: string) {
    if (str.length > 1)
        return false;
    let code: number;
    let i: number;
    let len: number;

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

export function rangeGenerator(start: number, stop: number, step = 1): number[] {
    return Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step);
}

export function createSearchField(id: string, onSearchInput: (ev: Event) => any, value: string) {
    let input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.classList.add("tableFilter");
    input.oninput = onSearchInput;
    input.value = value;
    input.placeholder = "filter";
    let span = document.createElement("span");
    span.classList.add("searchButton");
    span.appendChild(input);
    let { first: clearButton } = emmet.appendChild(span, `button>img[src="${chrome.runtime.getURL("images/circle-xmark-regular.svg")}"`);
    (clearButton as HTMLElement).onclick = () => {
        input.value = "";
        input.oninput(undefined);
        input.focus();
    };
    return span;
}

export function getBothToolbars() {
    let navigationBars = document.querySelectorAll("div.datatable-navigation-toolbar"); // as HTMLElement;
    if (navigationBars.length < 2)
        return undefined; //wait for top and bottom bars.
    return navigationBars;
}

export function addTableNavigationButton(navigationBars: NodeListOf<Element>, btnId: string, title: string, onClick: any, fontIconId: string) {
    addButton(navigationBars[0].lastElementChild as HTMLElement, btnId, title, onClick, fontIconId, ["btn-secondary"], "", "afterend");
    return true;
}

export function distinct<Type>(array: Type[]): Type[] {
    return [...new Set(array)];
}

export async function fetchStudentsSearch(search: string) {
    return fetch("/view.php?args=zoeken?zoek=" + encodeURIComponent(search))
        .then((response) => response.text())
        .then((_text) => fetch("/views/zoeken/index.view.php"))
        .then((response) => response.text())
        .catch(err => {
            console.error('Request failed', err);
            return "";
        });
}

export async function setViewFromCurrentUrl() {
    let hash = window.location.hash.replace("#", "");
    await fetch("https://administratie.dko3.cloud/#" + hash).then(res => res.text());
    // call to changeView() - assuming this is always the same, so no parsing here.
    await fetch("view.php?args=" + hash).then(res => res.text());
}

export function equals(g1: GlobalSettings, g2: GlobalSettings){
    return (
        g1.globalHide === g2.globalHide
    );
}

export let rxEmail = /\w[\w.\-]*\@\w+\.\w+/gm;

export function whoAmI() {
    let allScripts = document.querySelectorAll("script");
    let scriptTexts = [...allScripts].map(s => s.textContent).join();
    let email = scriptTexts.match(rxEmail)[0];
    let rxName = /name: '(.*)'/;
    let name = scriptTexts.match(rxName)[1];
    return {email, name};
}

export function stripStudentName(name: string): string {
    return name.replaceAll(/[,()'-]/g, " ").replaceAll("  ", " ");
}

export enum Actions {
    OpenTab = "open_tab",
    GetTabData = "get_tab_data",
}

export interface ExtensionRequest {
    action: Actions,
    data: any,
    pageTitle: string
}

export function openTab(html: string, pageTitle: string) {
    let message: ExtensionRequest = {
        action: Actions.OpenTab,
        data: html,
        pageTitle
    };

    chrome.runtime.sendMessage(message)
        .then(() => console.log("message sent."));
}

export function writeTableToClipboardForExcel(table: HTMLTableElement) {
    let html = table.outerHTML
        .replaceAll('\n','<br style="mso-data-placement:same-cell;"/>')  // new lines inside html cells => Alt+Enter in Excel
        .replaceAll('<td','<td style="vertical-align: top;"');  // align top
    return navigator.clipboard.writeText(html);
}

export function createTable(headers: Iterable<string>, cols: Iterable<Iterable<string>>) {
    let tmpDiv = document.createElement("div");
    let {first: tmpTable, last: tmpThead} = emmet.appendChild(tmpDiv, "table>thead");
    for (let th of headers) {
        emmet.appendChild(tmpThead as HTMLElement, `th{${th}}`);
    }
    let tmpTbody = tmpTable.appendChild(document.createElement("tbody"));
    for (let tr of cols) {
        let tmpTr = tmpTbody.appendChild(document.createElement("tr"));
        for (let cell of tr) {
            emmet.appendChild(tmpTr, `td{${cell}}`);
        }
    }
    return tmpTable as HTMLTableElement;
}

export type ResultOk<T> = {
    result: T
}

export type ResultFail = {
    error: NonNullable<string>
}

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = (T | U) extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type Result<T> = XOR<ResultOk<T>,ResultFail>

export function isButtonHighlighted(buttonId: string) {
    return document.getElementById(buttonId)?.classList.contains("toggled");
}

export function range(startAt: number, upTo: number) {
    if (upTo > startAt)
        return [...Array(upTo - startAt).keys()].map(n => n + startAt);
    else
        return [...Array(startAt - upTo).keys()].reverse().map(n => n + upTo + 1);
}

export function getPageSettings(pageName: PageName, defaultSettings: PageSettings): PageSettings {
    let storedState = localStorage.getItem(def.STORAGE_PAGE_SETTINGS_KEY_PREFIX + pageName);
    if (storedState)
        return JSON.parse(storedState);
    return defaultSettings;
}

export function savePageSettings(state: PageSettings) {
    localStorage.setItem(def.STORAGE_PAGE_SETTINGS_KEY_PREFIX + state.pageName, JSON.stringify(state));
}

let globalTransientPageState: Map<string, any> = new Map();

export function getPageTransientStateValue(key: string, defaultValue: any) {
    let value =  globalTransientPageState.get(key);
    return value ? value : setPageTransientStateValue(key, defaultValue);
}

export function setPageTransientStateValue(key:string, transientState: object){
    globalTransientPageState.set(key, transientState);
    return transientState;
}
export function clearPageTransientState() {
    globalTransientPageState.clear();
}

export async function getOptions() {
    // xxx @ts-ignore
    let items = await chrome.storage.sync.get(null); //get all
    // xxx @ts-ignore
    Object.assign(options, items);
    setGlobalSetting(await fetchGlobalSettings(getGlobalSettings()));
}