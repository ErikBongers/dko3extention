import { HashObserver } from "../pageObserver.js";
import { saveQueryItems } from "../setupPowerQuery.js";
export let extraInschrijvingenObserver = new HashObserver("#extra-inschrijvingen", onMutationExtraInschrijvingen);
export let allLijstenObserver = new HashObserver("#leerlingen-lijsten", onMutationAlleLijsten);
export let financialObserver = new HashObserver("#extra-financieel", onMutationFinancial);
function onMutationFinancial(_mutation) {
    saveQueryItems("Financieel", scrapeFinancialLinks());
    return true;
}
function onMutationAlleLijsten(_mutation) {
    saveQueryItems("Lijsten", scrapeAlleLijstenLinks());
    return true;
}
function onMutationExtraInschrijvingen(_mutation) {
    saveQueryItems("ExtraInschrijvingen", scrapeExtraInschrijvingenLinks());
    return true;
}
function scrapeFinancialLinks() {
    let queryItems = [];
    let blocks = document.querySelectorAll("div.card-body");
    for (let block of blocks) {
        let header = block.querySelector('h5');
        if (!header) {
            continue;
        }
        let headerLabel = header.textContent.trim();
        let links = block.querySelectorAll("a");
        for (let link of links) {
            if (!link.href)
                continue;
            let item = {
                headerLabel, href: link.href, label: link.textContent.trim(), longLabel: "", lowerCase: "", weight: 0
            };
            item.longLabel = "Financieel > " + " > " + item.label;
            item.lowerCase = item.longLabel.toLowerCase();
            queryItems.push(item);
        }
    }
    console.log(queryItems);
    return queryItems;
}
function scrapeAlleLijstenLinks() {
    let queryItems = [];
    let blocks = document.querySelectorAll("div.card-body");
    for (let block of blocks) {
        let header = block.querySelector('h5');
        if (!header) {
            continue;
        }
        let headerLabel = header.textContent.trim();
        let links = block.querySelectorAll("a");
        for (let link of links) {
            if (!link.href)
                continue;
            let item = {
                headerLabel, href: link.href, label: link.textContent.trim(), longLabel: "", lowerCase: "", weight: 0
            };
            item.longLabel = "Lijsten > " + " > " + item.label;
            item.lowerCase = item.longLabel.toLowerCase();
            queryItems.push(item);
        }
    }
    console.log(queryItems);
    return queryItems;
}
function scrapeExtraInschrijvingenLinks() {
    let queryItems = [];
    let blocks = document.querySelectorAll("div.card-body");
    for (let block of blocks) {
        let header = block.querySelector('h5');
        if (!header) {
            continue;
        }
        let headerLabel = header.textContent.trim();
        let links = block.querySelectorAll("a");
        for (let link of links) {
            if (!link.href)
                continue;
            let item = {
                headerLabel, href: link.href, label: link.textContent.trim(), longLabel: "", lowerCase: "", weight: 0
            };
            if (item.label.toLowerCase().includes("inschrijving")) {
                item.longLabel = item.headerLabel + " > " + item.label;
            }
            else {
                item.longLabel = "Inschrijvingen > " + item.headerLabel + " > " + item.label;
            }
            item.lowerCase = item.longLabel.toLowerCase();
            queryItems.push(item);
        }
    }
    console.log(queryItems);
    return queryItems;
}
//# sourceMappingURL=observer.js.map