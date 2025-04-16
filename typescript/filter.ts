export interface RowFilter {
    context: any,
    rowFilter: (tr: HTMLTableRowElement, context: any) => boolean
}

export function combineFilters(f1: RowFilter, f2: RowFilter) {
    return <RowFilter>{
        context: {f1, f2},
        rowFilter: function (tr: HTMLTableRowElement, _context: any): boolean {
            if (!f1.rowFilter(tr, f1.context))
                return false;
            return f2.rowFilter(tr, f2.context);
        }
    }
} /*
Creates a text filter where a comma is interpreted as OR and a plus sign as AND.
 */
export function createTextRowFilter(searchText: string, getRowSearchText: (tr: HTMLTableRowElement) => string): RowFilter {
    let search_OR_list = searchText.split(',').map(txt => txt.trim());
    let context = {
        search_OR_list,
        getRowSearchText
    };
    let rowFilter = function (tr: HTMLTableRowElement, context: any) {
        for (let search of context.search_OR_list) {
            let rowText = context.getRowSearchText(tr);
            if (match_AND_expression(search, rowText))
                return true;
        }
        return false;
    };
    return {context, rowFilter};
}

/**
 * Try to match a filter expression of type "string1+string2", where both strings need to be present.
 * @param searchText
 * @param rowText
 * @return true if all strings match
 */
function match_AND_expression(searchText: string, rowText: string) {
    let search_AND_list = searchText.split('+').map(txt => txt.trim());
    for (let search of search_AND_list) {
        let caseText = rowText;
        if (search === search.toLowerCase()) { //if all lowercase, make the search case-insensitive
            caseText = rowText.toLowerCase();
        }
        if (!caseText.includes(search))
            return false;
    }
    return true;
}

export function filterTableRows(table: (HTMLTableElement | string), rowFilter: RowFilter) {
    if (typeof table === "string")
        table = document.getElementById(table) as HTMLTableElement;
    return Array.from(table.tBodies[0].rows)
        .filter(tr => rowFilter.rowFilter(tr, rowFilter.context));
}

export function filterTable(table: (HTMLTableElement | string), rowFilter: RowFilter) {
    if (typeof table === "string")
        table = document.getElementById(table) as HTMLTableElement;
    for (let tr of table.tBodies[0].rows) {
        tr.style.visibility = "collapse";
        tr.style.borderColor = "transparent"; //get rid of some risidual border lines
    }
    for (let tr of filterTableRows(table, rowFilter)) {
        if (!tr.dataset.keepHidden) {
            tr.style.visibility = "visible";
            tr.style.borderColor = "";
        }
    }
}