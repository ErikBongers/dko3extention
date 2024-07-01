export class TableDef {
    constructor(orgTable, buildFetchUrl, pageHandler) {
        this.orgTable = orgTable;
        this.buildFetchUrl = buildFetchUrl;
        this.pageHandler = pageHandler;
    }

    onPage(text, collection, offset) {
        return this.pageHandler.onPage(text, collection, offset);
    }
}

/**
 * PageHandler to convert a table.\
 * Params are:
 * @description
 *      * requiredHeaderLabels: array with labels of required columns.
 *      * rowScraper: function(rowObject, collection): a row handler that mainly provides a param `rowObject`, which has a member getColumnText(columnLabel)
 * @implements PageHandler: which requires member `onPage()`
 */
export class ConverterPageHandler {
    constructor(requiredHeaderLabels, rowScraper) {
        this.requiredHeaderLabels = requiredHeaderLabels;
        this.rowScraper = rowScraper;
        this.template = undefined;
        this.rows = undefined;
        this.headerIndices = undefined;
        this.currentRow = undefined;
    }

    setTemplateAndCheck(template) {
        this.template = template;
        this.rows = template.content.querySelectorAll("tbody > tr");
        this.headerIndices = ConverterPageHandler.getHeaderIndices(template);
        if (!this.hasAllHeaders()) {
            let labelString = this.requiredHeaderLabels
                .map((label) => "\"" + label.toUpperCase() + "\"")
                .join(", ");
            alert(`Voeg velden ${labelString} toe.`);
            return false;
        }
        return true;
    }

    static getHeaderIndices(template) {
        let headers = template.content.querySelectorAll("thead th");

        let headerIndices = new Map();
        Array.from(headers)
            .forEach((header, index) => {
                let label = header.textContent;
                if (label.startsWith("e-mailadressen")) {
                    headerIndices.set("e-mailadressen", index);
                } else {
                    headerIndices.set(label, index);
                }
            });
        return headerIndices;
    }

    hasAllHeaders() {
        return this.requiredHeaderLabels.every((label) => this.hasHeader(label))
    }

    hasHeader(label) {
        return this.headerIndices.has(label);
    }

    #getColumnText(label) {
        return this.currentRow.children[this.headerIndices.get(label)].textContent;
    }

    forEachRow(collection, doRow) {
        for (let row of this.rows) {
            this.currentRow = row;
            let rowObject = {
                tr: row,
                getColumnText: (label) => this.#getColumnText(label),
                tableDef: this
            };
            if (!doRow(rowObject, collection))
                return;
        }
    }

    onPage(text, collection, offset) {
        const template = document.createElement('template');
        template.innerHTML = text;

        if(!this.setTemplateAndCheck(template))
            throw("Cannot build table object - required columns missing");

        let rows = template.content.querySelectorAll("tbody > tr");
        this.forEachRow(collection, this.rowScraper);
        return rows.length;
    }
}