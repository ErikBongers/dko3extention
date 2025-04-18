import {BlockInfo} from "./convert";
import {createSearchField, distinct, getPageSettings, savePageSettings} from "../globals";
import {combineFilters, createTextRowFilter, filterTable, filterTableRows, RowFilter} from "../filter";
import * as def from "../def";
import {FILTER_INFO_ID, LESSEN_TABLE_ID} from "../def";
import {PageName} from "../gotoState";
import {getDefaultPageSettings, LessenPageState} from "./build";
import {isTrimesterTableVisible} from "./observer";
import {emmet} from "../../libs/Emmeter/html";
import {addMenuItem, setupMenu} from "../menus";
import {scrapeLesInfo, scrapeStudentsCellMeta} from "./scrape";

export function createBlockFilter(filter: (block: BlockInfo) => boolean): BlockInfo[] {
    return BlockInfo.getAllBlocks().filter(filter);
}

export function createRowFilterFromBlockFilter(blocks: BlockInfo[]): RowFilter {
    let ids = distinct(blocks.map(b => b.getIds()).flat());
    return {
        context: {ids},
        rowFilter: function (tr: HTMLTableRowElement, context: any): boolean {
            return context.ids.includes(parseInt(tr.dataset.blockId));
        }
    } as RowFilter;
}

export function createQuerySelectorFilter(selector: string): RowFilter {
    return {
        context: undefined,
        rowFilter: function (tr: HTMLTableRowElement, _context: any): boolean {
            return tr.querySelector(selector) != undefined;
        }
    }
}

export function createInverseFilter(filter: RowFilter): RowFilter {
    return {
        context: filter.context,
        rowFilter: function (tr: HTMLTableRowElement, context: any): boolean {
            return !filter.rowFilter(tr, context);
        }
    };
}

export interface TrimFilterContext {
    filteredBlockIds: string[],
    filteredGroupIds: string[],
    filteredHeaderGroupIds: string[],
}

/*
Bubble up the filter to the group level and then include all the sibling blocks of those groups.
 */
export function createAncestorFilter(rowPreFilter: RowFilter): RowFilter {
    let filteredRows = filterTableRows(def.TRIM_TABLE_ID, rowPreFilter);

    let filteredBlockIds = [...new Set(filteredRows.filter(tr => tr.dataset.blockId !== "groupTitle").map(tr => tr.dataset.blockId))];
    let filteredGroupIds = [...new Set(filteredRows.map(tr => tr.dataset.groupId))];
    //also show all rows of headers that match the text filter.
    let filteredHeaderGroupIds = [...new Set(filteredRows.filter(tr => tr.dataset.blockId === "groupTitle").map(tr => tr.dataset.groupId))];

    function siblingsAndAncestorsFilter(tr: HTMLTableRowElement, context: TrimFilterContext) {
        //display all child rows for the headers that match
        if (context.filteredHeaderGroupIds.includes(tr.dataset.groupId))
            return true;
        //display all siblings of non-header rows, thus the full block
        if (context.filteredBlockIds.includes(tr.dataset.blockId))
            return true;
        //display the ancestor (header) rows of matching non-header rows
        return context.filteredGroupIds.includes(tr.dataset.groupId) && tr.classList.contains("groupHeader");
    }

    return {context: {filteredBlockIds, filteredGroupIds, filteredHeaderGroupIds} as TrimFilterContext, rowFilter: siblingsAndAncestorsFilter};
}

export const TXT_FILTER_ID = "txtFilter";

export function setFilterInfo(text: string) {
    document.getElementById(FILTER_INFO_ID).innerText = text;
}

