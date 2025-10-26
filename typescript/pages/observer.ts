import {ExactHashObserver, MenuScrapingObserver} from "../pageObserver";
import {createQueryItem, saveQueryItems, scrapeMenuPage} from "../powerQuery/setupPowerQuery";

class ExtraInschrijvingenObserver extends ExactHashObserver {
    constructor() {
        super("#extra-inschrijvingen", onMutationExtraInschrijvingen);
    }
    isPageReallyLoaded(): boolean {
        return document.querySelector("#view_contents > div:nth-child(3) > div:nth-child(3) > div.card.mb-2.shadow-sm > div > a:nth-child(11)") != null;
    }

}
export let extraInschrijvingenObserver = new ExtraInschrijvingenObserver();

export let allLijstenObserver = new MenuScrapingObserver("#leerlingen-lijsten", "Lijsten", "Lijsten > ", "#div_leerlingen_lijsten");
export let financialObserver = new MenuScrapingObserver("#extra-financieel", "Financieel", "Financieel > ", "#view_contents > div:nth-child(2) > div:nth-child(3) > div:nth-child(2) > div > a:nth-child(8)");
export let assetsObserver = new MenuScrapingObserver("#extra-assets", "Assets", "Assets > ", "#view_contents > div:nth-child(2) > div:nth-child(2) > div > div > a:nth-child(10)");
export let evaluatieObserver = new MenuScrapingObserver("#extra-evaluatie", "Evaluatie", "Evaluatie > ", "#view_contents > div:nth-child(3) > div:nth-child(3) > div:nth-child(3) > div > a:nth-child(10)");
export let academieMenuObserver = new MenuScrapingObserver("#extra-academie", "Academie", "Academie > ", "#view_contents > div:nth-child(2) > div:nth-child(3) > div:nth-child(2) > div > a:nth-child(12)");

function onMutationExtraInschrijvingen(_mutation: MutationRecord) {
    saveQueryItems("ExtraInschrijvingen", scrapeMenuPage("Inschrijvingen > ", inschrijvingenLinkToQueryItem));
    return true;
}

function inschrijvingenLinkToQueryItem(headerLabel: string, link: HTMLAnchorElement, longLabelPrefix: string) {
    let label = link.textContent.trim();
    let longLabel = longLabelPrefix + headerLabel + " > " + label;
    if (label.toLowerCase().includes("inschrijving")) {
        longLabel = headerLabel + " > " + label;
    }
    return createQueryItem(headerLabel, label, link.href, undefined, longLabel);
}

function defaultLinkToQueryItem(headerLabel: string, link: HTMLAnchorElement, longLabelPrefix: string) {
    let label = link.textContent.trim();
    return createQueryItem(headerLabel, label, link.href, undefined, longLabelPrefix + label);
}

