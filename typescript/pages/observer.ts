import {ExactHashObserver, HashObserver} from "../pageObserver";
import {addQueryItem, createQueryItem, QueryItem, saveQueryItems} from "../setupPowerQuery";

export let extraInschrijvingenObserver = new ExactHashObserver("#extra-inschrijvingen", onMutationExtraInschrijvingen);
export let allLijstenObserver = new ExactHashObserver("#leerlingen-lijsten", onMutationAlleLijsten);
export let financialObserver = new ExactHashObserver("#extra-financieel", onMutationFinancial);
export let assetsObserver = new ExactHashObserver("#extra-assets", onMutationAssets);
export let evaluatieObserver = new ExactHashObserver("#extra-evaluatie", onMutationEvaluatie);
export let academieMenuObserver = new ExactHashObserver("#extra-academie", onMutationAcademie);

type LinkToQueryConverter = (headerLabel: string, link: HTMLAnchorElement, longLabelPrefix: string) => QueryItem;

function onMutationAcademie(_mutation: MutationRecord) {
    saveQueryItems("Academie", scrapeMenuPage("Academie > ", defaultLinkToQueryItem));
    return true;
}

function onMutationAssets(_mutation: MutationRecord) {
    saveQueryItems("Assets", scrapeMenuPage("Assets > ", defaultLinkToQueryItem));
    return true;
}

function onMutationEvaluatie(_mutation: MutationRecord) {
    saveQueryItems("Evaluatie", scrapeMenuPage("Evaluatie > ", defaultLinkToQueryItem));
    return true;
}

function onMutationFinancial(_mutation: MutationRecord) {
    saveQueryItems("Financieel", scrapeMenuPage("Financieel > ", defaultLinkToQueryItem));
    return true;
}

function onMutationAlleLijsten(_mutation: MutationRecord) {
    saveQueryItems("Lijsten", scrapeMenuPage("Lijsten > ", defaultLinkToQueryItem));
    return true;
}

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

function scrapeMenuPage(longLabelPrefix: string, linkConverter: LinkToQueryConverter) {
    let queryItems: QueryItem[] = [];
    let blocks = document.querySelectorAll("div.card-body");
    for(let block of blocks){
        let header = block.querySelector('h5');
        if(!header) {
            continue;
        }
        let headerLabel = header.textContent.trim();
        let links = block.querySelectorAll("a");
        for(let link of links) {
            if(!link.href)
                continue;
            let item = linkConverter(headerLabel, link, longLabelPrefix);
            queryItems.push(item);
        }
    }
    return queryItems;
}
