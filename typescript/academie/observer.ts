import {db3, getUserAndSchoolName, options} from "../globals";
import {PageObserver} from "../pageObserver";

export default new PageObserver(setSchoolBackground);

function setSchoolBackground () {
    let {userName, schoolName} = getUserAndSchoolName();
    let isMyAcademy = options.otherAcademies
        .split("\n")
        .filter((needle) => needle !== "")
        .find((needle) =>  schoolName.includes(needle)) != undefined;
    if (options.otherAcademies === "") { //TODO: rename to myAcademies !!
        isMyAcademy = true;
    }
    if (isMyAcademy) {
        document.body.classList.remove("otherSchool");
    } else {
        document.body.classList.add("otherSchool");
    }
}