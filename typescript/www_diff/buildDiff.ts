import {TokenScanner} from "../tokenScanner";
import {Actions, sendRequest, ServiceRequest, TabType} from "../messaging";
import {fetchDiffSettingsOrDefault, getAndShowDiffs} from "../roster_diff/showDiff";
import {DiffSettings} from "../roster_diff/diffSettings";

interface WwwLesDef {
    className: string;
    day: string;
    timeString: string;
    // timeSlice: TimeSlice;
    location: string;
    teacher: string;
}

export function parseWww(data: string[]) {
    let lessen: WwwLesDef[] = [];
    for(let html of data) {
        lessen = lessen.concat(parseHtml(html));
    }
    console.log(lessen);
}

function parseHtml(html: string) {
    let scanner = new TokenScanner(html);
    scanner.find("<main ");
    scanner.find(">");
    scanner.clipTo("</main>")
    console.log(scanner.result()!);
    let div = document.createElement("div");
    div.innerHTML = scanner.result()!;
    console.log(div);
    let pageTitle = div.querySelector("h1.title")!.textContent;
    console.log(pageTitle);
    let classTables = [...div.querySelectorAll("table") as NodeListOf<HTMLTableElement>]
        .filter(table => {
            return table.tHead?.rows[0].textContent.toLowerCase().includes("klas");
        });
    let lessen: WwwLesDef[] = [];
    for(let table of classTables) {
        lessen = lessen.concat(scrapeClassTable(table));
    }
    return lessen;
}

function scrapeClassTable(table: HTMLTableElement) {
    //get indexes of columns
    let classIndex: number | undefined = undefined;
    let dayIndex: number | undefined = undefined;
    let timeIndex: number | undefined = undefined;
    let locationIndex: number | undefined = undefined;
    let teacherIndex: number | undefined = undefined;
    for(let [i, th] of [...table.tHead!.rows[0].cells].entries()) {
        switch (th.textContent?.toLowerCase()) {
            case "klas": classIndex = i; break;
            case "dag": dayIndex = i; break;
            case "lestijd": timeIndex = i; break;
            case "locatie": locationIndex = i; break;
            case "leerkracht": teacherIndex = i; break;
            default: break;
        }
    }
    let lastClass = "";
    return [...table.tBodies[0].rows].map(row => {
        let className = row.cells[classIndex!].textContent??"";
        className = className.trim();
        if(className == "")
            className = lastClass;
        lastClass = className;
        let day = dayIndex? row.cells[dayIndex].textContent : "";
        let timeString = timeIndex? row.cells[timeIndex].textContent : "";
        let location = locationIndex? row.cells[locationIndex].textContent : "";
        let teacher = teacherIndex? row.cells[teacherIndex].textContent : "";
        return {
            className,
            day,
            timeString,
            location,
            teacher,
        } satisfies WwwLesDef as WwwLesDef;
    });
}
