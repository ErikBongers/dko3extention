import {TokenScanner} from "../tokenScanner";
import {ExcelRoster, TimeSlice} from "../roster_diff/excelRoster";
import {DayTimeSlice, DayUppercase, toDay} from "../lessen/scrape";
import {calcDiff, Dko3DiffData, findTeacher, getDko3Data, PreparedDiffSettings, PreparedDko3DiffData} from "../roster_diff/buildDiff";
import {StatusCallback} from "../roster_diff/showDiff";
import {InfoBarTableFetchListener} from "../table/loadAnyTable";
import {Actions, sendRequest, ServiceRequest, TabType} from "../messaging";
import {DiffSettings} from "../roster_diff/diffSettings";
import {ComparableLesMoment, GradeYear} from "../roster_diff/calcDiff";

interface WwwLesDef {
    url: string;
    pageTitle: string;
    sectionTitle: string;
    panelTitle: string;
    className: string;
    day: string;
    timeString: string;
    location: string;
    teacher: string;
}

export type OtherLesType = "excel" | "www";

export function preTranslate(text: string) {
    //todo: put pe-translations in settings
    return text
        .replaceAll("Kunstenbad beeld - muziek - woord", "Kunstenbad Kleine Stad bk - muziek - woord")
        .replaceAll("blazersensemble", "Blazersensemble 2e graad") //todo: conditional on page headers.
        .replaceAll("gitaarensemble", "Gitaarensemble 2e graad") //todo: conditional on page headers.
        .replaceAll("strijkersensemble", "Strijkersensemble 2e graad") //todo: conditional on page headers.
        .replaceAll("ü", "u"); // Jürgen !!!
}

export class TaggedWwwLesDef implements ComparableLesMoment{
    lesType: OtherLesType = "www";
    hash: string;
    lesDef: WwwLesDef;
    timeSlice: TimeSlice;
    day: DayUppercase;
    teachers: string[];
    location: string;
    subjects: string[];
    className: string | null;
    gradeYears: GradeYear[];
    ignore: boolean;
    dayTimeSlice: DayTimeSlice;

    constructor(lesDef: WwwLesDef, timeSlice: TimeSlice, day: DayUppercase, teachers: string[], dko3Data: PreparedDko3DiffData, diffSettings: PreparedDiffSettings) {
        this.lesDef = lesDef;
        this.timeSlice = timeSlice;
        this.day = day;
        this.teachers = teachers;

        let translatedClassName = preTranslate(this.lesDef.className);

        let tags = ExcelRoster.findTags(` ${translatedClassName} ${this.lesDef.location} `, diffSettings.preparedDiffSettings.tagDefs);
        let tagStrings = tags.map(t => t.tag);
        let location = ExcelRoster.findLocation(tagStrings, dko3Data.preparedDko3DiffData.locations);
        if(!location) {
            let tags = ExcelRoster.findTags(ExcelRoster.makeParsable(this.lesDef.panelTitle), diffSettings.preparedDiffSettings.tagDefs);
            let tagStrings = tags.map(t => t.tag);
            location = ExcelRoster.findLocation(tagStrings, dko3Data.preparedDko3DiffData.locations);
        }
        this.location = location ?? "Academie Willem Van Laarstraat, Berchem";
        this.subjects = ExcelRoster.findSubjects(this.lesDef.className, tagStrings, dko3Data);
        this.className = translatedClassName;//todo: Am I sure about this?  origina: this.lesDef.className;
        this.gradeYears = ExcelRoster.findGradeYears(ExcelRoster.makeParsable(this.lesDef.className));
        if(this.gradeYears.length == 0) {
            this.gradeYears = ExcelRoster.getGradeYearsFromTags(tags);
        }
        if(this.gradeYears.length == 0) {
            let newTags = ExcelRoster.findTags(ExcelRoster.makeParsable(lesDef.panelTitle, "leave 'en' alone"), diffSettings.preparedDiffSettings.tagDefs);
            this.gradeYears = ExcelRoster.getGradeYearsFromTags(newTags);
        }
        if(this.gradeYears.length == 0) {
            let newTags = ExcelRoster.findTags(ExcelRoster.makeParsable(lesDef.sectionTitle, "leave 'en' alone"), diffSettings.preparedDiffSettings.tagDefs);
            this.gradeYears = ExcelRoster.getGradeYearsFromTags(newTags);
        }
        if(this.gradeYears.length == 0) {
            let newTags = ExcelRoster.findTags(ExcelRoster.makeParsable(lesDef.pageTitle, "leave 'en' alone"), diffSettings.preparedDiffSettings.tagDefs);
            this.gradeYears = ExcelRoster.getGradeYearsFromTags(newTags);
        }
        this.ignore = false;
        this.dayTimeSlice = new DayTimeSlice(this.day, this.timeSlice);
        this.hash = this.getHash();
    }

