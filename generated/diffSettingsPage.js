(function() {

"use strict";

//#region typescript/messaging.ts
let Actions = /* @__PURE__ */ function(Actions$1) {
	Actions$1["OpenHtmlTab"] = "open_tab";
	Actions$1["RequestTabData"] = "request_tab_data";
	Actions$1["TabData"] = "tab_data";
	Actions$1["GetParentTabId"] = "get_parent_tab_id";
	Actions$1["OpenHoursSettings"] = "open_hours_settings";
	Actions$1["OpenDiffSettings"] = "open_diff_settings";
	Actions$1["HoursSettingsChanged"] = "open_hours_settings_changed";
	Actions$1["DiffSettingsChanged"] = "diff_settings_changed";
	Actions$1["GreetingsFromParent"] = "greetingsFromParent";
	Actions$1["GreetingsFromChild"] = "greetingsFromChild";
	Actions$1["Www"] = "Www";
	return Actions$1;
}({});
let TabType = /* @__PURE__ */ function(TabType$1) {
	TabType$1["Undefined"] = "Undefined";
	TabType$1["Main"] = "Main";
	TabType$1["HoursSettings"] = "HoursSettings";
	TabType$1["DiffSettings"] = "diffSettings";
	TabType$1["Html"] = "Html";
	return TabType$1;
}({});
function sendRequest(action, from, to, toId, data, pageTitle) {
	let req = {
		action,
		data,
		pageTitle,
		senderTabType: from,
		targetTabType: to,
		targetTabId: toId
	};
	return chrome.runtime.sendMessage(req);
}
let DataRequestTypes = /* @__PURE__ */ function(DataRequestTypes$1) {
	DataRequestTypes$1["HoursSettings"] = "HoursSettings";
	DataRequestTypes$1["DiffSettings"] = "DiffSettings";
	DataRequestTypes$1["Html"] = "Html";
	return DataRequestTypes$1;
}({});
async function sendDataRequest(sender, dataType, params) {
	let tab = await chrome.tabs.getCurrent();
	let dataRequestInfo = {
		tabId: tab.id,
		dataType,
		params
	};
	await sendRequest(Actions.RequestTabData, sender, TabType.Undefined, void 0, dataRequestInfo);
}
function createMessageHandler(tabType) {
	let handler$1 = {
		getListener: function() {
			let self = this;
			return async function onMessage(request, _sender, _sendResponse) {
				console.log(`tab received: `, request);
				if (request.targetTabType === tabType) {
					self._onMessageForMyTabType?.(request);
					let tab = await chrome.tabs.getCurrent();
					if (request.targetTabId === tab.id) if (request.action === Actions.TabData && self._onData) self._onData(request);
					else self._onMessageForMe?.(request);
				}
			};
		},
		onMessageForMyTabType: function(callback) {
			this._onMessageForMyTabType = callback;
			return this;
		},
		onMessageForMe: function(callback) {
			this._onMessageForMe = callback;
			return this;
		},
		onData: function(callback) {
			this._onData = callback;
			return this;
		},
		_onMessageForMyTabType: void 0,
		_onMessageForMe: void 0,
		_onData: void 0
	};
	return handler$1;
}

//#endregion
//#region libs/Emmeter/tokenizer/PeekingTokenizer.ts
var PeekingTokenizer = class {
	tokenizer;
	constructor(tokenizer) {
		this.tokenizer = tokenizer;
	}
	next() {
		return this.tokenizer.next();
	}
	peek() {
		let clone = this.tokenizer.clone();
		return clone.next();
	}
};

//#endregion
//#region libs/Emmeter/tokenizer/cursor.ts
var Cursor = class Cursor {
	text;
	currentPos;
	length;
	constructor(text) {
		this.text = text;
		this.length = this.text.length;
		this.currentPos = -1;
	}
	static copy(cursor) {
		let newCursor = new Cursor(cursor.text);
		newCursor.currentPos = cursor.currentPos;
		return newCursor;
	}
	eat(char) {
		if (this.currentPos >= this.length) return false;
		if (this.text[this.currentPos] == char) {
			this.currentPos++;
			return true;
		}
		return false;
	}
	get pos() {
		return this.currentPos;
	}
	get current() {
		if (this.currentPos >= this.length) return "";
		return this.text[this.currentPos];
	}
	next() {
		if (this.currentPos >= this.length) return "";
		this.currentPos++;
		return this.current;
	}
	peek() {
		if (this.currentPos + 1 >= this.length) return "";
		return this.text[this.currentPos + 1];
	}
	getText(pos, length) {
		return this.text.substring(pos, pos + length);
	}
	getTo(endChar) {
		let start = this.currentPos + 1;
		let end = start;
		while (end < this.length && this.text[end] != endChar) end++;
		if (end == this.length) return null;
		this.currentPos = end;
		return {
			start,
			length: this.currentPos - start + 1
		};
	}
	getToNot(notChar) {
		let start = this.currentPos + 1;
		let end = start;
		while (end < this.length && this.text[end] == notChar) end++;
		if (end == this.length) return null;
		if (end == start) return null;
		this.currentPos = end - 1;
		return {
			start,
			length: this.currentPos - start + 1
		};
	}
	getLocation(pos) {
		let line = 1;
		let col = 1;
		for (let i = 0; i < pos; i++) if (this.text[i] == "\n") {
			line++;
			col = 1;
		} else col++;
		return {
			line,
			col
		};
	}
	getLine(pos) {
		let loc = this.getLocation(pos);
		let start = 0;
		let end = this.length;
		for (let i = 0; i < this.length; i++) if (this.text[i] == "\n") if (loc.line > 1) {
			start = i + 1;
			loc.line--;
		} else {
			end = i;
			break;
		}
		return this.text.substring(start, end);
	}
};

//#endregion
//#region libs/Emmeter/tokenizer/indentTokenizer.ts
function getText(token) {
	return token.cursor.getText(token.pos, token.length);
}
var IndentTokenizer = class IndentTokenizer {
	cursor;
	constructor(text) {
		this.cursor = new Cursor(text);
	}
	setCursor(cursor) {
		this.cursor = cursor;
	}
	cloneCursor() {
		return Cursor.copy(this.cursor);
	}
	clone() {
		let theClone = new IndentTokenizer("");
		theClone.setCursor(this.cloneCursor());
		return theClone;
	}
	next() {
		let char = this.cursor.next();
		let found;
		let id = this.eatId(char);
		if (id) return id;
		let num = this.eatInteger(char);
		if (num) return num;
		switch (char) {
			case "": return null;
			case "\n":
				found = this.cursor.getToNot(" ");
				if (found) return {
					type: "INDENT",
					cursor: this.cursor,
					pos: found.start,
					length: found.length
				};
				return null;
			case " ":
				this.skipSpaces();
				return this.next();
			case ">":
			case "+":
			case "[":
			case "]":
			case "(":
			case ")":
			case "*":
			case ".":
			case "=":
			case "#": return {
				type: char,
				cursor: this.cursor,
				pos: this.cursor.pos,
				length: 1
			};
			case "{":
				found = this.cursor.getTo("}");
				if (found) return {
					type: "TEXT",
					cursor: this.cursor,
					pos: found.start,
					length: found.length - 1
				};
				return null;
			case "\"":
				found = this.cursor.getTo("\"");
				if (found) return {
					type: "STRING",
					cursor: this.cursor,
					pos: found.start,
					length: found.length - 1
				};
			default: return {
				type: "UNKNOWN",
				cursor: this.cursor,
				pos: this.cursor.pos,
				length: 1
			};
		}
	}
	eatId(char) {
		let pos = this.cursor.pos;
		if (char.match(/[a-zA-Z\-]/)) {
			while (this.cursor.peek().match(/[a-zA-Z0-9_\-]/)) this.cursor.next();
			return {
				type: "ID",
				cursor: this.cursor,
				pos,
				length: this.cursor.pos - pos + 1
			};
		}
		return null;
	}
	eatInteger(char) {
		let pos = this.cursor.pos;
		if (char.match(/[0-9]/)) {
			while (this.cursor.peek().match(/[0-9]/)) this.cursor.next();
			return {
				type: "NUMBER",
				cursor: this.cursor,
				pos,
				length: this.cursor.pos - pos + 1
			};
		}
		return null;
	}
	getNumberToken() {
		let token = {
			type: "NUMBER",
			cursor: this.cursor,
			pos: this.cursor.pos,
			length: 0
		};
		let start = this.cursor.pos;
		while (this.cursor.peek().match(/[0-9.,]/)) this.cursor.next();
		token.length = this.cursor.pos - start + 1;
		return token;
	}
	skipSpaces() {
		while (this.cursor.peek() == " ") this.cursor.next();
	}
};

//#endregion
//#region libs/Emmeter/tokenizer/FilteredTokenizer.ts
var FilteredTokenizer = class FilteredTokenizer {
	tokenizer;
	exclude;
	constructor(tokenizer, exclude) {
		this.tokenizer = tokenizer;
		this.exclude = exclude;
	}
	next() {
		let token = this.tokenizer.next();
		if (token && !this.exclude(token)) return this.next();
		return token;
	}
	clone() {
		return new FilteredTokenizer(this.tokenizer.clone(), this.exclude);
	}
};

//#endregion
//#region libs/Emmeter/parser.ts
var Parser = class {
	tok;
	constructor(tok) {
		this.tok = tok;
	}
	parse() {
		let res = this.parsePlus(0);
		let next = this.tok.next();
		if (next) this.throwAt(`Unexpected token: ${next.type}`, next);
		return res;
	}
	parsePlus(parentIndent) {
		let list = [];
		while (true) {
			let el = this.parseMult(parentIndent);
			if (!el) return list.length === 1 ? list[0] : { list };
			list.push(el);
			if (!this.match("+")) return list.length === 1 ? list[0] : { list };
			else debugger;
		}
	}
	parseMult(parentIndent) {
		let el = this.parseElementGroup(parentIndent);
		if (!el) return el;
		let starToken = this.match("*");
		if (starToken) {
			let mustBeNumber = this.tok.next();
			if (!mustBeNumber) this.throwAt("Number expecting after multiplier symbol '*'", starToken);
			let count = parseInt(getText(mustBeNumber));
			return {
				count,
				child: el
			};
		} else return el;
	}
	parseElementGroup(parentIndent) {
		let el;
		if (this.match("(")) {
			el = this.parsePlus(parentIndent);
			if (!this.match(")")) this.throwAt("Expected ')'", this.tok.peek());
			return el;
		} else {
			let textToken = this.match("TEXT");
			if (textToken) {
				let text = getText(textToken);
				return { text };
			} else return this.parseElement(parentIndent);
		}
	}
	parseElement(parentIndent) {
		let tag = this.tok.next();
		let id = void 0;
		let atts = [];
		let classList = [];
		let innerText = void 0;
		if (!tag) this.throwAt("Unexpected end of stream. Tag expected.", tag);
		while (this.tok.peek()) {
			if (this.match(".")) {
				let className = this.tok.next();
				if (!className) this.throwAt("Unexpected end of stream. Class name expected.", className);
				classList.push(getText(className));
				continue;
			}
			if (this.match("[")) {
				atts = this.parseAttributes();
				continue;
			}
			if (this.match("#")) {
				let idToken = this.tok.next();
				if (!idToken) this.throwAt("Unexpected end of stream. ID expected.", idToken);
				id = getText(idToken);
				continue;
			}
			let textToken = this.match("TEXT");
			if (textToken) {
				innerText = getText(textToken);
				continue;
			}
			break;
		}
		return {
			tag: getText(tag),
			id,
			atts,
			classList,
			innerText,
			child: this.parseDown(parentIndent)
		};
	}
	parseDown(parentIndent) {
		if (this.match(">")) return this.parsePlus(parentIndent);
		return void 0;
	}
	parseAttributes() {
		let attDefs = [];
		while (true) {
			if (this.match("]")) break;
			let att = this.parseAttribute();
			if (att) attDefs.push(att);
			else break;
		}
		return attDefs;
	}
	parseAttribute() {
		let nameToken = this.tok.next();
		if (!nameToken) return null;
		let name = getText(nameToken);
		if (name[0] === ",") this.throwAt("Unexpected ',' - don't separate attributes with ','.", nameToken);
		let eq = this.tok.next();
		if (!eq) this.throwAt("Unexpected end of stream. '=' expected.", eq);
		let subToken;
		let sub = "";
		if (eq.type === ".") {
			subToken = this.tok.next();
			if (subToken) sub = getText(subToken);
			eq = this.tok.next();
		}
		if (eq?.type != "=") this.throwAt("Equal sign expected.", eq);
		let valueToken = this.tok.next();
		if (!valueToken) this.throwAt("Value expected", valueToken);
		if (valueToken.type != "STRING" && valueToken.type != "NUMBER") this.throwAt(`Value should be STRING or NUMBER. Found ${valueToken.type}.`, valueToken);
		let value = getText(valueToken);
		if (value[0] === "\"") value = this.stripStringDelimiters(value);
		return {
			name,
			sub,
			value
		};
	}
	match(expected) {
		let peek = this.tok.peek();
		if (peek?.type == expected) return this.tok.next();
		return false;
	}
	stripStringDelimiters(text) {
		if (text[0] === "'" || text[0] === "\"" || text[0] === "{") return text.substring(1, text.length - 1);
		return text;
	}
	printLocation(token) {
		let { line, col } = token.cursor.getLocation(token.pos);
		return `line ${line}, col ${col}\n${token.cursor.getLine(token.pos)}\n${" ".repeat(col - 1)}^`;
	}
	throwAt(mesagee, token) {
		if (token) throw new Error(`${mesagee}\n  at ${this.printLocation(token)}`);
		else throw new Error(`${mesagee}\n  at EOF`);
	}
};

//#endregion
//#region libs/Emmeter/html.ts
let emmet = {
	create2,
	append,
	insertBefore,
	insertAfter,
	appendChild
};
let lastCreated = void 0;
function create2(text, onIndex, hook) {
	let tempDiv = document.createElement("div");
	let result = appendChild(tempDiv, text, onIndex, hook);
	let first = result.first;
	first.remove();
	return first;
}
function append(root, text, onIndex, hook) {
	return parseAndBuild(text, root, onIndex, hook);
}
function insertBefore(target, text, onIndex, hook) {
	return insertAt("beforebegin", target, text, onIndex, hook);
}
function insertAfter(target, text, onIndex, hook) {
	return insertAt("afterend", target, text, onIndex, hook);
}
function appendChild(parent, text, onIndex, hook) {
	return insertAt("beforeend", parent, text, onIndex, hook);
}
function insertAt(position, target, text, onIndex, hook) {
	let tempRoot = document.createElement("div");
	let result = parseAndBuild(text, tempRoot, onIndex, hook);
	let first = null;
	let insertPos = target;
	let children = [...tempRoot.childNodes];
	for (let child of children) if (!first) if (child.nodeType === Node.TEXT_NODE) first = insertPos = insertAdjacentText(target, position, child.wholeText);
	else first = insertPos = target.insertAdjacentElement(position, child);
	else if (child.nodeType === Node.TEXT_NODE) insertPos = insertPos.parentElement.insertBefore(document.createTextNode(child.wholeText), insertPos.nextSibling);
	else insertPos = insertPos.parentElement.insertBefore(child, insertPos.nextSibling);
	return {
		target,
		first,
		last: result.last
	};
}
function insertAdjacentText(target, position, text) {
	switch (position) {
		case "beforebegin": return target.parentElement.insertBefore(document.createTextNode(text), target);
		case "afterbegin": return target.insertBefore(document.createTextNode(text), target.firstChild);
		case "beforeend": return target.appendChild(document.createTextNode(text));
		case "afterend": return target.parentElement.appendChild(document.createTextNode(text));
	}
}
function parseAndBuild(text, root, onIndex, hook) {
	let tok = new PeekingTokenizer(new FilteredTokenizer(new IndentTokenizer(text), (t) => t.type != "INDENT"));
	let parser = new Parser(tok);
	buildElement(root, parser.parse(), 1, onIndex, hook);
	return {
		root,
		last: lastCreated
	};
}
function buildElement(parent, el, index, onIndex, hook) {
	if ("tag" in el) {
		let created = createElement(parent, el, index, onIndex, hook);
		if (el.child) buildElement(created, el.child, index, onIndex, hook);
		return;
	}
	if ("list" in el) for (let def of el.list) buildElement(parent, def, index, onIndex, hook);
	if ("count" in el) for (let i = 0; i < el.count; i++) buildElement(parent, el.child, i, onIndex, hook);
	if ("text" in el) {
		parent.appendChild(document.createTextNode(addIndex(el.text, index, onIndex)));
		return;
	}
}
function addIndex(text, index, onIndex) {
	if (onIndex) {
		let result = onIndex(index);
		text = text.replace("$$", result);
	}
	return text.replace("$", (index + 1).toString());
}
function createElement(parent, def, index, onIndex, hook) {
	let el = parent.appendChild(document.createElement(def.tag));
	if (def.id) el.id = addIndex(def.id, index, onIndex);
	for (let clazz of def.classList) el.classList.add(addIndex(clazz, index, onIndex));
	for (let att of def.atts) if (att.sub) el[addIndex(att.name, index, onIndex)][addIndex(att.sub, index, onIndex)] = addIndex(att.value, index, onIndex);
	else el.setAttribute(addIndex(att.name, index, onIndex), addIndex(att.value, index, onIndex));
	if (def.innerText) el.appendChild(document.createTextNode(addIndex(def.innerText, index, onIndex)));
	lastCreated = el;
	if (hook) hook(el);
	return el;
}

//#endregion
//#region typescript/def.ts
const CLOUD_BASE_URL = "https://europe-west1-ebo-tain.cloudfunctions.net/";
const JSON_URL = CLOUD_BASE_URL + "json";
const CHECK_STATUS_URL = CLOUD_BASE_URL + "check-status";
const SETUP_HOURS_TITLE_ID = "setupTitle";

//#endregion
//#region typescript/webComponents/inputWithSpaces.ts
const template = document.createElement("template");
template.innerHTML = `
    <div class="container">
        <div class="foreground">
            <input type="text"/>
        </div>
        <div id="background" class="background">
        </div>
    </div>
    `;
const css = `
    /* noinspection CssUnusedSymbol*/
    .container {
        background-color: rgba(100, 150, 255, 0.1);
        position: relative;
        font-family: inherit; /* font of container MUST be the same as the input*/
        font-size: 1em;
        input {
            background: transparent;
            font-family: inherit; /* font of container MUST be the same as the input*/
            font-size: 1em;
            border: none;
            padding: 0;
            margin: 0;
            width: 100%;
            box-sizing: border-box;
        }
        /* noinspection CssUnusedSymbol*/
        .foreground {
            padding: 0;
        }
        /* noinspection CssUnusedSymbol*/
        .background {
            position: absolute;
            inset-inline-start: 0;
            inset-block-start: 0;
            z-index: -1;
            background: rgba(100, 150, 255, 0.1); /* this is the text background color. Should be set by user.*/
            border: 1px solid transparent;
            padding: 0;

        }
        /* noinspection CssUnusedSymbol*/
        span.spaces {
            /*
            background-color: red; // can be set with ::part(space) selector.
        
            */
        }
        /* noinspection CssUnusedSymbol*/
        span.text {
            color: transparent;
        }
    }
    `;
function loadWebComponent() {
	class InputWithSpaces extends HTMLElement {
		static get observedAttributes() {
			return ["value"];
		}
		input;
		#shadow;
		background;
		value = "";
		constructor() {
			super();
			this.#shadow = this.attachShadow({ mode: "closed" });
			let cssStyleSheet = new CSSStyleSheet();
			cssStyleSheet.replaceSync(css);
			this.#shadow.adoptedStyleSheets = [cssStyleSheet];
			this.#shadow.append(template.content.cloneNode(true));
			this.input = this.#shadow.querySelector("input");
			this.background = this.#shadow.querySelector("div.background");
		}
		connectedCallback() {
			this.onContentComplete();
		}
		attributeChangedCallback(name, _oldValue, newValue) {
			if (name === "value") {
				this.input.value = newValue;
				this.onInput();
			}
		}
		onContentComplete() {
			this.input.addEventListener("input", (_) => {
				this.onInput();
				this.setAttribute("value", this.input.value);
			});
		}
		onInput() {
			this.value = this.input.value;
			let stringArray = this.input.value.split(/(\s+)/);
			let stringArray2 = stringArray.filter((slice) => slice);
			this.background.innerHTML = "";
			for (let slice of stringArray2) {
				let span = this.background.appendChild(document.createElement("span"));
				if (slice.trim() === "") {
					span.classList.add("spaces");
					span.part.add("space");
				} else span.classList.add("text");
				span.innerHTML = slice.replaceAll(" ", "&nbsp;");
			}
		}
	}
	customElements.define("input-with-spaces", InputWithSpaces);
}
function registerWebComponent() {
	document.addEventListener("DOMContentLoaded", () => {
		loadWebComponent();
	});
}

//#endregion
//#region typescript/cloud.ts
async function uploadJson(fileName, data) {
	let res = await fetch(JSON_URL + "?fileName=" + fileName, {
		method: "POST",
		body: JSON.stringify(data)
	});
	return await res.text();
}
function getDiffSettingsFileName(academie, schoolYear) {
	return `Dko3/Uurroosters/${academie}/${academie}_${schoolYear}_diff_settings.json`;
}
async function uploadDiffSettings(academie, schoolYear, diffSettings) {
	await uploadJson(getDiffSettingsFileName(academie, schoolYear), diffSettings);
}

//#endregion
//#region typescript/globals.ts
let Schoolyear;
(function(_Schoolyear) {
	function getSelectElement() {
		let selects = document.querySelectorAll("select");
		return Array.from(selects).filter((element) => element.id.includes("schooljaar")).pop() ?? null;
	}
	_Schoolyear.getSelectElement = getSelectElement;
	function getHighestAvailable() {
		let el = getSelectElement();
		if (!el) return void 0;
		return Array.from(el.querySelectorAll("option")).map((option) => option.value).sort().pop();
	}
	_Schoolyear.getHighestAvailable = getHighestAvailable;
	function findInPage() {
		let el = getSelectElement();
		if (el) return el.value;
		el = document.querySelector("div.alert-info");
		if (el) {
			let txt = el.textContent;
			let rx = /[sS]chooljaar *[=:][\s\u00A0]*(\d{4}-\d{4})/gm;
			let res = rx.exec(txt);
			if (res) return res[1];
		}
		el = document.querySelector("div.btn-toolbar");
		if (el) {
			let txt = el.textContent;
			let rx = /[sS]chooljaar *[=:]*[\s\u00A0]*(\d{4}-\d{4})/gm;
			let res = rx.exec(txt);
			if (res) return res[1];
		}
		throw "Cannot find schoolyear in page.";
	}
	_Schoolyear.findInPage = findInPage;
	function calculateCurrent() {
		let now = new Date();
		let year = now.getFullYear();
		let month = now.getMonth();
		if (month < 8) return year - 1;
		return year;
	}
	_Schoolyear.calculateCurrent = calculateCurrent;
	function calculateSetupYear() {
		let now = new Date();
		let year = now.getFullYear();
		let month = now.getMonth();
		if (month < 3) return year - 1;
		return year;
	}
	_Schoolyear.calculateSetupYear = calculateSetupYear;
	function toFullString(startYear) {
		return `${startYear}-${startYear + 1}`;
	}
	_Schoolyear.toFullString = toFullString;
	function toShortString(startYear) {
		return `${startYear % 1e3}-${startYear % 1e3 + 1}`;
	}
	_Schoolyear.toShortString = toShortString;
	function toNumbers(schoolyearString) {
		let parts = schoolyearString.split("-").map((s) => parseInt(s));
		return {
			startYear: parts[0],
			endYear: parts[1]
		};
	}
	_Schoolyear.toNumbers = toNumbers;
})(Schoolyear || (Schoolyear = {}));
function rangeGenerator(start, stop, step = 1) {
	return Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step);
}
function range(startAt, upTo) {
	if (upTo > startAt) return [...Array(upTo - startAt).keys()].map((n) => n + startAt);
	else return [...Array(startAt - upTo).keys()].reverse().map((n) => n + upTo + 1);
}

//#endregion
//#region typescript/table/tableSort.ts
let defaultValueFunc = (td) => td.innerText;
function getDefaultValueFuncs(table) {
	let columnCount = table.tHead.rows[0].cells.length;
	return range(0, columnCount).map((_) => defaultValueFunc);
}
function makeTableSortable(table, valueFuncs) {
	let actualValueFuncs = valueFuncs ?? getDefaultValueFuncs(table);
	Array.from(table.tHead.children[0].children).forEach((colHeader) => {
		colHeader.onclick = (ev) => {
			reSortTableByColumn2(ev, table, actualValueFuncs);
		};
	});
}
function reSortTableByColumn2(ev, table, valueFuncs) {
	let header = table.tHead.children[0].children[getColumnIndex(ev)];
	let wasAscending = header.classList.contains("sortAscending");
	let columnIndex = getColumnIndex(ev);
	sortTableByColumn(table, columnIndex, wasAscending, valueFuncs[columnIndex]);
}
function sortTableByColumn(table, index, descending, valueFunc) {
	let header = table.tHead.children[0].children[index];
	let rows = Array.from(table.tBodies[0].rows);
	for (let thead of table.tHead.children[0].children) thead.classList.remove("sortAscending", "sortDescending");
	let cmpFunc = cmpAlpha;
	if (isColumnProbablyNumeric(table, index, valueFunc)) cmpFunc = cmpNumber;
	else if (isColumnProbablyDate(table, index, valueFunc)) cmpFunc = cmpDate;
	try {
		sortRows(cmpFunc, header, rows, index, descending, valueFunc);
	} catch (e) {
		console.error(e);
		if (cmpFunc !== cmpAlpha) sortRows(cmpAlpha, header, rows, index, descending, valueFunc);
	}
	rows.forEach((row) => table.tBodies[0].appendChild(row));
}
function getColumnIndex(ev) {
	let td = ev.target;
	if (td.tagName !== "TD") td = td.closest("TH");
	return Array.prototype.indexOf.call(td.parentElement.children, td);
}
function isColumnProbablyNumeric(table, index, valueFunc) {
	let rows = Array.from(table.tBodies[0].rows);
	const MAX_SAMPLES = 100;
	let samples = rangeGenerator(0, rows.length, rows.length > MAX_SAMPLES ? rows.length / MAX_SAMPLES : 1).map((float) => Math.floor(float));
	return !samples.map((rowIndex) => rows[rowIndex]).some((row) => {
		let value = valueFunc(row.children[index]);
		return isNaN(Number(value));
	});
}
function sortRows(cmpFunction, header, rows, index, descending, valueFunc) {
	let cmpDirectionalFunction;
	if (descending) {
		cmpDirectionalFunction = (a, b) => cmpFunction(b.cells[index], a.cells[index], valueFunc);
		header.classList.add("sortDescending");
	} else {
		cmpDirectionalFunction = (a, b) => cmpFunction(a.cells[index], b.cells[index], valueFunc);
		header.classList.add("sortAscending");
	}
	rows.sort((a, b) => cmpDirectionalFunction(a, b));
}
function cmpAlpha(a, b, valueFunc) {
	return valueFunc(a).localeCompare(valueFunc(b));
}
function cmpDate(a, b, valueFunc) {
	return normalizeDate(valueFunc(a)).localeCompare(normalizeDate(valueFunc(b)));
}
function normalizeDate(date) {
	let dateParts = date.split("-");
	return dateParts[2] + dateParts[1] + dateParts[0];
}
function cmpNumber(a, b) {
	let res = Number(a.innerText) - Number(b.innerText);
	if (isNaN(res)) throw new Error();
	return res;
}
function isColumnProbablyDate(table, index, valueFunc) {
	let rows = Array.from(table.tBodies[0].rows);
	return stringToDate(valueFunc(rows[0].cells[index]));
}
function stringToDate(text) {
	let reDate = /^(\d\d)[-\/](\d\d)[-\/](\d\d\d\d)/;
	let matches = text.match(reDate);
	if (!matches) return void 0;
	return new Date(matches[3] + "-" + matches[2] + "/" + matches[1]);
}

//#endregion
//#region typescript/tabs.ts
var Tabs = class {
	tabDefs;
	tabs;
	beforeTabSwitch;
	constructor(parent, tabDefs, beforeTabSwitch) {
		this.tabDefs = tabDefs;
		this.beforeTabSwitch = beforeTabSwitch ?? null;
		this.tabs = emmet.appendChild(parent, "div.tabs").first;
		for (let tabDef of tabDefs) {
			let button = emmet.appendChild(this.tabs, `
            button#${tabDef.btnId}.naked.hand.tab.notSelected[data-tab-id="${tabDef.tabId}"]
        `).first;
			if (typeof tabDef.btnContent == "string") button.innerHTML = tabDef.btnContent;
			else button.appendChild(tabDef.btnContent);
		}
		this.addNavigation();
	}
	switch(to) {
		let btn;
		if (typeof to == "number") btn = document.getElementById(this.tabDefs[to].btnId);
		else btn = to;
		let tabId = btn.dataset.tabId;
		let tabs = btn.parentElement;
		tabs.querySelectorAll(".tab").forEach((tab) => {
			tab.classList.add("notSelected");
			document.getElementById(tab.dataset.tabId).style.display = "none";
		});
		btn.classList.remove("notSelected");
		document.getElementById(tabId).style.display = "block";
	}
	addNavigation() {
		document.querySelectorAll(".tabs > button.tab").forEach((btn) => btn.addEventListener("click", (ev) => {
			let button = ev.currentTarget;
			if (this.beforeTabSwitch?.(button, button.dataset.tabId) != "cancel") this.switch(ev.currentTarget);
		}));
	}
};

//#endregion
//#region typescript/closeBeforeSavePreventer.ts
var CloseBeforeSavePreventer = class {
	hasDataChanged = false;
	isDataUploading = false;
	uploadCallback;
	saveIntervalMillis;
	constructor(uploadCallback, saveInterval) {
		this.uploadCallback = uploadCallback;
		this.saveIntervalMillis = saveInterval;
		setInterval(() => {
			this.checkAndSave();
		}, this.saveIntervalMillis);
		window.addEventListener("beforeunload", (ev) => {
			if (this.hasDataChanged || this.isDataUploading) ev.preventDefault();
		});
	}
	checkAndSave() {
		if (this.hasDataChanged) {
			this.hasDataChanged = false;
			this.isDataUploading = true;
			this.uploadCallback().then(() => this.isDataUploading = false);
		}
	}
	setDataChanged() {
		this.hasDataChanged = true;
	}
};

//#endregion
//#region typescript/roster_diff/diffSettingsPage.ts
let handler = createMessageHandler(TabType.DiffSettings);
registerWebComponent();
chrome.runtime.onMessage.addListener(handler.getListener());
document.addEventListener("DOMContentLoaded", onDocumentLoaded);
let dataUploader = new CloseBeforeSavePreventer(saveIfDataChanged, 1e3);
handler.onMessageForMyTabType((msg) => {
	console.log("diff setup page: message for my tab type: ", msg);
}).onMessageForMe((msg) => {
	console.log("diff setup page: message for me: ", msg);
}).onData(onData);
function addTranslationRow(tagDef, tbody) {
	let text = `tr>` + buildLabeledDecoratedTextField("Vind", tagDef.searchString, "trnsFind") + "+" + buildLabeledDecoratedTextField("tag met", tagDef.tag, "trnsTag") + "+" + buildLabeledDecoratedTextField("gr+jaren", tagDef.gradeYears?.toString() ?? "", "trnsGradeYears") + `+ div.flexRow>(
                label.flexGrow[for="trnsIsClassName"]{is klasnaam:}+
                input#trnsIsClassName[type="checkbox" ${tagDef.isClassName ? "checked=\"checked\"" : ""} name="trnsIsClassName"]
            )
           `;
	let tr = emmet.appendChild(tbody, text).first;
	addDeleteButton(tr);
	let chkIsClassName = tr.querySelector("#trnsIsClassName");
	chkIsClassName.addEventListener("change", (_) => {
		dataUploader.setDataChanged();
	});
}
function addPreTranslationRow(preTrans, tbody) {
	let text = `tr>` + buildLabeledDecoratedTextField("Als", preTrans.trigger, "trnsTrigger") + "+" + buildLabeledDecoratedTextField("vind", preTrans.search, "trnsSearch") + "+" + buildLabeledDecoratedTextField("vervang door", preTrans.replace, "trnsReplace") + "+" + buildLabeledDecoratedTextField("", preTrans.dscr, "trnsDscr");
	let tr = emmet.appendChild(tbody, text).first;
	addDeleteButton(tr);
}
function buildLabeledDecoratedTextField(label, value, id) {
	let attrValue = value ? ` value="${value}"` : "";
	return `(td.label>{${label}})+(td>input-with-spaces#${id}[type="text"${attrValue}])`;
}
function addDeleteButton(tr) {
	let bucket = `button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
	emmet.appendChild(tr, `td>${bucket}`);
	tr.querySelectorAll("button.deleteRow").forEach((btn) => btn.addEventListener("click", deleteTableRow));
}
function addIgnoresRow(ignore, tbody) {
	let text = `tr>` + buildField(ignore, "trnsIgnore");
	let tr = emmet.appendChild(tbody, text).first;
	let bucket = `button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
	emmet.appendChild(tr, `td>${bucket}`);
	tbody.querySelectorAll("button.deleteRow").forEach((btn) => btn.addEventListener("click", deleteTableRow));
	function buildField(value, id) {
		let attrValue = value ? ` value="${value}"` : "";
		return `(td>input-with-spaces#${id}[type="text"${attrValue}])`;
	}
}
function fillTagDefTable(diffSettings) {
	let container = document.getElementById("tagDefsContainer");
	let table = container.querySelector("table");
	let tbody = container.querySelector("table>tbody");
	tbody.innerHTML = "";
	for (let tagDef of diffSettings.tagDefs) addTranslationRow(tagDef, tbody);
	let valueFuncs = getDefaultValueFuncs(table);
	valueFuncs[1] = getInputWithSpacesValue;
	valueFuncs[3] = getInputWithSpacesValue;
	valueFuncs[5] = getInputWithSpacesValue;
	makeTableSortable(table, valueFuncs);
}
function fillPreTransTable(diffSettings) {
	let container = document.getElementById("tagPreTransContainer");
	let table = container.querySelector("table");
	let tbody = container.querySelector("table>tbody");
	tbody.innerHTML = "";
	if (!diffSettings.preTranslations) diffSettings.preTranslations = [];
	for (let preTrans of diffSettings.preTranslations) addPreTranslationRow(preTrans, tbody);
	let valueFuncs = getDefaultValueFuncs(table);
	valueFuncs[1] = getInputWithSpacesValue;
	valueFuncs[3] = getInputWithSpacesValue;
	valueFuncs[5] = getInputWithSpacesValue;
	makeTableSortable(table, valueFuncs);
}
let getInputWithSpacesValue = (td) => {
	return td.querySelector("input-with-spaces").value;
};
function fillIgnoresTable(diffSettings) {
	let container = document.getElementById("ignoresContainer");
	let tbody = container.querySelector("table>tbody");
	tbody.innerHTML = "";
	for (let ignore of diffSettings.ignoreList) addIgnoresRow(ignore, tbody);
	document.querySelectorAll("#tagDefsContainer button.deleteRow").forEach((btn) => btn.addEventListener("click", deleteTableRow));
}
function fillUrls(diffSettings) {
	let txtUrls = document.getElementById("txtWebPages");
	txtUrls.value = (diffSettings.urls ?? []).join("\n");
}
function deleteTableRow(ev) {
	let btn = ev.target;
	btn.closest("tr").remove();
	dataUploader.setDataChanged();
}
async function onData(request) {
	let title = "Uurrooster tags voor schooljaar " + request.data.schoolYear;
	document.title = title;
	document.getElementById(
		// searchText
		// tag
		// grades+years
		// searchText
		// tag
		// grades+years
		SETUP_HOURS_TITLE_ID
).innerHTML = title;
	document.querySelector("button").addEventListener("click", async () => {
		await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, void 0, "Hullo! Fly safe!");
	});
	globalSetup = request.data;
	fillTagDefTable(request.data);
	fillPreTransTable(request.data);
	fillIgnoresTable(request.data);
	fillUrls(request.data);
	document.querySelectorAll("tbody").forEach((tbody) => tbody.addEventListener("change", (_) => {
		dataUploader.setDataChanged();
	}));
	document.querySelectorAll("tbody").forEach((el) => el.addEventListener("input", function(_) {
		dataUploader.setDataChanged();
	}));
	document.getElementById("btnNewTranslationRow").addEventListener("click", function(_) {
		let def = {
			tag: "",
			searchString: "",
			gradeYears: ""
		};
		addTranslationRow(def, document.querySelector("#tagDefsContainer tbody"));
		dataUploader.setDataChanged();
	});
	document.getElementById("btnNewPreTranslationRow").addEventListener("click", function(_) {
		let def = {
			trigger: "",
			search: "",
			replace: "",
			dscr: ""
		};
		addPreTranslationRow(def, document.querySelector("#tagPreTransContainer tbody"));
		dataUploader.setDataChanged();
	});
	document.getElementById("btnNewIgnoresRow").addEventListener("click", function(_) {
		let ignore = "";
		addIgnoresRow(ignore, document.querySelector("#ignoresContainer tbody"));
		dataUploader.setDataChanged();
	});
	let txtUrls = document.getElementById("txtWebPages");
	txtUrls.addEventListener("input", (_) => {
		dataUploader.setDataChanged();
	});
	txtUrls.addEventListener("blur", (_) => {
		dataUploader.setDataChanged();
	});
}
let globalSetup = void 0;
function scrapeTagDefs() {
	let rows = document.querySelectorAll("#tagDefsContainer>table>tbody>tr");
	return [...rows].map((row) => {
		let gradeYears = row.querySelector("#trnsGradeYears").value.trim();
		let isClassName = row.querySelector("#trnsIsClassName").checked;
		return {
			searchString: row.querySelector("#trnsFind").value.toLowerCase(),
			tag: row.querySelector("#trnsTag").value,
			gradeYears,
			isClassName
		};
	});
}
function scrapeIgnores() {
	let rows = document.querySelectorAll("#ignoresContainer>table>tbody>tr");
	return [...rows].map((row) => row.querySelector("#trnsIgnore").value);
}
function scrapePreTranslations() {
	let rows = document.querySelectorAll("#tagPreTransContainer>table>tbody>tr");
	return [...rows].map((row) => {
		let trigger = row.querySelector("#trnsTrigger").value.trim();
		let search = row.querySelector("#trnsSearch").value.trim();
		let replace = row.querySelector("#trnsReplace").value.trim();
		let dscr = row.querySelector("#trnsDscr").value.trim();
		return {
			trigger,
			search,
			replace,
			dscr
		};
	});
}
async function saveIfDataChanged() {
	if (!globalSetup) return;
	let txtUrls = document.getElementById("txtWebPages");
	let urls = txtUrls.value.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
	let setupData = {
		version: 1,
		academie: globalSetup.academie,
		schoolYear: globalSetup.schoolYear,
		tagDefs: scrapeTagDefs(),
		ignoreList: scrapeIgnores(),
		preTranslations: scrapePreTranslations(),
		urls
	};
	await uploadDiffSettings(globalSetup.academie, globalSetup.schoolYear, setupData);
	await sendRequest(Actions.DiffSettingsChanged, TabType.DiffSettings, TabType.Main, void 0, setupData).then((_) => {});
}
async function onDocumentLoaded(_) {
	let tabs = new Tabs(document.querySelector("div.tabsContainer"), [
		{
			btnId: "btnTabTagDefs",
			tabId: "tabTagDefs",
			btnContent: "Tags"
		},
		{
			btnId: "btnTabIgnores",
			tabId: "tabIgnores",
			btnContent: "Negeer"
		},
		{
			btnId: "btnTabPreTranslations",
			tabId: "tabPreTranslations",
			btnContent: "Voor-vertalingen"
		},
		{
			btnId: "btnTabWebPages",
			tabId: "tabWebPages",
			btnContent: "Web pagina's"
		}
	]);
	tabs.switch(0);
	let params = new URLSearchParams(document.location.search);
	let schoolYear = params.get("schoolyear");
	let academie = params.get("academie");
	await sendDataRequest(TabType.DiffSettings, DataRequestTypes.DiffSettings, {
		academie,
		schoolYear
	});
}

//#endregion
})();
//# sourceMappingURL=diffSettingsPage.js.map