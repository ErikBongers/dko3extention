var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _NamedCellPageHandler_instances, _NamedCellPageHandler_getColumnText;
export class RowObject {
}
export class RowPageHandler {
    constructor(onRow, onLoaded, onBeforeLoading, getData) {
        this.onRow = onRow;
        this.onBeforeLoading = onBeforeLoading;
        this.getData = getData;
        this.onLoaded = onLoaded;
        this.rows = undefined;
    }
    onPage(tableDef, text, collection, offset) {
        const template = document.createElement('template');
        template.innerHTML = text;
        this.rows = template.content.querySelectorAll("tbody > tr");
        let index = 0;
        for (let row of this.rows) {
            let rowObject = new RowObject();
            rowObject.tr = row;
            rowObject.offset = offset;
            rowObject.index = index;
            if (!this.onRow(tableDef, rowObject, collection))
                return;
            index++;
        }
        return this.rows.length;
    }
}
export class PrebuildTableHandler {
    constructor(onLoaded, onBeforeLoading, getData) {
        this.onBeforeLoading = onBeforeLoading;
        this.getData = getData;
        this.onLoaded = onLoaded;
    }
    onPage(tableDef, text, collection, offset) {
        if (offset === 0) {
            this.template = document.createElement('template');
            this.template.innerHTML = text;
            return this.template.content.querySelectorAll("tbody > tr").length;
        }
        let template = document.createElement('template');
        template.innerHTML = text;
        let rows = template.content.querySelectorAll("tbody > tr");
        this.template.content.querySelector("tbody").append(...rows);
        return rows.length;
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
    constructor(requiredHeaderLabels, onRow, getData, onLoaded, onBeforeLoading) {
        _NamedCellPageHandler_instances.add(this);
        this.requiredHeaderLabels = requiredHeaderLabels;
        this.onRow = onRow;
        this.onBeforeLoading = onBeforeLoading;
        this.onLoaded = onLoaded;
        this.getData = getData;
        this.rows = undefined;
        this.headerIndices = undefined;
        this.currentRow = undefined;
    }
    onPage(tableDef, text, collection, _offset) {
        const template = document.createElement('template');
        template.innerHTML = text;
        if (!this.setTemplateAndCheck(template))
            throw ("Cannot build table object - required columns missing");
        this.rows = template.content.querySelectorAll("tbody > tr");
        this.forEachRow(tableDef, collection);
        return this.rows.length;
    }
    setTemplateAndCheck(template) {
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
    forEachRow(tableDef, collection) {
        for (let row of this.rows) {
            this.currentRow = row;
            let rowObject = new RowObject();
            rowObject.tr = row;
            rowObject.getColumnText = (label) => __classPrivateFieldGet(this, _NamedCellPageHandler_instances, "m", _NamedCellPageHandler_getColumnText).call(this, label);
            if (!this.onRow(tableDef, rowObject, collection))
                return;
        }
    }
}
_NamedCellPageHandler_instances = new WeakSet(), _NamedCellPageHandler_getColumnText = function _NamedCellPageHandler_getColumnText(label) {
    return this.currentRow.children[this.headerIndices.get(label)].textContent;
};
