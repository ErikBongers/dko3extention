import {ExactHashObserver, MenuScrapingObserver} from "../pageObserver";
import {createQueryItem, saveQueryItems, scrapeMenuPage} from "../powerQuery/setupPowerQuery";

export let extraInschrijvingenObserver = new ExactHashObserver("#extra-inschrijvingen", onMutationExtraInschrijvingen);

export let allLijstenObserver = new MenuScrapingObserver("#leerlingen-lijsten", "Lijsten", "Lijsten > ");
export let financialObserver = new MenuScrapingObserver("#extra-financieel", "Financieel", "Financieel > ");
export let assetsObserver = new MenuScrapingObserver("#extra-assets", "Assets", "Assets > ");
export let evaluatieObserver = new MenuScrapingObserver("#extra-evaluatie", "Evaluatie", "Evaluatie > ");
export let academieMenuObserver = new MenuScrapingObserver("#extra-academie", "Academie", "Academie > ");

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

