import {TokenScanner} from "../tokenScanner";
import {TimeSlice} from "../roster_diff/excelRoster";
import {DayUppercase, toDay} from "../lessen/scrape";
import {createJsonDiffs, Dko3DiffData, findTeacher, getDiffsCloudFileName, getDko3Data, runRosterCheck} from "../roster_diff/buildDiff";
import {getDiffsDko3CacheFileName, StatusCallback} from "../roster_diff/showDiff";
import {InfoBarTableFetchListener} from "../table/loadAnyTable";
import {DiffSettings} from "../roster_diff/diffSettings";
import {cloud, fetchExcelData, fetchFolderChanged} from "../cloud";
import {JsonExcelData} from "../roster_diff/excel";
import {Actions, sendRequest, TabType} from "../messaging";

interface WwwLesDef {
    url: string;
    className: string;
    day: string;
    timeString: string;
    location: string;
    teacher: string;
}

interface TaggedWwwLesDef {
    lesDef: WwwLesDef;
    timeSlice: TimeSlice;
    day: DayUppercase | null;
    teachers: string[];
}

export async function buildWwwDiff(reportStatus: StatusCallback, fetchListener: InfoBarTableFetchListener, academie: string, schoolYear: string, dko3DiffData: Dko3DiffData | null, diffSettings: DiffSettings) {
    reportStatus(`Vergelijken met DKO3 lessen...`);
    if(!dko3DiffData)
        dko3DiffData = await getDko3Data(schoolYear, reportStatus, fetchListener);
    await parseWww(dko3DiffData);
}



function tagWwwLes(les: WwwLesDef, dko3DiffData: Dko3DiffData) {
    let times = TimeSlice.parseShortTimes(les.timeString);
    let day = toDay(les.day);
    if(!day)
        console.log(`Could not parse day ${les.day}`);

    if(times.length != 2) {
        console.log(`Could not parse time slice ${les.timeString} for class ${les.className}. url: ${les.url}`); //todo: report error i ux
        return null;
    }

    let timeSlice = new TimeSlice(times[0], times[1]);

    let teachers = les.teacher
        .split(/[\/,]/g).map(t => findTeacher(t, dko3DiffData.teachers))
        .filter(t => t != "");

    return {lesDef: les, timeSlice: timeSlice, day, teachers} satisfies TaggedWwwLesDef as TaggedWwwLesDef;
}

export interface HtmlText {
    url: string;
    text: string;
}

async function requestWww(urlList: string[]) {
    return sendRequest(Actions.Www, TabType.Main, TabType.Undefined, undefined, {urlList}, "");
}

export async function parseWww(dko3DiffData: Dko3DiffData) {
    let data: HtmlText[] = await requestWww([
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-woord-gevorderden-18",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-2e-graad-kinderen-8-tot-11-jaar",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-1e-graad-kinderen-6-tot-7-jaar",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-2e-graad-jongeren-12-tot-17-jaar",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-3e-graad-klassiek",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-3e-graad-jazz-pop-rock",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-3e-graad-wereldmuziek",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-4e-graad-klassiek",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-4e-graad-jazz-pop-rock-volwassenen-vanaf-18-jaar",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-4e-graad-wereldmuziek",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-musical",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-elektronische-muziek-enkel-de-hoofdschool",
        "https://academieberchem.stedelijkonderwijs.be/uurrooster-2e-graad-volwassenen-vanaf-18-jaar",
    ]);

    let lessen: WwwLesDef[] = [];
    for(let html of data) {
        lessen = lessen.concat(parseHtml(html));
    }
    console.log(lessen);
    let taggedLessen: (TaggedWwwLesDef | null)[] = lessen
        .map(les => tagWwwLes(les, dko3DiffData))
        .filter(les => les != null);

    console.log(taggedLessen);
}

function parseHtml(html: HtmlText) {
    let scanner = new TokenScanner(html.text);
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
        lessen = lessen.concat(scrapeClassTable(html.url, table));
    }
    return lessen;
}

function scrapeClassTable(url: string, table: HTMLTableElement) {
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
    let lessen = [...table.tBodies[0].rows].map(row => {
        let className = row.cells[classIndex!].textContent??"";
        className = className.trim();
        if(className == "")
            className = lastClass;
        lastClass = className;
        let day = dayIndex? row.cells[dayIndex].textContent : "";
        let timeString = timeIndex? row.cells[timeIndex].textContent : "";
        let location = locationIndex? row.cells[locationIndex].textContent : "";
        let teacher = teacherIndex? row.cells[teacherIndex].textContent : "";
        if(!day && !timeString && !location && !teacher)
            return null;
        if(className.toLowerCase().includes("begeleidingspraktijk")
            || className.toLowerCase().includes("muziektheorie")
            || className.toLowerCase().includes("compositie")
            || className.toLowerCase().includes("improvisatie")
            || className.toLowerCase().includes("musical zang")
            || className.toLowerCase().includes("musical koor")
        )
            return null;
        return {
            url,
            className,
            day,
            timeString,
            location,
            teacher,
        } satisfies WwwLesDef as WwwLesDef;
    });
    return lessen.filter(les => les != null) as WwwLesDef[];
}
