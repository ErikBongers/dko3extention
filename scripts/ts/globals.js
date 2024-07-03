export const options = {
    showDebug: false,
    otherAcademies: "",
    showNotAssignedClasses: true
};
export let observers = [];
export function db3(message) {
    if (options?.showDebug) {
        console.log(message);
        console.log(Error().stack.split("\n")[2]);
    }
}
export function createValidId(id) {
    return id
        .replaceAll(" ", "")
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\W/g, '');
}
export function registerObserver(observer) {
    observers.push(observer);
    if (observers.length > 10) //just in case...
        console.error("Too many observers!");
}
// noinspection JSUnusedGlobalSymbols
export function searchText(text) {
    let input = document.querySelector("#snel_zoeken_veld_zoektermen");
    input.value = text;
    let evUp = new KeyboardEvent("keyup", { key: "Enter", keyCode: 13, bubbles: true });
    input.dispatchEvent(evUp);
}
export function setButtonHighlighted(buttonId, show) {
    if (show) {
        document.getElementById(buttonId).classList.add("toggled");
    }
    else {
        document.getElementById(buttonId).classList.remove("toggled");
    }
}
export function addButton(targetElement, buttonId, title, clickFunction, imageId, classList, text = "", where = "beforebegin") {
    let button = document.getElementById(buttonId);
    if (button === null) {
        const button = document.createElement("button");
        button.classList.add("btn" /*, "btn-sm", "btn-outline-secondary", "w-100"*/, ...classList);
        button.id = buttonId;
        button.style.marginTop = "0";
        button.onclick = clickFunction;
        button.title = title;
        if (text) {
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
    if (el)
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
    return { userName, schoolName };
}
export function getSchoolIdString() {
    let { schoolName } = getUserAndSchoolName();
    schoolName = schoolName
        .replace("Academie ", "")
        .replace("Muziek", "M")
        .replace("Woord", "W")
        .toLowerCase();
    return createValidId(schoolName);
}
