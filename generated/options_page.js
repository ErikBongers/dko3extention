(function() {

"use strict";

//#region libs/Emmeter/tokenizer.ts
const CLOSING_BRACE = "__CLOSINGBRACE__";
const DOUBLE_QUOTE = "__DOUBLEQUOTE__";
function tokenize(textToTokenize) {
	let tokens = [];
	let txt = textToTokenize.replaceAll("\\}", CLOSING_BRACE).replaceAll("\\\"", DOUBLE_QUOTE);
	let pos = 0;
	let start = pos;
	function pushToken() {
		if (start != pos) tokens.push(txt.substring(start, pos));
		start = pos;
	}
	function getTo(to) {
		pushToken();
		do
			pos++;
		while (pos < txt.length && txt[pos] != to);
		if (pos >= txt.length) throw `Missing '${to}' at matching from pos ${start}.`;
		pos++;
		pushToken();
	}
	function getChar() {
		pushToken();
		pos++;
		pushToken();
	}
	while (pos < txt.length) switch (txt[pos]) {
		case "{":
			getTo("}");
			break;
		case "\"":
			getTo("\"");
			break;
		case "#":
			pushToken();
			pos++;
			break;
		case ">":
		case "+":
		case "[":
		case "]":
		case "(":
		case ")":
		case "*":
		case ".":
		case "=":
			getChar();
			break;
		case " ":
			pushToken();
			start = ++pos;
			break;
		default: pos++;
	}
	pushToken();
	return tokens;
}

//#endregion
//#region libs/Emmeter/html.ts
let emmet = {
	create,
	append,
	insertBefore,
	insertAfter,
	appendChild,
	test: {
		testEmmet,
		tokenize
	}
};
let nested = void 0;
let lastCreated = void 0;
function toSelector(node) {
	if (!("tag" in node)) throw "TODO: not yet implemented.";
	let selector = "";
	if (node.tag) selector += node.tag;
	if (node.id) selector += "#" + node.id;
	if (node.classList.length > 0) selector += "." + node.classList.join(".");
	return selector;
}
function create(text, onIndex, hook) {
	nested = tokenize(text);
	let root = parse();
	let parent = document.querySelector(toSelector(root));
	if ("tag" in root) root = root.child;
	else throw "root should be a single element.";
	buildElement(parent, root, 1, onIndex, hook);
	return {
		root: parent,
		last: lastCreated
	};
}
function append(root, text, onIndex, hook) {
	nested = tokenize(text);
	return parseAndBuild(root, onIndex, hook);
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
	nested = tokenize(text);
	let tempRoot = document.createElement("div");
	let result = parseAndBuild(tempRoot, onIndex, hook);
	let first = void 0;
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
function parseAndBuild(root, onIndex, hook) {
	buildElement(root, parse(), 1, onIndex, hook);
	return {
		root,
		last: lastCreated
	};
}
function testEmmet(text) {
	nested = tokenize(text);
	return parse();
}
function parse() {
	return parsePlus();
}
function parsePlus() {
	let list = [];
	while (true) {
		let el = parseMult();
		if (!el) return list.length === 1 ? list[0] : { list };
		list.push(el);
		if (!match("+")) return list.length === 1 ? list[0] : { list };
	}
}
function parseMult() {
	let el = parseElement();
	if (!el) return el;
	if (match("*")) {
		let count = parseInt(nested.shift());
		return {
			count,
			child: el
		};
	} else return el;
}
function parseElement() {
	let el;
	if (match("(")) {
		el = parsePlus();
		if (!match(")")) throw "Expected ')'";
		return el;
	} else {
		let text = matchStartsWith("{");
		if (text) {
			text = stripStringDelimiters(text);
			return { text };
		} else return parseChildDef();
	}
}
function parseChildDef() {
	let tag = nested.shift();
	let id = void 0;
	let atts = [];
	let classList = [];
	let text = void 0;
	while (nested.length) if (match(".")) {
		let className = nested.shift();
		if (!className) throw "Unexpected end of stream. Class name expected.";
		classList.push(className);
	} else if (match("[")) atts = getAttributes();
	else {
		let token = matchStartsWith("#");
		if (token) id = token.substring(1);
		else {
			let token$1 = matchStartsWith("{");
			if (token$1) text = stripStringDelimiters(token$1);
			else break;
		}
	}
	return {
		tag,
		id,
		atts,
		classList,
		innerText: text,
		child: parseDown()
	};
}
function parseDown() {
	if (match(">")) return parsePlus();
	return void 0;
}
function getAttributes() {
	let tokens = [];
	while (nested.length) {
		let prop = nested.shift();
		if (prop == "]") break;
		tokens.push(prop);
	}
	let attDefs = [];
	while (tokens.length) {
		let name = tokens.shift();
		if (name[0] === ",") throw "Unexpected ',' - don't separate attributes with ','.";
		let eq = tokens.shift();
		let sub = "";
		if (eq === ".") {
			sub = tokens.shift();
			eq = tokens.shift();
		}
		if (eq != "=") throw "Equal sign expected.";
		let value = tokens.shift();
		if (value[0] === "\"") value = stripStringDelimiters(value);
		if (!value) throw "Value expected.";
		attDefs.push({
			name,
			sub,
			value
		});
		if (!tokens.length) break;
	}
	return attDefs;
}
function match(expected) {
	let next = nested.shift();
	if (next === expected) return true;
	if (next) nested.unshift(next);
	return false;
}
function matchStartsWith(expected) {
	let next = nested.shift();
	if (next.startsWith(expected)) return next;
	if (next) nested.unshift(next);
	return void 0;
}
function stripStringDelimiters(text) {
	if (text[0] === "'" || text[0] === "\"" || text[0] === "{") return text.substring(1, text.length - 1);
	return text;
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

//#endregion
//#region typescript/def.ts
const JSON_URL = "https://europe-west1-ebo-tain.cloudfunctions.net/json";
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
		body: JSON.stringify(data),
		keepalive: true
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
	showDebug: false
};
function defineHtmlOptions() {
	defineHtmlOption("showNotAssignedClasses", "checked", "Toon arcering voor niet toegewezen klassikale lessen.", "block1");
	defineHtmlOption("showTableHeaders", "checked", "Toon keuzemenus in tabelhoofding.", "block1");
	defineHtmlOption("markOtherAcademies", "checked", "Toon arcering voor 'andere' academies.", "block1");
	defineHtmlOption("myAcademies", "value", void 0, void 0);
	defineHtmlOption("showDebug", "checked", "Show debug info in console.", "block3");
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