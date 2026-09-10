import {options} from "./plugin_options/options";
import {LessenFilterDomein, scrapeLessen} from "./lessen/fetch";
import {LesType} from "./roster_diff/calcDiff";
import {Schoolyear} from "./globals";
import {DropDownMenu} from "./dropDownMenus";
import {fetchLes} from "./les/fetch";
import {createLesCard} from "./leerling/observer";
import {AssetRef, LesRef, Ref, SessionCache} from "./db/sessionDb";
import {scrapeAssets} from "./assets/scrape";

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
    } else if("ma".startsWith(key)) {
        if (await gotoLesRef(value.trim(), "Muziekatelier"))
            return "cancel";
    } else if("asset".startsWith(key)) {
        if (await gotoAssetRef(value.trim()))
            return "cancel";
    }
    return "default";
}

async function updateLesMenuItem(dropDownMenu: DropDownMenu, index: number, lesRef: LesRef, signal: AbortSignal) {
    if (signal.aborted) { //todo: move this out of here
        console.log("ABORTED updateMenuItem:", lesRef.id);
        return;
    }
    let les = await fetchLes(lesRef.id, signal);
    let lesmomenten = les.lesMomenten.join("\n");
    let wachtlijst = "wachtlijst";
    let full = les.aantal >= les.maxAantal ? ".full": "";
    let infoBlock = createLesCard(lesRef.name, les.vak, full, lesmomenten, les.aantal, les.maxAantal, wachtlijst, les.vestiging);
    dropDownMenu.setItemContent(index, infoBlock);
}

async function updateAssetMenuItem(dropDownMenu: DropDownMenu, index: number, assetRef: AssetRef, signal: AbortSignal) {
    if (signal.aborted) { //todo: move this out of here
        console.log("ABORTED updateMenuItem:", assetRef.id);
        return;
    }
    //don' do nottin' for now...
}

async function gotoLesName(lesName: string, vak?: string) {
    if (lesName.length == 0)
        return false;

    let lesMatches = await getLesMatches(lesName, vak);
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
                    dropDownMenu.remove();
                    location.href = `/#lessen-les?id=${lesRef.id}`;
                });
                //make sure the internal awaits in updateMenuItem() remain grouped:
                queue = queue.then(() => updateLesMenuItem(dropDownMenu, index, lesRef, signal));
            }
            dropDownMenu.show();
        }
    }

    return true
}

async function gotoLesRef(lesName: string, vak?: string) {
    return gotoRef<LesRef>(
        () => getLesMatches(lesName, vak),
        "/#lessen-les?id=",
        (lesRef) => lesRef.name,
        updateLesMenuItem
    );
}

async function gotoAssetRef(assetCode: string) {
    return gotoRef<AssetRef>(
        () => getAssetMatches(assetCode),
        "/#extra-assets-assets-details?id=",
        (assetRef) => assetRef.code,
        updateAssetMenuItem
    );
}

async function gotoRef<T extends Ref>(getMatches: () => Promise<T[]>,
                                      gotoUrl: string,
                                      getLabel: (ref: T) => string,
                                      updateMenuItem: (dropDownMenu: DropDownMenu, index: number, ref: T, signal: AbortSignal) => Promise<void>
                                      ) {
    let matches = await getMatches();
    if(matches) {
        if (matches.length == 1)
            location.href = gotoUrl + matches[0].id;
        else if (matches.length > 1) {
            let searchField = document.getElementById("snel_zoeken_veld_zoektermen") as HTMLElement;
            let dropDownMenu = new DropDownMenu(searchField.parentElement?.parentElement!, searchField, false);
            matches.sort((a, b) => getLabel(a).localeCompare(getLabel(b)));
            let queue = Promise.resolve();
            let abortController = new AbortController();
            let signal = abortController.signal;
            for (let ref of matches) {
                let index = dropDownMenu.addItem(getLabel(ref), 0, () => {
                    abortController.abort();
                    dropDownMenu.remove();
                    location.href = gotoUrl + ref.id;
                });
                //make sure the internal awaits in updateMenuItem() remain grouped:
                queue = queue.then(() => updateMenuItem(dropDownMenu, index, ref, signal));
            }
            dropDownMenu.show();
        }
    }
    return true;
}

async function getLesMatches(lesName: string, vak?: string) {
    if(!lesName)
        return [];
    let lowerCase = lesName.toLowerCase();
    let loaded = await SessionCache.Loaded.get("LesRefs");
    if (!loaded) {
        let lessen = await scrapeLessen(LessenFilterDomein.Muziek, LesType.gewone, Schoolyear.toFullString(Schoolyear.calculateCurrent()));
        let lesRefs = lessen
            .map<LesRef>(l => ({id: l.les.id, name: l.les.naam, vak: l.les.vakNaam}));
        await SessionCache.LesRefs.bulkPut(lesRefs);
        await SessionCache.Loaded.put(true, "LesRefs");
    }
    if(vak)
        return SessionCache.LesRefs.findMatches(lesRef => lesRef.name.toLowerCase().includes(lowerCase) && lesRef.vak == vak);

    return SessionCache.LesRefs.findMatches(lesRef => lesRef.name.toLowerCase().includes(lowerCase));
}

async function getAssetMatches(assetCode: string) {
    if(!assetCode)
        return [];
    let lowerCase = assetCode.toLowerCase();
    let loaded = await SessionCache.Loaded.get("AssetRefs");
    if (!loaded) {
        let assets = await scrapeAssets();
        let assetRefs = assets
            .map<AssetRef>(asset => ({id: asset.id, code: asset.code}));
        await SessionCache.AssetRefs.bulkPut(assetRefs);
        await SessionCache.Loaded.put(true, "AssetRefs");
    }
    return SessionCache.AssetRefs.findMatches(assetRef => assetRef.code.toLowerCase().includes(lowerCase));
}
