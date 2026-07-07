(function() {

"use strict";

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
const GLOBAL_SETTINGS_FILENAME = "global_settings.json";

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
//#region typescript/plugin_options/options.ts
const options = {
	myAcademies: "",
	showNotAssignedClasses: true,
	showTableHeaders: true,
	markOtherAcademies: true,
	showDebug: false,
	stripCommasOnPaste: false,
	reorderStudentName: false,
	allowDeleteNotif: false,
	showPluginMenu: false
};
function defineHtmlOptions() {
	defineHtmlOption("showNotAssignedClasses", "checked", "Toon arcering voor niet toegewezen klassikale lessen.", "block1");
	defineHtmlOption("showTableHeaders", "checked", "Toon keuzemenus in tabelhoofding.", "block1");
	defineHtmlOption("showPluginMenu", "checked", "Toon plugin menu.", "block1");
	defineHtmlOption("stripCommasOnPaste", "checked", "Strip commas when pasting in a search field.", "block1");
	defineHtmlOption("reorderStudentName", "checked", "Toon naam leerling als voornaam + achternaam", "block1");
	defineHtmlOption("markOtherAcademies", "checked", "Toon arcering voor 'andere' academies.", "block1");
	defineHtmlOption("myAcademies", "value", "", null);
	defineHtmlOption("showDebug", "checked", "Toon debug info in console.", "block3");
	defineHtmlOption("allowDeleteNotif", "checked", "Laat verwijderen van berichten toe...", "block3");
}
let htmlOptionDefs = new Map();
function defineHtmlOption(id, property, label, blockId) {
	htmlOptionDefs.set(id, {
		id,
		property,
		label,
		blockId
	});
}
let globalSettings = { globalHide: false };
function getGlobalSettings() {
	return globalSettings;
}
async function saveGlobalSettings(globalSettings$1) {
	return cloud.json.upload(GLOBAL_SETTINGS_FILENAME, globalSettings$1);
}
async function fetchGlobalSettings(defaultSettings) {
	return await cloud.json.fetch(GLOBAL_SETTINGS_FILENAME).catch((err) => {
		console.log(err);
		return defaultSettings;
	});
}

//#endregion
//#region typescript/plugin_options/options_page.ts
defineHtmlOptions();
document.body.addEventListener("keydown", onKeyDown);
function onKeyDown(ev) {
	if (ev.key === "h" && ev.altKey && !ev.shiftKey && !ev.ctrlKey) {
		ev.preventDefault();
		let answer = prompt("Verberg plugin bij iedereen?");
		saveHide(answer === "hide").then(() => saveOptionsFromGui());
	}
}
async function saveHide(hide) {
	let globalSettings$1 = await fetchGlobalSettings(getGlobalSettings());
	globalSettings$1.globalHide = hide;
	await saveGlobalSettings(globalSettings$1);
	console.log("Global settings saved.");
}
const saveOptionsFromGui = () => {
	let newOptions = { touched: Date.now() };
	for (let option of htmlOptionDefs.values()) newOptions[option.id] = document.getElementById(option.id)[option.property];
	chrome.storage.sync.set(newOptions, () => {
		const status = document.getElementById("status");
		status.textContent = "Opties bewaard.";
		setTimeout(() => {
			status.textContent = "";
		}, 750);
	});
};
async function restoreOptionsToGui() {
	let items = await chrome.storage.sync.get(null);
	Object.assign(options, items);
	for (const [key, value] of Object.entries(options)) {
		let optionDef = htmlOptionDefs.get(key);
		if (!optionDef) continue;
		document.getElementById(optionDef.id)[optionDef.property] = value;
	}
}
async function fillOptionsInGui() {
	for (let optiondDef of htmlOptionDefs.values()) {
		if (!optiondDef.blockId) continue;
		let block = document.getElementById(optiondDef.blockId);
		emmet.appendChild(block, `label>input#${optiondDef.id}[type="checkbox"]+{${optiondDef.label}}`);
	}
	await restoreOptionsToGui();
}
document.addEventListener("DOMContentLoaded", fillOptionsInGui);
document.getElementById("save").addEventListener("click", saveOptionsFromGui);

//#endregion
})();
//# sourceMappingURL=options_page.js.map