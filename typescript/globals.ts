type Options = {
  showDebug: boolean;
    otherAcademies: string;
    showNotAssignedClasses: boolean;
};
export const options: Options = {
    showDebug: false,
    otherAcademies: "",
    showNotAssignedClasses: true
};

export let observers = [];

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


export function registerObserver(observer) {
    observers.push(observer);
    if(observers.length > 20) //just in case...
        console.error("Too many observers!");
}

// noinspection JSUnusedGlobalSymbols
export function searchText(text: string) {
    let input: HTMLInputElement = document.querySelector("#snel_zoeken_veld_zoektermen");
    input.value = text;
    let evUp = new KeyboardEvent("keyup", {key: "Enter", keyCode: 13, bubbles: true});
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

export function getSchooljaar() {
    let el = getSchooljaarSelectElement();
    if(el)
        return el.value;
    el = document.querySelector("div.alert-info");
    return el.textContent.match(/schooljaar *= (\d{4}-\d{4})*/)[1];
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