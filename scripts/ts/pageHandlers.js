export class RowObject {
}
export class RowPageHandler {
    constructor(onRow, onLoaded, onBeforeLoading) {
        this.onPage = (tableDef, _text, collection, offset, _template, rows) => {
            if (!this.onRow)
                return;
            let index = 0;
            for (let row of rows) {
                let rowObject = new RowObject();
                rowObject.tr = row;
                rowObject.offset = offset;
                rowObject.index = index;
                if (!this.onRow(tableDef, rowObject, collection))
                    return;
                index++;
            }
        };
        this.onRow = onRow;
        this.onBeforeLoading = onBeforeLoading;
        this.onLoaded = onLoaded;
    }
}
export class SimpleTableHandler {
    constructor(onLoaded, onBeforeLoading) {
        this.onBeforeLoading = onBeforeLoading;
        this.onLoaded = onLoaded;
        this.onPage = undefined;
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
    constructor(requiredHeaderLabels, onLoaded) {
        this.onPage = (_tableDef, _text, _collection, offset, template, _rows) => {
            if (offset === 0) {
                if (!this.setTemplateAndCheck(template))
                    throw ("Cannot build table object - required columns missing");
            }
        };
        this.requiredHeaderLabels = requiredHeaderLabels;
        this.onLoaded = onLoaded;
        this.headerIndices = undefined;
    }
    setTemplateAndCheck(template) {
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
            }
            else {
                headerIndices.set(label, index);
            }
        });
        return headerIndices;
    }
    hasAllHeaders() {
        return this.requiredHeaderLabels.every((label) => this.hasHeader(label));
    }
    hasHeader(label) {
        return this.headerIndices.has(label);
    }
    getColumnText(tr, label) {
        return tr.children[this.headerIndices.get(label)].textContent;
    }
}
//# sourceMappingURL=pageHandlers.js.map