import {db3, getUserAndSchoolName, options, PageObserver} from "../globals.js";

export default new PageObserver(setSchoolBackground);

function setSchoolBackground () {
    let {userName, schoolName} = getUserAndSchoolName();
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