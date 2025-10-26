import {getUserAndSchoolName, registerSettingsObserver} from "../globals";
import {PageObserver} from "../pageObserver";
import {getGlobalSettings, options} from "../plugin_options/options";

class AcademieObserver extends PageObserver {
    constructor() {
        super(setSchoolBackground);
    }
    isPageReallyLoaded(): boolean {
        try {
            getUserAndSchoolName();
            return true;
        }
        catch (_) {
            return false;
        }
    }
}

export default new AcademieObserver();

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