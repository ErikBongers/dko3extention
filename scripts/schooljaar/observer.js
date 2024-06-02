import {db3, PageObserver} from "../globals.js";

export default new PageObserver(setSchoolBackground);

function setSchoolBackground () {
    let footer = document.querySelector("body > main > div.row > div.col-auto.mr-auto > small");
    const reInstrument = /.*Je bent aangemeld als (.*)\s@\s(.*)\./;
    const match =  footer.textContent.match(reInstrument);
    if (match?.length !== 3) {
        console.error(`Could not process footer text "${footer.textContent}"`);
        return;
    }
    let userName = match[1];
    let schoolName = match[2];
    db3("user:" + userName);
    db3("school:" + schoolName);
    if (schoolName !== "Academie Berchem (Muziek-Woord)") {
        document.body.classList.add("otherSchool");
    } else {
        document.body.classList.remove("otherSchool");
    }
}