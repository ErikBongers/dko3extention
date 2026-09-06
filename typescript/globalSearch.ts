import {options} from "./plugin_options/options";
import {LessenFilterDomein, scrapeLessen} from "./lessen/fetch";
import {LesType} from "./roster_diff/calcDiff";
import {Schoolyear} from "./globals";

export function onPasteInGlobalSearchField(e: ClipboardEvent) {
    if (!options.stripCommasOnPaste)
        return;

    let searchField = document.getElementById("snel_zoeken_veld_zoektermen") as HTMLInputElement;
    let text = e.clipboardData?.getData("text/plain") ?? "";
    let newText = text
        .replaceAll(",", "")
        .replaceAll("-", " ");
    searchField.setRangeText(newText);
    searchField.setSelectionRange(newText.length, newText.length);
    e.preventDefault();
}

export async function onParentKeyUp(e: KeyboardEvent) {
    if (e.key == "Enter") {
        console.log("parent keyup");
        let searchField = document.getElementById("snel_zoeken_veld_zoektermen") as HTMLInputElement;
        let text = searchField.value;
        if (await onEnterPressed(text) == "cancel") {
            console.log("canceling");
            e.stopImmediatePropagation();
            e.preventDefault();
            return;
        }
    }
}

async function onEnterPressed(text: string) {
    if (text.startsWith("les:")) {
        if (await gotoLesName(text.substring(4).trim()))
            return "cancel";
    }
    return "default";
}

async function gotoLesName(lesName: string) {
    if (lesName.length == 0)
        return false;

    let lesId = await getLesId(lesName);
    if(lesId)
        location.href = `/#lessen-les?id=${lesId}`;

    return true
}

async function getLesId(lesName: string) {
    let lessen = await scrapeLessen(LessenFilterDomein.Muziek, LesType.gewone, Schoolyear.toFullString(Schoolyear.calculateCurrent()));
    let  lowerCaseLesName = lesName.toLowerCase();
    console.log(lessen.map(l => l.les.naam));
    let lesId = lessen.find(l => l.les.naam.toLowerCase() == lowerCaseLesName);
    if (lesId)
        return lesId.les.id;
    let includes = lessen.filter(l => l.les.naam.toLowerCase().includes(lowerCaseLesName));
    if (includes.length == 1)
        return includes[0].les.id;

    return null;
}
