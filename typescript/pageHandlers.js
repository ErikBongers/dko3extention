export class RowPageHandler {
    constructor(onRow, onBeforeLoading) {
        this.onRow = onRow;
        this.onBeforeLoading = onBeforeLoading;
        this.template = undefined;
        this.rows = undefined;
        this.currentRow = undefined;
    }

    onPage(tableDef, text, collection, offset) {
        const template = document.createElement('template');
        template.innerHTML = text;

        this.rows = template.content.querySelectorAll("tbody > tr");
        let index = 0;
        for (let row of this.rows) {
            this.currentRow = row;
            if (!this.onRow(tableDef, row, collection, offset, index))
                return;
            index++;
        }
        return this.rows.length;
    }

    onLoaded(tableDef) {
        tableDef.cacheRows(tableDef.calculateChecksum? tableDef.calculateChecksum() : "");
    }
}

/**
 * PageHandler with named column labels.\
 * Params are:
 * @description
 *      * requiredHeaderLabels: array with labels of required columns.
 *      * onRow: function(rowObject, collection): a row handler that mainly provides a param `rowObject`, which has a member getColumnText(columnLabel)
 * @implements PageHandler: which requires member `onPage()`
 */
export class NamedCellPageHandler {
    constructor(requiredHeaderLabels, onRow, onBeforeLoading) {
        this.requiredHeaderLabels = requiredHeaderLabels;
        this.onRow = onRow;
        this.onBeforeLoading = onBeforeLoading;
        this.template = undefined;
        this.rows = undefined;
        this.headerIndices = undefined;
        this.currentRow = undefined;
    }

    onPage(tableDef, text, collection, offset) {
        const template = document.createElement('template');
        template.innerHTML = text;

        if (!this.setTemplateAndCheck(template))
            throw ("Cannot build table object - required columns missing");

        this.rows = template.content.querySelectorAll("tbody > tr");
        this.forEachRow(tableDef, collection);
        return this.rows.length;
    }

    setTemplateAndCheck(template) {
        this.template = template;
        this.rows = template.content.querySelectorAll("tbody > tr");
        this.headerIndices = NamedCellPageHandler.getHeaderIndices(template);
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

    forEachRow(tableDef, collection) {
        for (let row of this.rows) {
            this.currentRow = row;
            let rowObject = {
                tr: row,
                getColumnText: (label) => this.#getColumnText(label)
            };
            if (!this.onRow(tableDef, rowObject, collection))
                return;
        }
    }

    onLoaded(tableDef) {
        tableDef.cacheRows(tableDef.calculateChecksum? tableDef.calculateChecksum() : "");
    }
}