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
//#region typescript/cloud.ts
let cloud = { json: {
	fetch: fetchJson,
	upload: uploadJson
} };
async function fetchJson(fileName) {
	return fetch(JSON_URL + "?fileName=" + fileName, { method: "GET" }).then((res) => res.json());
}
async function uploadJson(fileName, data) {
	let res = await fetch(JSON_URL + "?fileName=" + fileName, {
		method: "POST",
		body: JSON.stringify(data)
	});
	return await res.text();
}

//#endregion
//#region typescript/werklijst/hoursSettings.ts
function mapHourSettings(hourSettings) {
	let mapped = { ...hourSettings };
	mapped.subjectsMap = new Map(hourSettings.subjects.map((s) => [s.name, s]));
	return mapped;
}
let defaultInstruments = [
	{
		checked: true,
		name: "Aaaaa",
		alias: "bbb",
		stillValid: true
	},
	{
		checked: true,
		name: "Accordeon",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Altfluit",
		alias: "Dwarsfluit",
		stillValid: false
	},
	{
		checked: true,
		name: "Althoorn",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Altklarinet",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Altsaxofoon",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Altsaxofoon (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Altviool",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Baglama/saz (wereldmuziek)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Bariton",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Baritonsaxofoon",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Baritonsaxofoon (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Basfluit",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Basgitaar (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Basklarinet",
		alias: "Klarinet",
		stillValid: false
	},
	{
		checked: true,
		name: "Bastrombone",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Bastuba",
		alias: "Koper",
		stillValid: false
	},
	{
		checked: true,
		name: "Bugel",
		alias: "Koper",
		stillValid: false
	},
	{
		checked: true,
		name: "Cello",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Contrabas (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Contrabas (klassiek)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Dwarsfluit",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Engelse hoorn",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Eufonium",
		alias: "Koper",
		stillValid: false
	},
	{
		checked: true,
		name: "Fagot",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Gitaar",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Gitaar (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Harp",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Hobo",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Hoorn",
		alias: "Koper",
		stillValid: false
	},
	{
		checked: true,
		name: "Keyboard (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Klarinet",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Kornet",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Orgel",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Piano",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Piano (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Pianolab",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Piccolo",
		alias: "Dwarsfluit",
		stillValid: false
	},
	{
		checked: true,
		name: "Slagwerk",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Slagwerk (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Sopraansaxofoon",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Sopraansaxofoon (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Tenorsaxofoon",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Tenorsaxofoon (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Trombone",
		alias: "Koper",
		stillValid: false
	},
	{
		checked: true,
		name: "Trompet",
		alias: "Koper",
		stillValid: false
	},
	{
		checked: true,
		name: "Trompet (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Ud (wereldmuziek)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Viool",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Zang",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Zang (jazz pop rock)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Zang (musical 2e graad)",
		alias: "",
		stillValid: false
	},
	{
		checked: true,
		name: "Zang (musical)",
		alias: "",
		stillValid: false
	}
];
let defaultInstrumentsMap = new Map();
defaultInstruments.forEach((i) => defaultInstrumentsMap.set(i.name, i));
function createTeacherHoursFileName(schoolyear) {
	return "teacherHoursSetup_" + schoolyear + ".json";
}
async function saveHourSettings(hoursSetup) {
	let fileName = createTeacherHoursFileName(hoursSetup.schoolyear);
	return cloud.json.upload(fileName, hoursSetup);
}

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
//#region typescript/teacherHoursSetup.ts
let handler = createMessageHandler(TabType.HoursSettings);
registerWebComponent();
chrome.runtime.onMessage.addListener(handler.getListener());
document.addEventListener("DOMContentLoaded", onDocumentLoaded);
handler.onMessageForMyTabType((msg) => {
	console.log("message for my tab type: ", msg);
}).onMessageForMe((msg) => {
	console.log("message for me: ", msg);
}).onData(onData);
function fillSubjectsTable(dko3Setup) {
	let container = document.getElementById("subjectsContainer");
	let tbody = container.querySelector("table>tbody");
	tbody.innerHTML = "";
	for (let vak of dko3Setup.subjects) {
		let validClass = "";
		let bucket = "";
		if (!vak.stillValid) {
			validClass = ".invalid";
			bucket = `+button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
		}
		let valueAttribute = "";
		if (vak.alias) valueAttribute = ` value="${vak.alias}"`;
		let checkedAttribute = "";
		if (vak.checked) checkedAttribute = ` checked="checked"`;
		emmet.appendChild(tbody, `tr>(td>input[type="checkbox" ${checkedAttribute}])+(td${validClass}>({${vak.name}}${bucket}))+td>input[type="text" ${valueAttribute}]`);
	}
	document.querySelectorAll("#subjectsContainer button.deleteRow").forEach((btn) => btn.addEventListener("click", deleteTableRow));
}
function addTranslationRow(trns, tbody) {
	let text = `tr>` + buildField("Vind", trns.find, "trnsFind") + "+" + buildField("vervang door", trns.replace, "trnsReplace") + "+" + buildField("prefix", trns.prefix, "trnsPrefix") + "+" + buildField("suffix", trns.suffix, "trnsSuffix");
	let tr = emmet.appendChild(tbody, text).first;
	let up = `button.moveUp.naked>img[src="${chrome.runtime.getURL("images/up-arrow.svg")}"]`;
	let down = `button.moveDown.naked>img.upSideDown[src="${chrome.runtime.getURL("images/up-arrow.svg")}"]`;
	let bucket = `button.deleteRow.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
	emmet.appendChild(tr, `(td>${up})+(td>${down})+(td>${bucket})`);
	tbody.querySelectorAll("button.deleteRow").forEach((btn) => btn.addEventListener("click", deleteTableRow));
	function buildField(label, value, id) {
		let attrValue = value ? ` value="${value}"` : "";
		return `(td>{${label}})+(td>input-with-spaces#${id}[type="text"${attrValue}])`;
	}
}
function fillTranslationsTable(cloudData) {
	let container = document.getElementById("translationsContainer");
	let tbody = container.querySelector("table>tbody");
	tbody.innerHTML = "";
	for (let trns of cloudData.translations) addTranslationRow(trns, tbody);
	document.querySelectorAll("button.moveUp").forEach((btn) => btn.addEventListener("click", (ev) => {
		let btn$1 = ev.target;
		let row = btn$1.closest("tr");
		let prevRow = row.previousElementSibling;
		row.parentElement.insertBefore(row, prevRow);
		hasTableChanged = true;
	}));
	document.querySelectorAll("button.moveDown").forEach((btn) => btn.addEventListener("click", (ev) => {
		let btn$1 = ev.target;
		let row = btn$1.closest("tr");
		let nextRow = row.nextElementSibling;
		row.parentElement.insertBefore(nextRow, row);
		hasTableChanged = true;
	}));
	document.querySelectorAll("#translationsContainer button.deleteRow").forEach((btn) => btn.addEventListener("click", deleteTableRow));
}
function fillGradeYearsTable(cloudData) {
	let container = document.getElementById("gradeYearsContainer");
	let tbody = container.querySelector("table>tbody");
	tbody.innerHTML = "";
	for (let gradeYear of cloudData.gradeYears) {
		let checkedAttribute = "";
		if (gradeYear.checked) checkedAttribute = ` checked="checked"`;
		emmet.appendChild(tbody, `tr>(td>input[type="checkbox" ${checkedAttribute}])+(td>({${gradeYear.gradeYear}}))+td>input[type="text" value=${gradeYear.studentCount}]`);
	}
}
function deleteTableRow(ev) {
	let btn = ev.target;
	btn.closest("tr").remove();
	hasTableChanged = true;
}
async function onData(request) {
	console.log("onData: ", request);
	let title = "Lerarenuren setup voor schooljaar " + request.data.schoolyear;
	document.title = title;
	document.getElementById(
		//todo: validate input
		//todo: replace with general function and test.
		SETUP_HOURS_TITLE_ID
).innerHTML = title;
	document.querySelector("button").addEventListener("click", async () => {
		await sendRequest(Actions.GreetingsFromChild, TabType.Undefined, TabType.Main, void 0, "Hullo! Fly safe!");
	});
	let dko3Setup = mapHourSettings(request.data);
	globalSetup = dko3Setup;
	fillSubjectsTable(dko3Setup);
	fillTranslationsTable(dko3Setup);
	fillGradeYearsTable(dko3Setup);
	document.querySelectorAll("tbody").forEach((tbody) => tbody.addEventListener("change", (_) => {
		hasTableChanged = true;
	}));
	document.querySelectorAll("tbody").forEach((el) => el.addEventListener("input", function(_) {
		hasTableChanged = true;
	}));
	document.getElementById("btnNewTranslationRow").addEventListener("click", function(_) {
		let def = {
			find: "",
			replace: "",
			prefix: "",
			suffix: ""
		};
		addTranslationRow(def, document.querySelector("#translationsContainer tbody"));
		hasTableChanged = true;
	});
}
let globalSetup = void 0;
let hasTableChanged = false;
setInterval(() => {
	if (globalSetup) onCheckTableChanged(globalSetup);
}, 1e3);
function scrapeSubjects() {
	let rows = document.querySelectorAll("#subjectsContainer>table>tbody>tr");
	return [...rows].map((row) => {
		return {
			checked: row.cells[0].querySelector("input:checked") !== null,
			name: row.cells[1].textContent,
			alias: row.cells[2].querySelector("input").value,
			stillValid: !row.cells[1].classList.contains("invalid")
		};
	});
}
function scrapeGradeYears() {
	let rows = document.querySelectorAll("#gradeYearsContainer>table>tbody>tr");
	return [...rows].map((row) => {
		return {
			checked: row.cells[0].querySelector("input:checked") !== null,
			gradeYear: row.cells[1].textContent,
			studentCount: parseInt(row.cells[2].querySelector("input").value)
		};
	});
}
function scrapeTranslations() {
	let rows = document.querySelectorAll("#translationsContainer>table>tbody>tr");
	return [...rows].map((row) => {
		return {
			find: row.querySelector("#trnsFind").value,
			replace: row.querySelector("#trnsReplace").value,
			prefix: row.querySelector("#trnsPrefix").value,
			suffix: row.querySelector("#trnsSuffix").value
		};
	});
}
function onCheckTableChanged(dko3Setup) {
	if (!hasTableChanged) return;
	let setupData = {
		version: 1,
		schoolyear: dko3Setup.schoolyear,
		subjects: scrapeSubjects(),
		translations: scrapeTranslations(),
		gradeYears: scrapeGradeYears()
	};
	hasTableChanged = false;
	saveHourSettings(setupData).then((_) => {
		sendRequest(Actions.HoursSettingsChanged, TabType.HoursSettings, TabType.Main, void 0, setupData).then((_$1) => {});
	});
}
window.onbeforeunload = () => {
	if (globalSetup) onCheckTableChanged(globalSetup);
};
async function onDocumentLoaded(_) {
	let tabs = new Tabs(document.querySelector("div.tabsContainer"), [
		{
			btnId: "btnTabSubjects",
			tabId: "tabSubjects",
			btnContent: "Geselecteerde vakken"
		},
		{
			btnId: "btnTabTranslations",
			tabId: "tabTranslations",
			btnContent: "Bewerkingen"
		},
		{
			btnId: "btnTabGradeYears",
			tabId: "tabGradeYears",
			btnContent: "Leerlingen per les"
		}
	]);
	tabs.switch(0);
	document.querySelectorAll(".tabs > button.tab").forEach((btn) => btn.addEventListener("click", (ev) => {
		switch (ev.target.id) {
			case "btnTabSubjects":
				tabs.switch(ev.target);
				break;
			case "btnTabTranslations":
				tabs.switch(ev.target);
				break;
			case "btnTabGradeYears":
				tabs.switch(ev.target);
				break;
		}
	}));
	let params = new URLSearchParams(document.location.search);
	let schoolYear = params.get("schoolyear");
	await sendDataRequest(TabType.HoursSettings, DataRequestTypes.HoursSettings, { schoolYear });
}

//#endregion
})();
//# sourceMappingURL=teacherHoursSetup.js.map