export function applyFilters() {
    let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
    pageState.searchText = (document.getElementById(TXT_FILTER_ID) as HTMLInputElement).value;
    savePageSettings(pageState);

    let extraFilter: RowFilter = undefined;
    if (isTrimesterTableVisible()) {

        let textPreFilter = createTextRowFilter(pageState.searchText, (tr) => tr.textContent);
        let preFilter = textPreFilter;
        if (pageState.filterOffline) {
            extraFilter = createRowFilterFromBlockFilter(createBlockFilter(b => b.hasSomeOfflineLessen()));
        } else if (pageState.filterOnline) {
            extraFilter = createRowFilterFromBlockFilter(createBlockFilter(b => !b.hasSomeOfflineLessen()))
        } else if (pageState.filterNoTeacher) {
            extraFilter = createRowFilterFromBlockFilter(createBlockFilter(b => b.hasMissingTeachers()));
        } else if (pageState.filterNoMax) {
            extraFilter = createRowFilterFromBlockFilter(createBlockFilter(b => b.hasMissingMax()));
        } else if (pageState.filterFullClass) {
            extraFilter = createRowFilterFromBlockFilter(createBlockFilter(b => b.hasFullClasses()));
        } else if (pageState.filterOnlineAlc) {
            extraFilter = createRowFilterFromBlockFilter(createBlockFilter(b => b.hasOnlineAlcClasses())); //doesn't really make sense for trimesters, but whatever.
        }
        if (extraFilter)
            preFilter = combineFilters(createAncestorFilter(textPreFilter), extraFilter);

        let filter = createAncestorFilter(preFilter);
        filterTable(def.TRIM_TABLE_ID, filter);
    } else { // Filter original table:
        let textFilter = createTextRowFilter(pageState.searchText, (tr) => tr.cells[0].textContent);
        let filter = textFilter;
        if (pageState.filterOffline) {
            extraFilter = createQuerySelectorFilter("td>i.fa-eye-slash");
        } else if (pageState.filterOnline) {
            extraFilter = createInverseFilter(createQuerySelectorFilter("td>i.fa-eye-slash"));
        } else if (pageState.filterNoTeacher) {
            extraFilter = createTextRowFilter("(geen klasleerkracht)", (tr) => tr.cells[0].textContent);
        } else if (pageState.filterNoMax) {
            extraFilter = createTextRowFilter("999", (tr) => tr.cells[1].textContent);
        } else if (pageState.filterFullClass) {
            extraFilter = {
                context: undefined,
                rowFilter(tr: HTMLTableRowElement, context: any): boolean {
                    let scrapeResult = scrapeStudentsCellMeta(tr.cells[1]);
                    return scrapeResult.aantal >= scrapeResult.maxAantal;
                }
            };
        } else if (pageState.filterOnlineAlc) {
             extraFilter = {
                 context: undefined,
                 rowFilter(tr: HTMLTableRowElement, context: any): boolean {
                     let scrapeResult = scrapeLesInfo(tr.cells[0]);
                     return scrapeResult.online && scrapeResult.alc;
                 }
             }
        }

        if (extraFilter)
            filter = combineFilters(textFilter, extraFilter);
        filterTable(LESSEN_TABLE_ID, filter);
    }
    if (pageState.filterOnline) {
        setFilterInfo("Online lessen");
    } else if (pageState.filterOffline) {
        setFilterInfo("Offline lessen");
    } else if (pageState.filterNoTeacher) {
        setFilterInfo("Zonder leraar");
    } else if (pageState.filterNoMax) {
        setFilterInfo("Zonder maximum");
    } else if (pageState.filterFullClass) {
        setFilterInfo("Volle lessen");
    } else if (pageState.filterOnlineAlc) {
        setFilterInfo("Online ALC lessen");
    }

    else {
        setFilterInfo("");
    }
}

export function setExtraFilter(set: (pageState: LessenPageState) => void) {
    let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
    pageState.filterOffline = false;
    pageState.filterOnline = false;
    pageState.filterNoTeacher = false;
    pageState.filterNoMax = false;
    pageState.filterFullClass = false;
    pageState.filterOnlineAlc = false;
    set(pageState);
    savePageSettings(pageState);
    applyFilters();
}

export function addFilterFields() {
    let divButtonNieuweLes = document.querySelector("#lessen_overzicht > div > button");
    if (!document.getElementById(TXT_FILTER_ID)) {
        let pageState = getPageSettings(PageName.Lessen, getDefaultPageSettings()) as LessenPageState;
        let searchField = createSearchField(TXT_FILTER_ID, applyFilters, pageState.searchText);
        divButtonNieuweLes.insertAdjacentElement("afterend", searchField);
        //menu
        let {first: span, last: idiom} = emmet.insertAfter(searchField, 'span.btn-group-sm>button.btn.btn-sm.btn-outline-secondary.ml-2>i.fas.fa-list');
        let menu = setupMenu(span as HTMLElement, idiom.parentElement);
        addMenuItem(menu, "Toon alles", 0, _ => setExtraFilter(_ => {}));
        addMenuItem(menu, "Filter online lessen", 0, _ => setExtraFilter(pageState => pageState.filterOnline = true));
        addMenuItem(menu, "Filter offline lessen", 0, _ => setExtraFilter(pageState => pageState.filterOffline = true));
        addMenuItem(menu, "Lessen zonder leraar", 0, _ => setExtraFilter(pageState => pageState.filterNoTeacher = true));
        addMenuItem(menu, "Lessen zonder maximum", 0, _ => setExtraFilter(pageState => pageState.filterNoMax = true));
        addMenuItem(menu, "Volle lessen", 0, _ => setExtraFilter(pageState => pageState.filterFullClass = true));
        addMenuItem(menu, "Online ALC lessen", 0, _ => setExtraFilter(pageState => pageState.filterOnlineAlc = true));
        emmet.insertAfter(idiom.parentElement, `span#${def.FILTER_INFO_ID}.filterInfo`);
    }

    applyFilters();
}