export class TableDef {
    constructor(requiredHeaderLabels, rowScraper) {
        this.requiredHeaderLabels = requiredHeaderLabels;
        this.rowScraper = rowScraper;
        this.template = undefined;
        this.rows = undefined;
        this.headerIndices = undefined;
    }

    setTemplateAndCheck(template) {
        this.template = template;
        this.rows = template.content.querySelectorAll("tbody > tr");
        this.headerIndices = TableDef.getHeaderIndices(template);
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
            .forEach((header, index) =>
                headerIndices.set(header.textContent, index));
        return headerIndices;
    }

    hasAllHeaders() {
        return this.requiredHeaderLabels.every((name) => this.headerIndices.has(name))
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

    readPage(text, collection) {
        const template = document.createElement('template');
        template.innerHTML = text;

        if(!this.setTemplateAndCheck(template))
            throw("Cannot build table object - required columns missing");

        let rows = template.content.querySelectorAll("tbody > tr");
        this.forEachRow(collection, this.rowScraper);
        return rows.length;
    }

}