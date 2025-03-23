import {getGlobalSettings, getUserAndSchoolName, options, registerSettingsObserver} from "../globals";
import {PageObserver} from "../pageObserver";

export default new PageObserver(setSchoolBackground);

registerSettingsObserver(setSchoolBackground);

function setSchoolBackground () {
    let {userName, schoolName} = getUserAndSchoolName();
    let isMyAcademy = options.myAcademies
        .split("\n")
        .filter((needle) => needle !== "")
        .find((needle) =>  schoolName.includes(needle)) != undefined;
    if (options.myAcademies === "") {
        isMyAcademy = true;
    }
    if (isMyAcademy || getGlobalSettings().globalHide === true) {
        document.body.classList.remove("otherSchool");
    } else {
        document.body.classList.add("otherSchool");
    }
}