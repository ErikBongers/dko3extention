import {db3, options, PageObserver} from "../globals.js";

export default new PageObserver(setSchoolBackground);

function getUserAndSchoolName() {
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

function setSchoolBackground () {
    let {userName, schoolName} = getUserAndSchoolName();
    db3("user:" + userName);
    db3("school:" + schoolName);
    let isMyAcademy = options.otherAcademies
        .split("\n")
        .filter((needle) => needle !== "")
        .find((needle) =>  schoolName.includes(needle));
    if (options.otherAcademies === "") {
        isMyAcademy = true;
    }
    if (isMyAcademy) {
        document.body.classList.remove("otherSchool");
    } else {
        document.body.classList.add("otherSchool");
    }
}