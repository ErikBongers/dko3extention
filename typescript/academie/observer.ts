import {getUserAndSchoolName, registerSettingsObserver} from "../globals";
import {PageObserver} from "../pageObserver";
import {getGlobalSettings, options} from "../plugin_options/options";

export default new PageObserver(setSchoolBackground);

registerSettingsObserver(setSchoolBackground);

function setSchoolBackground () {
    let {schoolName} = getUserAndSchoolName();
    let isMyAcademy = options.myAcademies
        .split("\n")
        .filter((needle) => needle !== "")
        .find((needle) =>  schoolName.includes(needle)) != undefined;
    if (options.myAcademies === "") {
        isMyAcademy = true;
    }
    if (isMyAcademy || getGlobalSettings().globalHide === true || options.markOtherAcademies === false) {
        document.body.classList.remove("otherSchool");
    } else {
        document.body.classList.add("otherSchool");
    }
}