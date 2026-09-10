import {options} from "./plugin_options/options";
import {LessenFilterDomein, scrapeLessen} from "./lessen/fetch";
import {LesType} from "./roster_diff/calcDiff";
import {Schoolyear} from "./globals";
import {DropDownMenu} from "./dropDownMenus";
import {fetchLes} from "./les/fetch";
import {createLesCard} from "./leerling/observer";
import {LesRef, SessionCache} from "./db/sessionDb";

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
        console.log("parent Enter");
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

let ignoreNextEnter: boolean = false;

async function onEnterPressed(text: string) {
    if (ignoreNextEnter) {
        ignoreNextEnter = false;
        return "default";
    }
    if(!text.includes(":"))
        return "default";
    let parts = text.split(":");
    let key = parts.shift()!; //! will have 1 element
    let value = parts.join(":");
    if ("les".startsWith(key)) {
        if (await gotoLesName(value.trim()))
            return "cancel";
    }
    return "default";
}

async function updateMenuItem(dropDownMenu: DropDownMenu, index: number, lesRef: LesRef, signal: AbortSignal) {
    if (signal.aborted) {
        console.log("ABORTED updateMenuItem:", lesRef.id);
        return;
    }
    console.log("FETCHING updateMenuItem:", lesRef.id);
    let les = await fetchLes(lesRef.id, signal);
    let lesmomenten = les.lesMomenten.join("\n");
    // let wachtlijst = les.wachtlijst == 0 ? "span" : `span.red{ (${les.les.wachtlijst} op wachtlijst)}`;
    let wachtlijst = "wachtlijst";
    let full = les.aantal >= les.maxAantal ? ".full": "";
    let infoBlock = createLesCard(lesRef.name, les.vak, full, lesmomenten, les.aantal, les.maxAantal, wachtlijst, les.vestiging);
    dropDownMenu.setItemContent(index, infoBlock);
}

async function gotoLesName(lesName: string) {
    if (lesName.length == 0)
        return false;

    let lesMatches = await getLesMatches(lesName);
    if(lesMatches) {
        if (lesMatches.length == 1)
            location.href = `/#lessen-les?id=${lesMatches[0].id}`;
        else if (lesMatches.length > 1) {
            let searchField = document.getElementById("snel_zoeken_veld_zoektermen") as HTMLElement;
            let dropDownMenu = new DropDownMenu(searchField.parentElement?.parentElement!, searchField, false);
            lesMatches.sort((a, b) => a.name.localeCompare(b.name));
            let queue = Promise.resolve();
            let abortController = new AbortController();
            let signal = abortController.signal;
            for (let lesRef of lesMatches) {
                let index = dropDownMenu.addItem(lesRef.name, 0, () => {
                    abortController.abort();
                    dropDownMenu.hide();
                    location.href = `/#lessen-les?id=${lesRef.id}`;
                });
                //make sure the internal awaits in updateMenuItem() remain grouped:
                queue = queue.then(() => updateMenuItem(dropDownMenu, index, lesRef, signal));
            }
            dropDownMenu.show();
        }
    }

    return true
}

async function getLesMatches(lesName: string) {
    let lowerCase = lesName.toLowerCase();
    let loaded = await SessionCache.Loaded.get("LesRefs");
    if (!loaded) {
        let lessen = await scrapeLessen(LessenFilterDomein.Muziek, LesType.gewone, Schoolyear.toFullString(Schoolyear.calculateCurrent()));
        let lesRefs = lessen
            .map<LesRef>(l => ({id: l.les.id, name: l.les.naam}))
            .filter(l => l.name);
        await SessionCache.LesRefs.bulkPut(lesRefs);
        await SessionCache.Loaded.put(true, "LesRefs");
    }
    return SessionCache.LesRefs.findMatches(lesRef => lesRef.name.toLowerCase().includes(lowerCase));
}
