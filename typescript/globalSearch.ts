import {options} from "./plugin_options/options";
import {LessenFilterDomein, scrapeLessen} from "./lessen/fetch";
import {LesType} from "./roster_diff/calcDiff";
import {Schoolyear} from "./globals";
import {DropDownMenu} from "./dropDownMenus";
import {getUpDownNavigator} from "./globalKeyHandlers";
import {fetchLes} from "./les/fetch";
import {createLesCard} from "./leerling/observer";
import {HtmlLes, Les} from "./lessen/scrape";

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

async function updateMenuItem(dropDownMenu: DropDownMenu, index: number, lesRef: CachedLesId) {
    let les = await fetchLes(lesRef.id);
    let lesmomenten = les.lesMomenten.join("\n");
    // let wachtlijst = les.wachtlijst == 0 ? "span" : `span.red{ (${les.les.wachtlijst} op wachtlijst)}`;
    let wachtlijst = "wachtlijst";
    // let full = les.les.aantal >= les.les.maxAantal ? ".full": "";
    let full = "";
    let infoBlock = createLesCard(lesRef.name, les.vak, full, lesmomenten, les.aantal, les.maxAantal, wachtlijst);
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
            let dropDownMenu = new DropDownMenu(searchField.parentElement?.parentElement!, searchField);
            lesMatches.sort((a, b) => a.name.localeCompare(b.name));
            let queue = Promise.resolve();
            for (let lesRef of lesMatches) {
                let index = dropDownMenu.addItem(lesRef.name, 0, () => {
                    dropDownMenu.hide();
                    location.href = `/#lessen-les?id=${lesRef.id}`;
                });
                //make sure the internal awaits in updateMenuItem() remain grouped:
                queue = queue.then(() => updateMenuItem(dropDownMenu, index, lesRef));
            }
            getUpDownNavigator().setSelectionChangedHandler((navigator) => {
                dropDownMenu.setSelected(navigator.selectedItem);
                console.log(navigator.selectedItem);
            });
            getUpDownNavigator().setSelectingHandler((navigator) => {
                ignoreNextEnter = true;
                dropDownMenu.hide();
                dropDownMenu.clickItem(navigator.selectedItem);
                document.body.focus();
            });
            getUpDownNavigator().selectedItem = 0;
            getUpDownNavigator().setRange(0, lesMatches.length - 1);
            dropDownMenu.show();
            dropDownMenu.menu.addEventListener("toggle", (ev) => {
                if(ev.newState != "open") {
                    getUpDownNavigator().clearSelectionChangedHandler();
                    getUpDownNavigator().clearSelectingHandler();
                }
            })
        }
    }

    return true
}

interface CachedLesId {
    id: string;
    name: string;
}

async function getLesMatches(lesName: string) {
    let cachedLesIds = sessionStorage.getItem("cachedLesIds");
    if (cachedLesIds) {
        let lesIds: CachedLesId[] = JSON.parse(cachedLesIds);
        return findLesId(lesName, lesIds);
    }
    let lessen = await scrapeLessen(LessenFilterDomein.Muziek, LesType.gewone, Schoolyear.toFullString(Schoolyear.calculateCurrent()));
    sessionStorage.setItem("cachedLesIds", JSON.stringify(lessen.map(l => ({id: l.les.id, name: l.les.naam}))));
    return findLesId(lesName, lessen.map(l => ({id: l.les.id, name: l.les.naam})));
}

function findLesId(lesName: string, lesIds: CachedLesId[]) {
    let lowerCaseLesName = lesName.toLowerCase();
    let lesId =  lesIds.find(l => l.name.toLowerCase() == lowerCaseLesName);
    if (lesId)
        return [lesId];
    let includes = lesIds.filter(l => l.name.toLowerCase().includes(lowerCaseLesName));
    if (includes.length)
        return includes;
    return null;
}