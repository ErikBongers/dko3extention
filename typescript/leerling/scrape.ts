import {emmet} from "../../libs/Emmeter";
import {DomeinString} from "../lessen/fetch";
import {GradeYear} from "../gradeYear";
import {textsToYearGrades} from "../lessen/scrape";

export const PlaceHolder = Symbol("placeholder");
export type PlaceHolder = typeof PlaceHolder;

function convertToEmmet(text: string | number | PlaceHolder, charWidth: number) {
    if (text === PlaceHolder)
        return `span.placeHolder.wch${charWidth}`;
    else
        return `{${text}}`;
}

export type LesCardData = {
    vakName: string;
    full: boolean;
    lesmoment: string | PlaceHolder;
    aantal: number | PlaceHolder;
    maxAantal: number | PlaceHolder;
    wachtlijst: number;
    vestiging: string | PlaceHolder;
}

export function createLesCard(lesName: string, lesCardData: LesCardData | PlaceHolder) {
    if (lesCardData === PlaceHolder) {
        lesCardData = {
            vakName: "",
            full: false,
            lesmoment: PlaceHolder,
            aantal: PlaceHolder,
            maxAantal: PlaceHolder,
            wachtlijst: 0,
            vestiging: PlaceHolder
        };
    }
    let wachtlijst = lesCardData.wachtlijst == 0 ? "span" : `span.red{ (${lesCardData.wachtlijst} op wachtlijst)}`;
    let emmetText = `
            div.small${lesCardData.full ? ".full" : ""}
                div.bold.pre
                    strong{${buildLesTitle(lesName, lesCardData.vakName)}}
                div.pre
                    ${convertToEmmet(lesCardData.vestiging, 13)}
                div.pre
                    ${convertToEmmet(lesCardData.lesmoment, 11)}
                div.pre.noClipboard
                    ${convertToEmmet(lesCardData.aantal, 2)}
                    {/}
                    ${convertToEmmet(lesCardData.maxAantal, 2)} 
                    { lln} 
                    ${wachtlijst}
        `;
    return emmet.indent.createElement(emmetText);
}

export function buildLesTitle(lesName: string | null, vakName: string | null) {
    return `${lesName ? lesName : vakName + " " + lesName}`;
}

export interface LesInfo {
    vak: string;
    lesNaam: string
    gotoButton: HTMLButtonElement | null;
}

export interface Opleiding {
    domein: DomeinString | "";
    gradeYears: GradeYear[];
    lessen: LesInfo[];
    adminGroup: string;
}

export function scrapeOpleidingen() {
    let divOpleidingen = document.getElementById("leerling_inschrijvingen_weergave") as HTMLDivElement;
    let tBody = divOpleidingen.querySelector("tbody") as HTMLTableSectionElement;
    let opleidingen: Opleiding[] = [];
    for (let tr of tBody.querySelectorAll("tr")) {
        let detailsTdOffset = 0;
        if ([...tr.classList].find(c => c.includes("inschrijvingen_domein"))) {
            let rowSpan = tr.cells[0].getAttribute("rowspan");
            if (rowSpan) {
                let opleiding = scrapeOpleidingRow(tr);
                opleidingen.push(opleiding);
                detailsTdOffset = 3; //todo: find the exact number of cells to skip
            }
        }
        //scrape details
        let lesInfo = scrapeLesInfoDetails(tr, detailsTdOffset);

        opleidingen[opleidingen.length - 1].lessen.push(lesInfo);
    }
    return opleidingen;
}

function scrapeOpleidingRow(tr: HTMLTableRowElement) {
    let tdOpleiding = tr.querySelector("td:nth-child(2)") as HTMLTableCellElement;
    let tdText = tdOpleiding.textContent;
    let domein: DomeinString | "" = "";
    if (tdText.includes("DomeinOv")) domein = "DomeinOV";
    if (tdText.includes("Muziek")) domein = "Muziek";
    if (tdText.includes("Woord")) domein = "Woord";
    let rx = new RegExp(`${domein}\\s*-\\s*<strong>v*(.*?)</strong>`); // v2.1 denotes VRIJE LLN 2.1
    let gradeYearText = rx.exec(tdOpleiding.innerHTML)?.at(1);
    let gradeYears: GradeYear[] = [];
    if (gradeYearText)
        gradeYears = textsToYearGrades([gradeYearText]);
    rx = /(\d{4,})/;
    let adminGroup = rx.exec(tdText)?.at(1) ?? "";
    let opleiding: Opleiding = {domein, gradeYears, lessen: [], adminGroup};
    return opleiding;
}

function scrapeLesInfoDetails(tr: HTMLTableRowElement, detailsTdOffset: number) {
    let tdVakLes = tr.cells[detailsTdOffset + 1] as HTMLTableCellElement;
    let strong = tdVakLes.querySelector("strong") as HTMLHeadingElement | null;
    let vakNaam = strong?.textContent ?? "";
    let small = tdVakLes.querySelector("small") as HTMLHeadingElement | null;
    let lesNaam = small?.textContent ?? "";
    let iGotoClass = tr.querySelector("i.fa-list-ul") as HTMLSpanElement | null;
    let gotoButton: HTMLButtonElement | null = null;
    if (iGotoClass) {
        gotoButton = iGotoClass.parentElement as HTMLButtonElement;
    }

    let lesInfo: LesInfo = {vak: vakNaam, lesNaam, gotoButton};
    return lesInfo;
}