    public getHash() {
        return `www:${this.lesDef.className}-${this.lesDef.day}-${TimeSlice.toString(this.timeSlice)}-${this.teachers.join()}-${this.location}`;
    }
}

function tagWwwLes(les: WwwLesDef, dko3DiffData: PreparedDko3DiffData, diffSettings: PreparedDiffSettings) {
    let times = TimeSlice.parseShortTimes(les.timeString);
    let day = toDay(les.day);
    if(!day)
        console.log(`Could not parse day ${les.day}`);

    if(times.length != 2) {
        console.log(`Could not parse time slice ${les.timeString} for class ${les.className}. url: ${les.url}`); //todo: report error i ux
        return null;
    }

    let timeSlice = new TimeSlice(times[0], times[1]);

    let teachers = preTranslate(les.teacher)
        .split(/[\/,&]/g).map(t => findTeacher(t, dko3DiffData.preparedDko3DiffData.teachers))
        .filter(t => t != "");

    return new TaggedWwwLesDef(les, timeSlice, day??"", teachers, dko3DiffData, diffSettings);
}

export interface HtmlText {
    url: string;
    text: string;
}

async function requestWww(urlList: string[]) {
    return sendRequest(Actions.Www, TabType.Main, TabType.Undefined, undefined, {urlList}, "");
}

export async function parseWww(dko3DiffData: PreparedDko3DiffData, diffSettings: PreparedDiffSettings) {
    // let response: ServiceRequest<HtmlText[]> = await requestWww([
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-woord-gevorderden-18",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-2e-graad-kinderen-8-tot-11-jaar",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-1e-graad-kinderen-6-tot-7-jaar",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-2e-graad-jongeren-12-tot-17-jaar",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-3e-graad-klassiek",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-3e-graad-jazz-pop-rock",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-3e-graad-wereldmuziek",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-4e-graad-klassiek",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-4e-graad-jazz-pop-rock-volwassenen-vanaf-18-jaar",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-4e-graad-wereldmuziek",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-musical",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-elektronische-muziek-enkel-de-hoofdschool",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-2e-graad-volwassenen-vanaf-18-jaar",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-2e-graad-kinderen-8-tot-11-jaar-0",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-3e-graad-jongeren-12-tot-en-met-14-jaar",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-woord-jongeren-15-tot-en-met-17-jaar",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-woord-starters-18",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-woord-gevorderden-18",
    //     "https://academieberchem.stedelijkonderwijs.be/uurrooster-3e-4e-graad-songwriting",
    // ]);

    let response: ServiceRequest<HtmlText[]> = await requestWww(diffSettings.preparedDiffSettings.urls);

    let lessen: WwwLesDef[] = [];
    console.log(response);
    for(let html of response.data) {
        lessen = lessen.concat(parseHtml(html));
    }
    console.log(lessen);
    let taggedLessen = lessen
        .map(les => tagWwwLes(les, dko3DiffData, diffSettings))
        .filter(les => les != null);

    let taggedLesMap: Map<string, TaggedWwwLesDef> = new Map();
    for(let taggedLes of taggedLessen) {
        taggedLesMap.set(taggedLes.getHash(), taggedLes);
    }

    console.log(taggedLesMap);
    return taggedLesMap.values();
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
        lessen = lessen.concat(scrapeClassTable(html.url, table, pageTitle));
    }
    return lessen;
}

function scrapeClassTable(url: string, table: HTMLTableElement, pageTitle: string) {
    let panelTitle = "";
    let panelDiv = table.closest("div.card.panel") as HTMLDivElement | null;
    if(panelDiv) {
        let button = panelDiv.querySelector("button") as HTMLButtonElement | null;
        if(button) {
            panelTitle = button.textContent;
        }
    }
    //go up one parent at the time and find the first h2 sibling
    let sectionTitle = "";
    let current = table.parentElement;
    while(true) {
        if(!current)
            break;
        if (current.tagName == "SECTION") // don't go higher.
            break;
        let h2 = current.querySelector("h2");
        if(h2) {
            sectionTitle = h2.textContent;
            break;
        }
        current = current.parentElement;
    }
    pageTitle = pageTitle
        .replaceAll("\n", " ")
        .trim();
    panelTitle = panelTitle
        .replaceAll("\n", " ")
        .trim();

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
            pageTitle,
            sectionTitle,
            panelTitle,
            className,
            day,
            timeString,
            location,
            teacher,
        } satisfies WwwLesDef as WwwLesDef;
    });
    return lessen.filter(les => les != null) as WwwLesDef[];
}
