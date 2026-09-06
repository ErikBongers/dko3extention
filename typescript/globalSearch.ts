import {options} from "./plugin_options/options";

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

export function onParentKeyUp(e: KeyboardEvent) {
    if(e.key == "Enter") {
        console.log("parent keyup");
        let searchField = document.getElementById("snel_zoeken_veld_zoektermen") as HTMLInputElement;
        let text = searchField.value;
        if(onEnterPressed(text) == "cancel") {
            console.log("canceling");
            e.stopImmediatePropagation();
            e.preventDefault();
            return;
        }
    }
}

function onEnterPressed(text: string) {
    if(text.startsWith("les:")) {
        if(gotoLesName(text.substring(4).trim()))
            return "cancel";
    }
    return "default";
}

function gotoLesName(lesName: string) {
    if(lesName.length == 0)
        return false;

    let lesId = getLesId(lesName);

    return true
}

function getLesId(lesName: string) {
    return "";
}
