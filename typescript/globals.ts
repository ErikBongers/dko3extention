import {Observer} from "./pageObserver";
import {emmet} from "../libs/Emmeter/html";
import {fetchGlobalSettings, getGlobalSettings, GlobalSettings, options, setGlobalSetting} from "./plugin_options/options";
import {Actions, sendRequest, TabType} from "./messaging";
import * as def from "./def"

import {TeacherHoursSetup} from "./werklijst/hoursSettings";

export let observers: Observer[] = [];
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
    // noinspection JSDeprecatedSymbols
    let evUp = new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13, //deprecated, but DKO3 still checks for this!
        bubbles: true});
    input.dispatchEvent(evUp);
}

export function setButtonHighlighted(buttonId: string, show: boolean) {
    if (show) {
        document.getElementById(buttonId).classList.add("toggled");
    } else {
        document.getElementById(buttonId).classList.remove("toggled");
    }
}

export function addButton(targetElement: HTMLElement, buttonId: string, title: string, clickFunction: (ev:PointerEvent) => void, imageId: string, classList: string[], text = "", where: InsertPosition = "beforebegin", imageFileName?: string) {
    let button = document.getElementById(buttonId);
    if (button === null) {
        const button = document.createElement("button");
        button.classList.add("btn", ...classList);
        /*, "btn-sm", "btn-outline-secondary", "w-100"*/
        button.id = buttonId;
        button.style.marginTop = "0";
        button.onclick = clickFunction;
        button.title = title;
        if(text) {
            let span = document.createElement("span");
            button.appendChild(span);
            span.innerText = text;
        }
        if(imageFileName) {
            button.classList.add("svg");
            emmet.appendChild(button, `img[src="${chrome.runtime.getURL("images/" + imageFileName)}"]`);
        }
        const buttonContent = document.createElement("i");
        button.appendChild(buttonContent);
        if(imageId)
            buttonContent.classList.add("fas", imageId);
        targetElement.insertAdjacentElement(where, button);
    }
}

export namespace Schoolyear {
    export function getSelectElement() {
        let selects = document.querySelectorAll("select");
        return Array.from(selects)
            .filter((element) => element.id.includes("schooljaar"))
            .pop();
    }

    export function getHighestAvailable() {
        let el = getSelectElement();
        if (!el)
            return undefined;
        return Array.from(el.querySelectorAll("option"))
            .map(option => option.value)
            .sort()
            .pop();
    }

//Tries to return "202x-202y".
    export function findInPage() {
        let el = getSelectElement();
        if (el)
            return el.value;
        el = document.querySelector("div.alert-info");
        let txt = el.textContent;
        let rx = /[sS]chooljaar *[=:][\s\u00A0]*(\d{4}-\d{4})/gm;
        let res = rx.exec(txt);
        return res[1];
    }

    export function calculateCurrent() {
        let now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth();
        if (month < 8) //zero-based juli !
            return year - 1; //schoolyear started last year.
        return year;
    }

//E.g. "2024-2025"
    export function toFullString(startYear: number) {
        return `${startYear}-${startYear + 1}`;
    }

//E.g. "24-25'
    export function toShortString(startYear: number) {
        return `${startYear % 1000}-${(startYear % 1000) + 1}`;
    }

    export function toNumbers(schoolyearString: string) {
        let parts = schoolyearString.split("-").map(s => parseInt(s));
        return {startYear: parts[0], endYear: parts[1]};
    }

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

export function addTableNavigationButton(navigationBars: NodeListOf<Element>, btnId: string, title: string, onClick: (ev: Event) => void, fontIconId: string) {
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
    await fetch(def.DKO3_BASE_URL+"#" + hash).then(res => res.text());
    // call to changeView() - assuming this is always the same, so no parsing here.
    await fetch("view.php?args=" + hash).then(res => res.text());
}

export function equals(g1: GlobalSettings, g2: GlobalSettings){
    return (
        g1.globalHide === g2.globalHide
    );
}

export let rxEmail = /\w[\w.\-]*@\w+\.\w+/gm;

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

export async function openHtmlTab(innerHtml: string, pageTitle: string) {
    return sendRequest(Actions.OpenHtmlTab, TabType.Main, TabType.Html, undefined, innerHtml, pageTitle);
}

export async function openHoursSettings(schoolyear: string) {
    return sendRequest(Actions.OpenHoursSettings, TabType.Main, TabType.Undefined, undefined, schoolyear, "Lerarenuren setup voor schooljaar " + schoolyear);//todo remove title as it is not used.
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

export async function getOptions() {
    // xxx @ts-ignore
    let items = await chrome.storage.sync.get(null); //get all
    // xxx @ts-ignore
    Object.assign(options, items);
    setGlobalSetting(await fetchGlobalSettings(getGlobalSettings()));
}

export function arrayIsEqual(a: string[], b: string[]) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length != b.length) return false;
    let aSet = new Set(a);
    return b.every((value, _) => aSet.has(value));
}

export function escapeRegexChars(text: string): string {
    return text
        .replaceAll("\\", "\\\\")
        .replaceAll("^", "\\^")
        .replaceAll("$", "\\$")
        .replaceAll(".", "\\.")
        .replaceAll("|", "\\|")
        .replaceAll("?", "\\?")
        .replaceAll("*", "\\*")
        .replaceAll("+", "\\+")
        .replaceAll("(", "\\(")
        .replaceAll(")", "\\)")
        .replaceAll("[", "\\[")
        .replaceAll("]", "\\]")
        .replaceAll("{", "\\{")
        .replaceAll("}", "\\}")
}

export function getImmediateText(element: HTMLElement) {
    return [...element.childNodes].map(c => c.nodeType === 3 ? c.textContent : "").join("");
}

export function tryUntil(func: () => boolean) {
    if (!func())
        setTimeout(() => tryUntil(func), 100);
}

export function tryUntilThen(func: () => boolean, then: () => void) {
    if (func()) {
        then();
    } else {
        setTimeout(() => tryUntilThen(func, then), 100);
    }
}