(function(default_items) {

"use strict";
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
default_items = __toESM(default_items);

//#region typescript/def.ts
const COPY_AGAIN = "copy_again";
const PROGRESS_BAR_ID = "progressBarFetch";
const UREN_PREV_BTN_ID = "prefillInstrButton";
const UREN_PREV_SETUP_BTN_ID = "prefillInstrSetupButton";
const UREN_NEXT_BTN_ID = "prefillInstrButtonNext";
const MAIL_BTN_ID = "mailButton";
const DOWNLOAD_TABLE_BTN_ID = "downloadTableButton";
const COPY_TABLE_BTN_ID = "copyTableButton";
const LESSEN_OVERZICHT_ID = "lessen_overzicht";
const TRIM_BUTTON_ID = "moduleButton";
const COUNT_BUTTON_ID = "fetchAllButton";
const FULL_CLASS_BUTTON_ID = "fullClassButton";
const TRIM_TABLE_ID = "trimesterTable";
const COUNT_TABLE_ID = "werklijst_uren";
const TRIM_DIV_ID = "trimesterDiv";
const JSON_URL = "https://europe-west1-ebo-tain.cloudfunctions.net/json";
const INFO_CONTAINER_ID = "dp3p_infoContainer";
const INFO_CACHE_ID = "dp3p_cacheInfo";
const INFO_TEMP_ID = "dp3_tempInfo";
const INFO_EXTRA_ID = "dp3_extraInfo";
const AANW_LIST = "aanwezighedenList";
const GLOBAL_SETTINGS_FILENAME = "global_settings.json";
const CACHE_DATE_SUFFIX = "__date";
const POWER_QUERY_ID = "savedPowerQuery";
const STORAGE_GOTO_STATE_KEY = "gotoState";
const STORAGE_PAGE_SETTINGS_KEY_PREFIX = "pageSettings_";
const UREN_TABLE_STATE_NAME = "__uren__";
const CAN_SORT = "canSort";
const NO_MENU = "noMenu";
const LESSEN_TABLE_ID = "table_lessen_resultaat_tabel";
const FILTER_INFO_ID = "filterInfo";
const GLOBAL_COMMAND_BUFFER_KEY = "globalCmdBuffer";

//#endregion
//#region libs/Emmeter/tokenizer.ts
const CLOSING_BRACE = "__CLOSINGBRACE__";
const DOUBLE_QUOTE = "__DOUBLEQUOTE__";
const NBSP = 160;
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
	let list$1 = [];
	while (true) {
		let el = parseMult();
		if (!el) return list$1.length === 1 ? list$1[0] : { list: list$1 };
		list$1.push(el);
		if (!match("+")) return list$1.length === 1 ? list$1[0] : { list: list$1 };
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
	showDebug: false
};
let globalSettings = { globalHide: false };
function getGlobalSettings() {
	return globalSettings;
}
function setGlobalSetting(settings) {
	globalSettings = settings;
}
async function fetchGlobalSettings(defaultSettings) {
	return await cloud.json.fetch(GLOBAL_SETTINGS_FILENAME).catch((err) => {
		console.log(err);
		return defaultSettings;
	});
}

//#endregion
//#region typescript/globals.ts
let observers = [];
let settingsObservers = [];
function db3(message) {
	if (options?.showDebug) {
		console.log(message);
		console.log(Error().stack.split("\n")[2]);
	}
}
function createValidId(id) {
	return id.replaceAll(" ", "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\W/g, "");
}
function registerObserver(observer) {
	observers.push(observer);
	if (observers.length > 20) console.error("Too many observers!");
}
function registerSettingsObserver(observer) {
	settingsObservers.push(observer);
	if (settingsObservers.length > 20) console.error("Too many settingsObservers!");
}
function setButtonHighlighted(buttonId, show) {
	if (show) document.getElementById(buttonId).classList.add("toggled");
	else document.getElementById(buttonId).classList.remove("toggled");
}
function addButton$1(targetElement, buttonId, title, clickFunction, imageId, classList, text = "", where = "beforebegin") {
	let button = document.getElementById(buttonId);
	if (button === null) {
		const button$1 = document.createElement("button");
		button$1.classList.add("btn", ...classList);
		button$1.id = buttonId;
		button$1.style.marginTop = "0";
		button$1.onclick = clickFunction;
		button$1.title = title;
		if (text) {
			let span = document.createElement("span");
			button$1.appendChild(span);
			span.innerText = text;
		}
		const buttonContent = document.createElement("i");
		button$1.appendChild(buttonContent);
		if (imageId) buttonContent.classList.add("fas", imageId);
		targetElement.insertAdjacentElement(where, button$1);
	}
}
function getSchooljaarSelectElement() {
	let selects = document.querySelectorAll("select");
	return Array.from(selects).filter((element) => element.id.includes("schooljaar")).pop();
}
function getHighestSchooljaarAvailable() {
	let el = getSchooljaarSelectElement();
	if (!el) return void 0;
	return Array.from(el.querySelectorAll("option")).map((option) => option.value).sort().pop();
}
function findSchooljaar() {
	let el = getSchooljaarSelectElement();
	if (el) return el.value;
	el = document.querySelector("div.alert-primary");
	return el.textContent.match(/schooljaar *= (\d{4}-\d{4})*/)[1];
}
function calculateSchooljaar() {
	let now = new Date();
	let year = now.getFullYear();
	let month = now.getMonth();
	if (month < 8) return year - 1;
	return year;
}
function createSchoolyearString(startYear) {
	return `${startYear}-${startYear + 1}`;
}
function createShortSchoolyearString(startYear) {
	return `${startYear % 1e3}-${startYear % 1e3 + 1}`;
}
function getUserAndSchoolName() {
	let footer = document.querySelector("body > main > div.row > div.col-auto.mr-auto > small");
	const reInstrument = /.*Je bent aangemeld als (.*)\s@\s(.*)\./;
	const match$1 = footer.textContent.match(reInstrument);
	if (match$1?.length !== 3) throw new Error(`Could not process footer text "${footer.textContent}"`);
	let userName = match$1[1];
	let schoolName = match$1[2];
	return {
		userName,
		schoolName
	};
}
function getSchoolIdString() {
	let { schoolName } = getUserAndSchoolName();
	schoolName = schoolName.replace("Academie ", "").replace("Muziek", "M").replace("Woord", "W").toLowerCase();
	return createValidId(schoolName);
}
function millisToString(duration) {
	let seconds = Math.floor(duration / 1e3 % 60);
	let minutes = Math.floor(duration / (1e3 * 60) % 60);
	let hours = Math.floor(duration / (1e3 * 60 * 60) % 24);
	let days = Math.floor(duration / (1e3 * 60 * 60 * 24));
	if (days > 0) return days + (days === 1 ? " dag" : " dagen");
	else if (hours > 0) return hours + " uur";
	else if (minutes > 0) return minutes + (minutes === 1 ? " minuut" : " minuten");
	else if (seconds > 0) return seconds + " seconden";
	else return "";
}
function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}
function isAlphaNumeric(str) {
	if (str.length > 1) return false;
	let code;
	let i;
	let len;
	for (i = 0, len = str.length; i < len; i++) {
		code = str.charCodeAt(i);
		if (!(code > 47 && code < 58) && !(code > 64 && code < 91) && !(code > 96 && code < 123)) return false;
	}
	return true;
}
function rangeGenerator(start, stop, step = 1) {
	return Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step);
}
function createSearchField(id, onSearchInput$1, value) {
	let input = document.createElement("input");
	input.type = "text";
	input.id = id;
	input.classList.add("tableFilter");
	input.oninput = onSearchInput$1;
	input.value = value;
	input.placeholder = "filter";
	let span = document.createElement("span");
	span.classList.add("searchButton");
	span.appendChild(input);
	let { first: clearButton } = emmet.appendChild(span, `button>img[src="${chrome.runtime.getURL("images/circle-xmark-regular.svg")}"`);
	clearButton.onclick = () => {
		input.value = "";
		input.oninput(void 0);
		input.focus();
	};
	return span;
}
function getBothToolbars() {
	let navigationBars = document.querySelectorAll("div.datatable-navigation-toolbar");
	if (navigationBars.length < 2) return void 0;
	return navigationBars;
}
function addTableNavigationButton(navigationBars, btnId, title, onClick, fontIconId) {
	addButton$1(navigationBars[0].lastElementChild, btnId, title, onClick, fontIconId, ["btn-secondary"], "", "afterend");
	return true;
}
function distinct(array) {
	return [...new Set(array)];
}
async function fetchStudentsSearch(search) {
	return fetch("/view.php?args=zoeken?zoek=" + encodeURIComponent(search)).then((response) => response.text()).then((_text) => fetch("/views/zoeken/index.view.php")).then((response) => response.text()).catch((err) => {
		console.error("Request failed", err);
		return "";
	});
}
async function setViewFromCurrentUrl() {
	let hash = window.location.hash.replace("#", "");
	await fetch("https://administratie.dko3.cloud/#" + hash).then((res) => res.text());
	await fetch("view.php?args=" + hash).then((res) => res.text());
}
function equals(g1, g2) {
	return g1.globalHide === g2.globalHide;
}
let rxEmail = /\w[\w.\-]*\@\w+\.\w+/gm;
function whoAmI() {
	let allScripts = document.querySelectorAll("script");
	let scriptTexts = [...allScripts].map((s) => s.textContent).join();
	let email = scriptTexts.match(rxEmail)[0];
	let rxName = /name: '(.*)'/;
	let name = scriptTexts.match(rxName)[1];
	return {
		email,
		name
	};
}
function stripStudentName(name) {
	return name.replaceAll(/[,()'-]/g, " ").replaceAll("  ", " ");
}
let Actions = /* @__PURE__ */ function(Actions$1) {
	Actions$1["OpenTab"] = "open_tab";
	Actions$1["GetTabData"] = "get_tab_data";
	return Actions$1;
}({});
function openTab(html, pageTitle) {
	let message = {
		action: Actions.OpenTab,
		data: html,
		pageTitle
	};
	chrome.runtime.sendMessage(message).then(() => console.log("message sent."));
}
function createTable(headers, cols) {
	let tmpDiv = document.createElement("div");
	let { first: tmpTable, last: tmpThead } = emmet.appendChild(tmpDiv, "table>thead");
	for (let th of headers) emmet.appendChild(tmpThead, `th{${th}}`);
	let tmpTbody = tmpTable.appendChild(document.createElement("tbody"));
	for (let tr of cols) {
		let tmpTr = tmpTbody.appendChild(document.createElement("tr"));
		for (let cell of tr) emmet.appendChild(tmpTr, `td{${cell}}`);
	}
	return tmpTable;
}
function isButtonHighlighted(buttonId) {
	return document.getElementById(buttonId)?.classList.contains("toggled");
}
function range(startAt, upTo) {
	if (upTo > startAt) return [...Array(upTo - startAt).keys()].map((n) => n + startAt);
	else return [...Array(startAt - upTo).keys()].reverse().map((n) => n + upTo + 1);
}
function getPageSettings(pageName, defaultSettings) {
	let storedState = localStorage.getItem(STORAGE_PAGE_SETTINGS_KEY_PREFIX + pageName);
	if (storedState) return JSON.parse(storedState);
	return defaultSettings;
}
function savePageSettings(state) {
	localStorage.setItem(STORAGE_PAGE_SETTINGS_KEY_PREFIX + state.pageName, JSON.stringify(state));
}
let globalTransientPageState = new Map();
function getPageTransientStateValue(key, defaultValue) {
	let value = globalTransientPageState.get(key);
	return value ? value : setPageTransientStateValue(key, defaultValue);
}
function setPageTransientStateValue(key, transientState) {
	globalTransientPageState.set(key, transientState);
	return transientState;
}
function clearPageTransientState() {
	globalTransientPageState.clear();
}
async function getOptions() {
	let items = await chrome.storage.sync.get(null);
	Object.assign(options, items);
	setGlobalSetting(await fetchGlobalSettings(getGlobalSettings()));
}

//#endregion
//#region typescript/gotoState.ts
function saveGotoState(state) {
	sessionStorage.setItem(STORAGE_GOTO_STATE_KEY, JSON.stringify(state));
}
function defaultGotoState(pageName) {
	let pageState$1 = {
		goto: Goto.None,
		pageName
	};
	if (pageName === PageName.Werklijst) return {
		werklijstTableName: "",
		...pageState$1
	};
	return pageState$1;
}
function getGotoStateOrDefault(pageName) {
	let pageState$1 = JSON.parse(sessionStorage.getItem(STORAGE_GOTO_STATE_KEY));
	if (pageState$1?.pageName === pageName) return pageState$1;
	else return defaultGotoState(pageName);
}
let PageName = /* @__PURE__ */ function(PageName$1) {
	PageName$1["Werklijst"] = "Werklijst";
	PageName$1["Lessen"] = "Lessen";
	return PageName$1;
}({});
let Goto = /* @__PURE__ */ function(Goto$1) {
	Goto$1["None"] = "";
	Goto$1["Werklijst_uren_nextYear"] = "Werklijst_uren_nextYear";
	Goto$1["Werklijst_uren_prevYear"] = "Werklijst_uren_prevYear";
	Goto$1["Lessen_trimesters_set_filter"] = "Lessen_trimesters_set_filter";
	Goto$1["Lessen_trimesters_show"] = "Lessen_trimesters_show";
	return Goto$1;
}({});

//#endregion
//#region typescript/powerQuery/setupPowerQuery.ts
function setupPowerQuery() {}
let powerQueryItems = [];
let popoverVisible = false;
let selectedItem = 0;
function addQueryItem(headerLabel, label, href, func, longLabelText) {
	powerQueryItems.push(createQueryItem(headerLabel, label, href, func, longLabelText));
}
function createQueryItem(headerLabel, label, href, func, longLabelText) {
	let longLabel = longLabelText ?? headerLabel + " > " + label;
	return {
		headerLabel,
		label,
		href,
		weight: 0,
		longLabel,
		lowerCase: longLabel.toLowerCase(),
		func
	};
}
function saveQueryItems(page, queryItems) {
	let savedPowerQueryString = localStorage.getItem(
		//back to top.
		POWER_QUERY_ID
);
	if (!savedPowerQueryString) savedPowerQueryString = "{}";
	let savedPowerQuery = JSON.parse(savedPowerQueryString);
	savedPowerQuery[page] = queryItems;
	localStorage.setItem(POWER_QUERY_ID, JSON.stringify(savedPowerQuery));
}
function getSavedAndDefaultQueryItems() {
	let savedPowerQuery = {};
	let allItems = [];
	let savedPowerQueryString = localStorage.getItem(POWER_QUERY_ID);
	if (savedPowerQueryString) savedPowerQuery = JSON.parse(savedPowerQueryString);
	let mergedPages = { ...default_items.default_items };
	for (let page in savedPowerQuery) mergedPages[page] = savedPowerQuery[page];
	for (let page in mergedPages) allItems.push(...mergedPages[page]);
	return allItems;
}
function screpeDropDownMenu(headerMenu) {
	let headerLabel = headerMenu.querySelector("a").textContent.trim();
	Array.from(headerMenu.querySelectorAll("div.dropdown-menu > a")).map((item) => {
		return {
			label: item.textContent.trim(),
			href: item.href
		};
	}).filter((item) => item.label != "" && item.href != "" && item.href != "https://administratie.dko3.cloud/#").forEach((item) => addQueryItem(headerLabel, item.label, item.href, void 0));
}
function scrapeMainMenu() {
	powerQueryItems = [];
	let menu = document.getElementById("dko3_navbar");
	let headerMenus = menu.querySelectorAll("#dko3_navbar > ul.navbar-nav > li.nav-item.dropdown");
	for (let headerMenu of headerMenus.values()) screpeDropDownMenu(headerMenu);
}
function gotoWerklijstUrenNextYear(_queryItem) {
	let pageState$1 = getGotoStateOrDefault(PageName.Werklijst);
	pageState$1.goto = Goto.Werklijst_uren_nextYear;
	saveGotoState(pageState$1);
	location.href = "/#leerlingen-werklijst";
}
function gotoWerklijstUrenPrevYear(_queryItem) {
	let pageState$1 = getGotoStateOrDefault(PageName.Werklijst);
	pageState$1.goto = Goto.Werklijst_uren_prevYear;
	saveGotoState(pageState$1);
	location.href = "/#leerlingen-werklijst";
}
function gotoTrimesterModules(_queryItem) {
	let pageState$1 = getGotoStateOrDefault(PageName.Lessen);
	pageState$1.goto = Goto.Lessen_trimesters_set_filter;
	saveGotoState(pageState$1);
	location.href = "/#lessen-overzicht";
}
function getHardCodedQueryItems() {
	addQueryItem("Werklijst", "Lerarenuren " + createShortSchoolyearString(calculateSchooljaar()), "", gotoWerklijstUrenPrevYear);
	addQueryItem("Werklijst", "Lerarenuren " + createShortSchoolyearString(calculateSchooljaar() + 1), "", gotoWerklijstUrenNextYear);
	addQueryItem("Lessen", "Trimester modules", "", gotoTrimesterModules);
}
document.body.addEventListener("keydown", showPowerQuery);
function addOpenTabQueryItem() {
	addQueryItem("Test", "Open tab", void 0, () => openTab("Important TYPESCRIPT data for this tab!!!", "Test 123"));
}
function showPowerQuery(ev) {
	if (ev.key === "q" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		scrapeMainMenu();
		powerQueryItems.push(...getSavedAndDefaultQueryItems());
		getHardCodedQueryItems();
		addOpenTabQueryItem();
		popover.showPopover();
	} else {
		if (popoverVisible === false) return;
		if (isAlphaNumeric(ev.key) || ev.key === " ") {
			searchField.textContent += ev.key;
			selectedItem = 0;
		} else if (ev.key == "Escape") {
			if (searchField.textContent !== "") {
				searchField.textContent = "";
				selectedItem = 0;
				ev.preventDefault();
			}
		} else if (ev.key == "Backspace") searchField.textContent = searchField.textContent.slice(0, -1);
		else if (ev.key == "ArrowDown") {
			selectedItem++;
			ev.preventDefault();
		} else if (ev.key == "ArrowUp") {
			selectedItem--;
			ev.preventDefault();
		} else if (ev.key == "Enter") {
			let selectedDiv = list.children[selectedItem];
			onItemSelected(selectedDiv);
			ev.preventDefault();
		}
	}
	filterItems(searchField.textContent);
}
let popover = document.createElement("div");
document.querySelector("main").appendChild(popover);
popover.setAttribute("popover", "auto");
popover.id = "powerQuery";
popover.addEventListener("toggle", (ev) => {
	popoverVisible = ev.newState === "open";
});
let searchField = document.createElement("label");
popover.appendChild(searchField);
let list = document.createElement("div");
popover.appendChild(list);
list.classList.add("list");
function filterItems(needle) {
	for (const item of powerQueryItems) {
		item.weight = 0;
		if (item.lowerCase.includes(needle)) item.weight += 1e3;
		let needleWordsWithSeparator = needle.split(/(?= )/g);
		if (needleWordsWithSeparator.every((word) => item.lowerCase.includes(word))) item.weight += 500;
		let indices = needle.split("").map((char) => item.lowerCase.indexOf(char));
		if (indices.every((num) => num !== -1) && isSorted(indices)) item.weight += 50;
		if (needle.split("").every((char) => item.lowerCase.includes(char))) item.weight += 20;
	}
	const MAX_VISIBLE_QUERY_ITEMS = 30;
	list.innerHTML = powerQueryItems.filter((item) => item.weight != 0).sort((a, b) => b.weight - a.weight).map((item) => `<div data-long-label="${item.longLabel}">${item.longLabel}</div>`).slice(0, MAX_VISIBLE_QUERY_ITEMS).join("\n");
	selectedItem = clamp(selectedItem, 0, list.children.length - 1);
	for (let item of list.querySelectorAll("div")) item.onclick = (ev) => {
		onItemSelected(ev.target);
	};
	list.children[selectedItem]?.classList.add("selected");
}
function onItemSelected(selectedElement) {
	let item = powerQueryItems.find((item$1) => item$1.longLabel === selectedElement.dataset.longLabel);
	popover.hidePopover();
	if (item.func) item.func(item);
	else location.href = item.href;
}
function isSorted(arr) {
	for (let i = 0; i < arr.length - 1; i++) if (arr[i] > arr[i + 1]) return false;
	return true;
}
function scrapeMenuPage(longLabelPrefix, linkConverter) {
	let queryItems = [];
	let blocks = document.querySelectorAll("div.card-body");
	for (let block of blocks) {
		let header = block.querySelector("h5");
		if (!header) continue;
		let headerLabel = header.textContent.trim();
		let links = block.querySelectorAll("a");
		for (let link of links) {
			if (!link.href) continue;
			let item = linkConverter(headerLabel, link, longLabelPrefix);
			queryItems.push(item);
		}
	}
	return queryItems;
}

//#endregion
//#region typescript/pageObserver.ts
var HashPageFilter = class {
	urlHash;
	constructor(urlHash) {
		this.urlHash = urlHash;
	}
	match() {
		return window.location.hash.startsWith(this.urlHash);
	}
};
var ExactHashPageFilter = class {
	urlHash;
	constructor(urlHash) {
		this.urlHash = urlHash;
	}
	match() {
		return window.location.hash === this.urlHash;
	}
};
var AllPageFilter = class {
	constructor() {}
	match() {
		return true;
	}
};
var BaseObserver = class {
	onPageChangedCallback;
	pageFilter;
	onMutation;
	observer;
	trackModal;
	constructor(onPageChangedCallback, pageFilter, onMutationCallback, trackModal = false) {
		this.onPageChangedCallback = onPageChangedCallback;
		this.pageFilter = pageFilter;
		this.onMutation = onMutationCallback;
		this.trackModal = trackModal;
		if (onMutationCallback) this.observer = new MutationObserver((mutationList, observer) => this.observerCallback(mutationList, observer));
	}
	observerCallback(mutationList, _observer) {
		for (const mutation of mutationList) {
			if (mutation.type !== "childList") continue;
			if (this.onMutation(mutation)) break;
		}
	}
	isPageMatching = () => this.pageFilter.match();
	onPageChanged() {
		if (!this.pageFilter.match()) {
			this.disconnect();
			return;
		}
		if (this.onPageChangedCallback) this.onPageChangedCallback();
		if (!this.onMutation) return;
		this.observeElement(document.querySelector("main"));
		if (this.trackModal) this.observeElement(document.getElementById("dko3_modal"));
	}
	observeElement(element) {
		if (!element) {
			console.error("Can't attach observer to element.");
			return;
		}
		const config = {
			attributes: false,
			childList: true,
			subtree: true
		};
		this.observer.observe(element, config);
	}
	disconnect() {
		this.observer?.disconnect();
	}
};
var HashObserver = class {
	baseObserver;
	constructor(urlHash, onMutationCallback, trackModal = false) {
		this.baseObserver = new BaseObserver(void 0, new HashPageFilter(urlHash), onMutationCallback, trackModal);
	}
	onPageChanged() {
		this.baseObserver.onPageChanged();
	}
	isPageMatching = () => this.baseObserver.isPageMatching();
};
var ExactHashObserver = class {
	baseObserver;
	constructor(urlHash, onMutationCallback, trackModal = false) {
		this.baseObserver = new BaseObserver(void 0, new ExactHashPageFilter(urlHash), onMutationCallback, trackModal);
	}
	isPageMatching = () => this.baseObserver.isPageMatching();
	onPageChanged() {
		this.baseObserver.onPageChanged();
	}
};
var PageObserver = class {
	baseObserver;
	constructor(onPageChangedCallback) {
		this.baseObserver = new BaseObserver(onPageChangedCallback, new AllPageFilter(), void 0, false);
	}
	isPageMatching = () => this.baseObserver.isPageMatching();
	onPageChanged() {
		this.baseObserver.onPageChanged();
	}
};
var MenuScrapingObserver = class MenuScrapingObserver {
	hashObserver;
	page;
	longLabelPrefix;
	constructor(urlHash, page, longLabelPrefix) {
		let self = this;
		this.hashObserver = new ExactHashObserver(urlHash, (_) => {
			return self.onMutationPageWithMenu();
		});
		this.page = page;
		this.longLabelPrefix = longLabelPrefix;
	}
	isPageMatching = () => this.hashObserver.isPageMatching();
	onPageChanged() {
		this.hashObserver.onPageChanged();
		if (this.isPageMatching()) this.onMutationPageWithMenu();
	}
	onMutationPageWithMenu() {
		saveQueryItems(this.page, scrapeMenuPage(this.longLabelPrefix, MenuScrapingObserver.defaultLinkToQueryItem));
		return true;
	}
	static defaultLinkToQueryItem(headerLabel, link, longLabelPrefix) {
		let label = link.textContent.trim();
		return createQueryItem(headerLabel, label, link.href, void 0, longLabelPrefix + label);
	}
};

//#endregion
//#region typescript/leerling/observer.ts
var observer_default$9 = new HashObserver("#leerlingen-leerling", onMutation$7);
function onMutation$7(mutation) {
	let tabInschrijving = document.getElementById("leerling_inschrijvingen_weergave");
	if (mutation.target === tabInschrijving) {
		onInschrijvingChanged(tabInschrijving);
		return true;
	}
	if (mutation.target.id.includes("_uitleningen_table")) {
		onUitleningenChanged(mutation.target);
		return true;
	}
	let tabAttesten = document.getElementById("attesten");
	if (mutation.target === tabAttesten) {
		onAttestenChanged(tabInschrijving);
		return true;
	}
	return false;
}
function onAttestenChanged(_tabInschrijving) {
	decorateSchooljaar();
}
function onUitleningenChanged(tableUitleningen) {
	let firstCells = tableUitleningen.querySelectorAll("tbody > tr > td:first-child");
	for (let cell of firstCells) {
		if (cell.classList.contains("text-muted")) break;
		let anchor = document.createElement("a");
		anchor.innerText = cell.innerText;
		anchor.setAttribute("href", "/#extra-assets-uitleningen-uitlening?id=" + anchor.innerText);
		cell.textContent = "";
		cell.appendChild(anchor);
	}
}
function getSchooljaarElementAndListen() {
	let schooljaar = getSchooljaarSelectElement();
	let listening = "changeListerenAdded";
	if (!schooljaar?.classList.contains(listening)) {
		schooljaar?.classList.add(listening);
		schooljaar?.addEventListener("click", () => {
			decorateSchooljaar();
		});
	}
	return schooljaar;
}
function isActiveYear() {
	let selectedYearElement = getSchooljaarElementAndListen();
	if (!selectedYearElement) return true;
	let selectedYear = parseInt(selectedYearElement.value);
	let now = new Date();
	let month = now.getMonth();
	let registrationSchoolYearStart = now.getFullYear();
	if (month <= 3) registrationSchoolYearStart--;
	return selectedYear === registrationSchoolYearStart;
}
function decorateSchooljaar() {
	let view = document.getElementById("view_contents");
	let activeYear = isActiveYear();
	if (activeYear) view.classList.remove("oldYear");
	else view.classList.add("oldYear");
	if (!activeYear) {
		let toewijzingButtons = document.querySelectorAll("#leerling_inschrijvingen_weergave button");
		Array.from(toewijzingButtons).filter((el) => el.textContent === "toewijzing" || el.textContent === "inschrijving").forEach((btn) => btn.classList.add("oldYear"));
	}
}
function onInschrijvingChanged(tabInschrijving) {
	db3("inschrijving (tab) changed.");
	decorateSchooljaar();
	let moduleButtons = tabInschrijving.querySelectorAll("tr td.right_center > button");
	for (let btn of moduleButtons) {
		let onClick = btn.getAttribute("onclick");
		let tr = btn.parentNode.parentNode;
		onClick = onClick.substring(10, onClick.length - 1);
		let args = onClick.split(", ").map((arg) => arg.replaceAll("'", ""));
		getModules(...args).then((modNames) => {
			let instrumentText = "";
			if (modNames.length) {
				tr.children[0].innerText += ": ";
				let rxBasic = /Initiatie +(.*) *- *trimester.*/i;
				let rxWide = /Initiatie +(.*) *- *trimester.* *- *(.*)/i;
				let rxDesperate = /Initiatie +(.*)/i;
				instrumentText += modNames.map((modName) => {
					let matches = modName.match(rxWide);
					if (matches?.length >= 2) return matches[1].trim() + " - " + matches[2].trim();
					matches = modName.match(rxBasic);
					if (matches?.length >= 1) return matches[1].trim();
					matches = modName.match(rxDesperate);
					if (matches?.length >= 1) return matches[1].trim();
					return ": ???";
				}).join(", ");
			}
			let span = document.createElement("span");
			tr.children[0].appendChild(span);
			if (modNames.length > 1) span.classList.add("badge-warning");
			span.innerText = instrumentText;
		});
	}
	if (options.showNotAssignedClasses) setStripedLessons();
}
function setStripedLessons() {
	let classRows = document.querySelectorAll("#leerling_inschrijvingen_weergave tr");
	let classCells = Array.from(classRows).filter((row) => row.querySelector(".table-info") !== null).map((row) => row.children.item(row.children.length - 2));
	for (let td of classCells) {
		let classDate = td.querySelector("span.text-muted");
		if (!classDate) continue;
		if (classDate.textContent === "(geen lesmomenten)") continue;
		for (let tdd of td.parentElement.children) if (tdd.classList.contains("table-info")) tdd.classList.add("runningStripes");
	}
}
async function getModules(_size, _modal, _file, args) {
	let res2 = await fetch("/views/leerlingen/leerling/inschrijvingen/modules_kiezen.modules.div.php?" + args);
	let text2 = await res2.text();
	const template = document.createElement("template");
	template.innerHTML = text2;
	let checks = template.content.querySelectorAll("i.fa-check-square");
	return Array.from(checks).map((check) => check.parentNode.parentNode.parentNode.querySelector("strong").textContent);
}

//#endregion
//#region typescript/lessen/scrape.ts
function scrapeLessenOverzicht(table) {
	let body = table.tBodies[0];
	let lessen = [];
	for (const row of body.rows) {
		let lesCell = row.cells[0];
		let studentsCell = row.cells[1];
		let les = scrapeLesInfo(lesCell);
		les.tableRow = row;
		les.studentsTable = studentsCell.querySelectorAll("table")[0];
		let meta = scrapeStudentsCellMeta(studentsCell);
		les.aantal = meta.aantal;
		les.maxAantal = meta.maxAantal;
		les.id = meta.id;
		les.wachtlijst = meta.wachtlijst;
		les.warnings = [...row.getElementsByClassName("text-warning")].map((el) => el.textContent);
		lessen.push(les);
	}
	return lessen;
}
function scrapeStudentsCellMeta(studentsCell) {
	let smallTags = studentsCell.querySelectorAll("small");
	let aantal = 0;
	let maxAantal = 0;
	let arrayLeerlingenAantal = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("leerlingen"));
	if (arrayLeerlingenAantal.length > 0) {
		const reAantallen = /(\d+).\D+(\d+)/;
		let matches = arrayLeerlingenAantal[0].match(reAantallen);
		aantal = parseInt(matches[1]);
		maxAantal = parseInt(matches[2]);
	}
	let idTag = Array.from(smallTags).find((item) => item.classList.contains("float-right"));
	let id = idTag.textContent;
	let wachtlijst = 0;
	let arrayWachtlijst = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("wachtlijst"));
	if (arrayWachtlijst.length > 0) {
		let reWachtlijst = /(\d+)/;
		let matches = arrayWachtlijst[0].match(reWachtlijst);
		wachtlijst = parseInt(matches[1]);
	}
	return {
		aantal,
		maxAantal,
		id,
		wachtlijst
	};
}
function scrapeModules(table) {
	let lessen = scrapeLessenOverzicht(table);
	return {
		trimesterModules: scrapeTrimesterModules(lessen),
		jaarModules: scrapeJaarModules(lessen)
	};
}
function scrapeTrimesterModules(lessen) {
	let modules = lessen.filter((les) => les.lesType === LesType.TrimesterModule);
	let trimesterModules = [];
	for (let module of modules) {
		module.students = scrapeStudents(module.studentsTable);
		const reInstrument = /.*\Snitiatie\s*(\S+).*(\d).*/;
		const match$1 = module.naam.match(reInstrument);
		if (match$1?.length !== 3) {
			console.error(`Could not process trimester module "${module.naam}" (${module.id}).`);
			continue;
		}
		module.instrumentName = match$1[1];
		module.trimesterNo = parseInt(match$1[2]);
		trimesterModules.push(module);
	}
	return trimesterModules;
}
function scrapeJaarModules(lessen) {
	let modules = lessen.filter((les) => les.lesType === LesType.JaarModule);
	let jaarModules = [];
	for (let module of modules) {
		module.students = scrapeStudents(module.studentsTable);
		const reInstrument = /.*\Snitiatie\s*(\S+).*/;
		const match$1 = module.naam.match(reInstrument);
		if (match$1?.length !== 2) {
			console.error(`Could not process jaar module "${module.naam}" (${module.id}).`);
			continue;
		}
		module.instrumentName = match$1[1];
		module.trimesterNo = parseInt(match$1[2]);
		jaarModules.push(module);
	}
	return jaarModules;
}
var StudentInfo = class {
	graadJaar;
	name;
	trimesterInstruments;
	jaarInstruments;
	allYearSame;
	naam;
	voornaam;
	id;
	info;
	notAllTrimsHaveAnInstrument;
};
function scrapeStudents(studentTable) {
	let students = [];
	if (studentTable.tBodies.length === 0) return students;
	for (const row of studentTable.tBodies[0].rows) {
		let studentInfo = new StudentInfo();
		studentInfo.graadJaar = row.cells[0].children[0].textContent;
		studentInfo.name = row.cells[0].childNodes[1].textContent;
		let names = studentInfo.name.split(", ");
		studentInfo.naam = names[0];
		studentInfo.voornaam = names[1];
		students.push(studentInfo);
	}
	return students;
}
let LesType = /* @__PURE__ */ function(LesType$1) {
	LesType$1[LesType$1["TrimesterModule"] = 0] = "TrimesterModule";
	LesType$1[LesType$1["JaarModule"] = 1] = "JaarModule";
	LesType$1[LesType$1["Les"] = 2] = "Les";
	LesType$1[LesType$1["UnknownModule"] = 3] = "UnknownModule";
	return LesType$1;
}({});
var Les = class {
	tableRow;
	vakNaam;
	lesType;
	alc;
	online;
	naam;
	teacher;
	lesmoment;
	formattedLesmoment;
	vestiging;
	studentsTable;
	aantal;
	maxAantal;
	id;
	wachtlijst;
	students;
	instrumentName;
	trimesterNo;
	tags;
	warnings;
};
function scrapeLesInfo(lesInfo) {
	let les = new Les();
	let [first] = lesInfo.getElementsByTagName("strong");
	les.vakNaam = first.textContent;
	let allBadges = lesInfo.getElementsByClassName("badge");
	let warningBadges = lesInfo.getElementsByClassName("badge-warning");
	les.alc = Array.from(allBadges).some((el) => el.textContent === "ALC");
	les.online = lesInfo.getElementsByClassName("fa-eye-slash").length === 0;
	les.tags = Array.from(warningBadges).map((el) => el.textContent).filter((txt) => txt !== "ALC").filter((txt) => txt);
	let mutedSpans = lesInfo.querySelectorAll("span.text-muted");
	if (mutedSpans.length > 1) les.naam = mutedSpans.item(0).textContent;
	else les.naam = lesInfo.children[1].textContent;
	if (Array.from(allBadges).some((el) => el.textContent === "module")) if (les.naam.includes("jaar")) les.lesType = LesType.JaarModule;
	else if (les.naam.includes("rimester")) les.lesType = LesType.TrimesterModule;
	else les.lesType = LesType.UnknownModule;
	else les.lesType = LesType.Les;
	if (mutedSpans.length > 0) les.teacher = Array.from(mutedSpans).pop().textContent;
	let textNodes = Array.from(lesInfo.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
	if (!textNodes) return les;
	les.lesmoment = textNodes[0].nodeValue;
	les.vestiging = textNodes[1].nodeValue;
	return les;
}

//#endregion
//#region typescript/lessen/convert.ts
var BlockInfo = class BlockInfo {
	static blockCounter = 0;
	static allBlocks = [];
	id;
	teacher;
	instrumentName;
	maxAantal;
	lesmoment;
	vestiging;
	trimesters;
	jaarModules;
	tags;
	errors;
	offline;
	mergedBlocks;
	static clearAllBlocks() {
		BlockInfo.allBlocks = [];
		BlockInfo.blockCounter = 0;
	}
	static getBlock(id) {
		return BlockInfo.allBlocks[id];
	}
	static getAllBlocks() {
		return BlockInfo.allBlocks;
	}
	constructor() {
		{
			this.id = BlockInfo.blockCounter++;
			BlockInfo.allBlocks.push(this);
			this.teacher = void 0;
			this.instrumentName = void 0;
			this.maxAantal = -1;
			this.lesmoment = void 0;
			this.vestiging = void 0;
			this.trimesters = [
				[],
				[],
				[]
			];
			this.jaarModules = [];
			this.tags = [];
			this.errors = "";
			this.offline = false;
			this.mergedBlocks = [];
		}
	}
	hasSomeOfflineLessen() {
		return this.alleLessen().some((les) => les.online === false);
	}
	hasMissingTeachers() {
		return this.alleLessen().some((les) => les.teacher === "(geen klasleerkracht)");
	}
	hasMissingMax() {
		return this.alleLessen().some((les) => les.maxAantal > TOO_LARGE_MAX);
	}
	hasFullClasses() {
		return this.alleLessen().some((les) => les.aantal >= les.maxAantal);
	}
	hasOnlineAlcClasses() {
		return this.alleLessen().some((les) => les.online && les.alc);
	}
	hasWarningLessons() {
		return this.alleLessen().some((les) => les.warnings.length > 0);
	}
	alleLessen() {
		return this.trimesters.flat().concat(this.jaarModules);
	}
	mergeBlock(block) {
		this.mergedBlocks.push(block);
		this.jaarModules.push(...block.jaarModules);
		for (let trimNo of [
			0,
			1,
			2
		]) this.trimesters[trimNo].push(...block.trimesters[trimNo]);
		this.errors += block.errors;
		return this;
	}
	containsId(id) {
		if (this.id === id) return true;
		return this.mergedBlocks.some((b) => b.containsId(id));
	}
	getIds() {
		return this.mergedBlocks.map((b) => b.id).concat(this.id);
	}
	updateMergedBlock() {
		let allLessen = this.alleLessen();
		this.lesmoment = [...new Set(allLessen.filter((les) => les).map((les) => les.lesmoment))].join(", ");
		this.teacher = [...new Set(allLessen.filter((les) => les).map((les) => les.teacher))].join(", ");
		this.vestiging = [...new Set(allLessen.filter((les) => les).map((les) => les.vestiging))].join(", ");
		this.instrumentName = [...new Set(allLessen.filter((les) => les).map((les) => les.instrumentName))].join(", ");
		this.tags = distinct(allLessen.filter((les) => les).map((les) => les.tags).flat()).map((tagName) => {
			return {
				name: tagName,
				partial: false
			};
		});
		for (let tag of this.tags) tag.partial = !allLessen.every((les) => les.tags.includes(tag.name));
		this.offline = allLessen.some((les) => !les.online);
	}
	checkBlockForErrors() {
		let maxMoreThan100 = this.jaarModules.map((module) => module.maxAantal > TOO_LARGE_MAX).includes(true);
		if (!maxMoreThan100) maxMoreThan100 = this.trimesters.flat().map((module) => module?.maxAantal > TOO_LARGE_MAX).includes(true);
		if (maxMoreThan100) this.errors += "Max aantal lln > " + TOO_LARGE_MAX;
	}
};
function buildTrimesters(instrumentTeacherMomentModules) {
	let mergedInstrument = [
		[],
		[],
		[]
	];
	instrumentTeacherMomentModules.filter((module) => module.lesType === LesType.TrimesterModule).forEach((module) => {
		mergedInstrument[module.trimesterNo - 1].push(module);
	});
	return mergedInstrument;
}
function getLesmomenten(modules) {
	let lesMomenten = modules.map((module) => module.formattedLesmoment);
	return [...new Set(lesMomenten)];
}
function getMaxAantal(modules) {
	return modules.map((module) => module.maxAantal).reduce((prev, next) => {
		return prev < next ? next : prev;
	});
}
function getVestigingen(modules) {
	let vestigingen = modules.map((module) => module.vestiging);
	let uniqueVestigingen = [...new Set(vestigingen)];
	return uniqueVestigingen.toString();
}
function prepareLesmomenten(inputModules) {
	let reLesMoment = /.*(\w\w) (?:\d+\/\d+ )?(\d\d:\d\d)-(\d\d:\d\d).*/;
	for (let module of inputModules) {
		if (module.lesmoment === "(geen volgende les)") {
			module.formattedLesmoment = module.lesmoment;
			continue;
		}
		let matches = module.lesmoment.match(reLesMoment);
		if (matches?.length !== 4) {
			console.error(`Could not process lesmoment "${module.lesmoment}" for instrument "${module.instrumentName}".`);
			module.formattedLesmoment = "???";
		} else module.formattedLesmoment = matches[1] + " " + matches[2] + "-" + matches[3];
		module.formattedLesmoment = matches[1] + " " + matches[2] + "-" + matches[3];
	}
}
function setStudentPopupInfo(student) {
	student.info = "";
	if (!student.trimesterInstruments) return;
	for (let instrs of student.trimesterInstruments) if (instrs.length) student.info += instrs[0].trimesterNo + ". " + instrs.map((instr) => instr.instrumentName) + "\n";
	else student.info += "?. ---\n";
}
function setStudentAllTrimsTheSameInstrument(student) {
	if (!student.trimesterInstruments) return;
	let instruments = student.trimesterInstruments.flat();
	if (instruments.length < 3) {
		student.allYearSame = false;
		return;
	}
	student.allYearSame = instruments.every((instr) => instr.instrumentName === (student?.trimesterInstruments[0][0]?.instrumentName ?? "---"));
}
function setStudentNoInstrumentForAllTrims(student) {
	if (!student.trimesterInstruments) return;
	student.notAllTrimsHaveAnInstrument = false;
	for (let trim of student.trimesterInstruments) if (trim.length == 0) student.notAllTrimsHaveAnInstrument = true;
}
function buildTableData(inputModules) {
	prepareLesmomenten(inputModules);
	let tableData = {
		students: new Map(),
		instruments: new Map(),
		teachers: new Map(),
		blocks: []
	};
	BlockInfo.clearAllBlocks();
	let instruments = distinct(inputModules.map((module) => module.instrumentName));
	for (let instrumentName of instruments) {
		let instrumentModules = inputModules.filter((module) => module.instrumentName === instrumentName);
		let teachers$1 = distinct(instrumentModules.map((module) => module.teacher));
		for (let teacher of teachers$1) {
			let instrumentTeacherModules = instrumentModules.filter((module) => module.teacher === teacher);
			let lesmomenten = distinct(getLesmomenten(instrumentTeacherModules));
			for (let lesmoment of lesmomenten) {
				let instrumentTeacherMomentModules = instrumentTeacherModules.filter((module) => module.formattedLesmoment === lesmoment);
				let block = new BlockInfo();
				block.instrumentName = instrumentName;
				block.teacher = teacher;
				block.lesmoment = lesmoment;
				block.maxAantal = getMaxAantal(instrumentTeacherMomentModules);
				block.vestiging = getVestigingen(instrumentTeacherMomentModules);
				block.tags = distinct(instrumentTeacherMomentModules.map((les) => les.tags).flat()).map((tagName) => {
					return {
						name: tagName,
						partial: !tagFoundInAllModules(tagName, instrumentTeacherMomentModules)
					};
				});
				block.trimesters = buildTrimesters(instrumentTeacherMomentModules);
				block.jaarModules = instrumentTeacherMomentModules.filter((module) => module.lesType === LesType.JaarModule);
				block.offline = instrumentTeacherMomentModules.some((module) => !module.online);
				block.checkBlockForErrors();
				tableData.blocks.push(block);
				for (let trim of block.trimesters) addTrimesterStudentsToMapAndCount(tableData.students, trim);
				for (let jaarModule of block.jaarModules) addJaarStudentsToMapAndCount(tableData.students, jaarModule);
			}
		}
	}
	for (let student of tableData.students.values()) {
		setStudentPopupInfo(student);
		setStudentAllTrimsTheSameInstrument(student);
		setStudentNoInstrumentForAllTrims(student);
	}
	let instrumentNames = distinct(tableData.blocks.map((b) => b.instrumentName)).sort((a, b) => {
		return a.localeCompare(b);
	});
	for (let instr of instrumentNames) tableData.instruments.set(instr, {
		name: instr,
		blocks: []
	});
	for (let block of tableData.blocks) tableData.instruments.get(block.instrumentName).blocks.push(block);
	let teachers = distinct(tableData.blocks.map((b) => b.teacher)).sort((a, b) => {
		return a.localeCompare(b);
	});
	for (let t of teachers) tableData.teachers.set(t, {
		name: t,
		blocks: []
	});
	for (let block of tableData.blocks) tableData.teachers.get(block.teacher).blocks.push(block);
	groupBlocksTwoLevels(tableData.teachers.values(), (block) => block.lesmoment, (primary, secundary) => {
		primary.lesMomenten = secundary;
	});
	groupBlocksTwoLevels(tableData.instruments.values(), (block) => block.lesmoment, (primary, secundary) => {
		primary.lesMomenten = secundary;
	});
	groupBlocks(tableData.teachers.values(), (block) => block.teacher);
	groupBlocks(tableData.instruments.values(), (block) => block.instrumentName);
	return tableData;
}
function tagFoundInAllModules(tag, modules) {
	for (let module of modules) if (!module.tags.includes(tag)) return false;
	return true;
}
function groupBlocksTwoLevels(primaryGroups, getSecondaryKey, setSecondaryGroup) {
	for (let primary of primaryGroups) {
		let blocks = primary.blocks;
		let secondaryKeys = distinct(blocks.map(getSecondaryKey));
		let secondaryGroup = new Map(secondaryKeys.map((key) => [key, new BlockInfo()]));
		for (let block of blocks) secondaryGroup.get(getSecondaryKey(block)).mergeBlock(block);
		secondaryGroup.forEach((block) => {
			block.updateMergedBlock();
		});
		setSecondaryGroup(primary, secondaryGroup);
	}
}
function groupBlocks(primaryGroups, getPrimaryKey) {
	for (let primary of primaryGroups) {
		let blocks = primary.blocks;
		let keys = distinct(blocks.map(getPrimaryKey));
		primary.mergedBlocks = new Map(keys.map((key) => [key, new BlockInfo()]));
		for (let block of blocks) primary.mergedBlocks.get(getPrimaryKey(block)).mergeBlock(block);
		primary.mergedBlocks.forEach((block) => {
			block.updateMergedBlock();
		});
	}
}
function addTrimesterStudentsToMapAndCount(allStudents, blockTrimModules) {
	for (let blockTrimModule of blockTrimModules) {
		if (!blockTrimModule) continue;
		for (let student of blockTrimModule.students) {
			if (!allStudents.has(student.name)) {
				student.trimesterInstruments = [
					[],
					[],
					[]
				];
				allStudents.set(student.name, student);
			}
			let stud = allStudents.get(student.name);
			stud.trimesterInstruments[blockTrimModule.trimesterNo - 1].push(blockTrimModule);
		}
		blockTrimModule.students = blockTrimModule.students.map((student) => allStudents.get(student.name));
	}
}
function addJaarStudentsToMapAndCount(students, jaarModule) {
	if (!jaarModule) return;
	for (let student of jaarModule.students) {
		if (!students.has(student.name)) {
			student.jaarInstruments = [];
			students.set(student.name, student);
		}
		let stud = students.get(student.name);
		stud.jaarInstruments.push(jaarModule);
	}
	jaarModule.students = jaarModule.students.map((student) => students.get(student.name));
}
const TOO_LARGE_MAX = 100;
function mergeBlockStudents(block) {
	let jaarStudents = block.jaarModules.map((les) => les.students).flat();
	let trimesterStudents = [
		block.trimesters[0].map((les) => les?.students ?? []).flat(),
		block.trimesters[1].map((les) => les?.students ?? []).flat(),
		block.trimesters[2].map((les) => les?.students ?? []).flat()
	];
	let maxAantallen = block.trimesters.map((trimLessen) => {
		if (trimLessen.length === 0) return 0;
		return trimLessen.map((les) => les?.maxAantal ?? 0).map((maxAantal) => maxAantal > TOO_LARGE_MAX ? 4 : maxAantal).reduce((a, b) => a + b);
	});
	let blockNeededRows = Math.max(...maxAantallen, ...trimesterStudents.map((stud) => stud.length));
	let wachtlijsten = block.trimesters.map((trimLessen) => {
		if (trimLessen.length === 0) return 0;
		return trimLessen.map((les) => les?.wachtlijst ?? 0).reduce((a, b) => a + b);
	});
	let hasWachtlijst = wachtlijsten.some((wachtLijst) => wachtLijst > 0);
	if (hasWachtlijst) blockNeededRows++;
	let maxJaarStudentCount = block.jaarModules.map((mod) => mod.maxAantal).reduce((a, b) => Math.max(a, b), 0);
	return {
		jaarStudents,
		trimesterStudents,
		maxAantallen,
		blockNeededRows,
		wachtlijsten,
		hasWachtlijst,
		maxJaarStudentCount
	};
}

//#endregion
//#region typescript/lessen/build.ts
let NameSorting = /* @__PURE__ */ function(NameSorting$1) {
	NameSorting$1[NameSorting$1["FirstName"] = 0] = "FirstName";
	NameSorting$1[NameSorting$1["LastName"] = 1] = "LastName";
	return NameSorting$1;
}({});
let TrimesterGrouping = /* @__PURE__ */ function(TrimesterGrouping$1) {
	TrimesterGrouping$1[TrimesterGrouping$1["TeacherInstrumentHour"] = 0] = "TeacherInstrumentHour";
	TrimesterGrouping$1[TrimesterGrouping$1["InstrumentTeacherHour"] = 1] = "InstrumentTeacherHour";
	TrimesterGrouping$1[TrimesterGrouping$1["TeacherHour"] = 2] = "TeacherHour";
	TrimesterGrouping$1[TrimesterGrouping$1["InstrumentHour"] = 3] = "InstrumentHour";
	TrimesterGrouping$1[TrimesterGrouping$1["Instrument"] = 4] = "Instrument";
	TrimesterGrouping$1[TrimesterGrouping$1["Teacher"] = 5] = "Teacher";
	return TrimesterGrouping$1;
}({});
function getDefaultPageSettings() {
	return {
		pageName: PageName.Lessen,
		nameSorting: NameSorting.LastName,
		grouping: TrimesterGrouping.InstrumentTeacherHour,
		searchText: "",
		filterOffline: false,
		filterOnline: false,
		filterNoTeacher: false,
		filterNoMax: false,
		filterFullClass: false,
		filterOnlineAlc: false,
		filterWarnings: false
	};
}
let pageState = getDefaultPageSettings();
function setSavedNameSorting(sorting) {
	pageState.nameSorting = sorting;
	savePageSettings(pageState);
}
function getSavedNameSorting() {
	pageState = getPageSettings(PageName.Lessen, pageState);
	return pageState.nameSorting;
}
function buildTrimesterTable(tableData, trimElements) {
	pageState = getPageSettings(PageName.Lessen, pageState);
	tableData.blocks.sort((block1, block2) => block1.instrumentName.localeCompare(block2.instrumentName));
	trimElements.trimTableDiv = emmet.create(`#${TRIM_DIV_ID}>table#trimesterTable[border="2" style.width="100%"]>colgroup>col*3`).root;
	trimElements.trimTableDiv.dataset.showFullClass = isButtonHighlighted(FULL_CLASS_BUTTON_ID) ? "true" : "false";
	let { root: newTable, last: trHeader } = emmet.create("#trimesterTable>tbody+thead.table-secondary>tr");
	Object.assign(trimElements, getTrimPageElements());
	let newTableBody = newTable.querySelector("tbody");
	let totTrim = [
		0,
		0,
		0
	];
	for (let block of tableData.blocks) {
		let totJaar = block.jaarModules.map((mod) => mod.students.length).reduce((prev, curr) => prev + curr, 0);
		for (let trimNo of [
			0,
			1,
			2
		]) totTrim[trimNo] += totJaar + (block.trimesters[trimNo][0]?.students?.length ?? 0);
	}
	emmet.append(trHeader, "(th>div>span.bold{Trimester $}+span.plain{ ($$ lln)})*3", (index) => totTrim[index].toString());
	switch (pageState.grouping) {
		case TrimesterGrouping.InstrumentTeacherHour:
			for (let [instrumentName, instrument] of tableData.instruments) buildGroup(newTableBody, instrument.blocks, instrumentName, (block) => block.teacher, DisplayOptions.Hour | DisplayOptions.Location);
			break;
		case TrimesterGrouping.TeacherInstrumentHour:
			for (let [teacherName, teacher] of tableData.teachers) buildGroup(newTableBody, teacher.blocks, teacherName, (block) => block.instrumentName, DisplayOptions.Hour | DisplayOptions.Location);
			break;
		case TrimesterGrouping.TeacherHour:
			for (let [teacherName, teacher] of tableData.teachers) {
				buildTitleRow(newTableBody, teacherName);
				for (let [hour, block] of teacher.lesMomenten) buildBlock(newTableBody, block, teacherName, (_block) => hour, DisplayOptions.Location);
			}
			break;
		case TrimesterGrouping.InstrumentHour:
			for (let [instrumentName, instrument] of tableData.instruments) {
				buildTitleRow(newTableBody, instrumentName);
				for (let [hour, block] of instrument.lesMomenten) buildBlock(newTableBody, block, instrumentName, (_block) => hour, DisplayOptions.Location);
			}
			break;
		case TrimesterGrouping.Instrument:
			for (let [instrumentName, instrument] of tableData.instruments) {
				buildTitleRow(newTableBody, instrumentName);
				for (let [, block] of instrument.mergedBlocks) buildBlock(newTableBody, block, instrumentName, void 0, DisplayOptions.Hour | DisplayOptions.Location | DisplayOptions.Teacher);
			}
			break;
		case TrimesterGrouping.Teacher:
			for (let [teacherName, teacher] of tableData.teachers) {
				buildTitleRow(newTableBody, teacherName);
				for (let [, block] of teacher.mergedBlocks) buildBlock(newTableBody, block, teacherName, void 0, DisplayOptions.Hour | DisplayOptions.Location | DisplayOptions.Instrument);
			}
			break;
	}
}
function buildGroup(newTableBody, blocks, groupId, getBlockTitle, displayOptions) {
	buildTitleRow(newTableBody, groupId);
	for (let block of blocks) buildBlock(newTableBody, block, groupId, getBlockTitle, displayOptions);
}
function createStudentRow(tableBody, rowClass, groupId, blockId) {
	let row = createLesRow(groupId, blockId);
	tableBody.appendChild(row);
	row.classList.add(rowClass);
	row.dataset.hasFullClass = "false";
	return row;
}
function buildBlock(newTableBody, block, groupId, getBlockTitle, displayOptions) {
	let mergedBlockStudents = mergeBlockStudents(block);
	let trimesterHeaders = [
		0,
		1,
		2
	].map((trimNo) => {
		if (mergedBlockStudents.trimesterStudents[trimNo].length < 5 && mergedBlockStudents.maxAantallen[trimNo] < 5) return "";
		return `${mergedBlockStudents.trimesterStudents[trimNo].length} van ${mergedBlockStudents.maxAantallen[trimNo]} lln`;
	});
	let trTitle = buildBlockTitle(newTableBody, block, getBlockTitle, groupId);
	let headerRows = buildBlockHeader(newTableBody, block, groupId, trimesterHeaders, displayOptions);
	let studentTopRowNo = newTableBody.children.length;
	let filledRowCount = 0;
	sortStudents(mergedBlockStudents.jaarStudents);
	for (let student of mergedBlockStudents.jaarStudents) {
		let row = createStudentRow(newTableBody, "jaarRow", groupId, block.id);
		for (let trimNo = 0; trimNo < 3; trimNo++) {
			let cell = buildStudentCell(student);
			row.appendChild(cell);
			cell.classList.add("jaarStudent");
			if (mergedBlockStudents.maxAantallen[trimNo] <= filledRowCount) cell.classList.add("gray");
		}
		filledRowCount++;
	}
	let hasFullClass = false;
	for (let rowNo = 0; rowNo < mergedBlockStudents.blockNeededRows - filledRowCount; rowNo++) {
		let row = createStudentRow(newTableBody, "trimesterRow", groupId, block.id);
		for (let trimNo = 0; trimNo < 3; trimNo++) {
			let trimester = mergedBlockStudents.trimesterStudents[trimNo];
			sortStudents(trimester);
			let student = void 0;
			if (trimester) {
				student = trimester[rowNo];
				let maxTrimStudentCount = Math.max(mergedBlockStudents.maxAantallen[trimNo], mergedBlockStudents.maxJaarStudentCount);
				if (trimester.length > 0 && trimester.length >= maxTrimStudentCount) {
					row.dataset.hasFullClass = "true";
					hasFullClass = true;
				}
			}
			let cell = buildStudentCell(student);
			row.appendChild(cell);
			cell.classList.add("trimesterStudent");
			if (mergedBlockStudents.maxAantallen[trimNo] <= rowNo) cell.classList.add("gray");
			if (student?.trimesterInstruments) {
				if (student?.trimesterInstruments[trimNo].length > 1) cell.classList.add("yellowMarker");
			}
		}
	}
	if (hasFullClass) {
		if (trTitle) trTitle.dataset.hasFullClass = "true";
		headerRows.trModuleLinks.dataset.hasFullClass = "true";
	}
	if (!mergedBlockStudents.hasWachtlijst) return;
	for (let trimNo of [
		0,
		1,
		2
	]) {
		let row = newTableBody.children[newTableBody.children.length - 1];
		row.classList.add("wachtlijst");
		let cell = row.children[trimNo];
		if (mergedBlockStudents.wachtlijsten[trimNo] === 0) continue;
		const small = document.createElement("small");
		cell.appendChild(small);
		small.appendChild(document.createTextNode(`(${mergedBlockStudents.wachtlijsten[trimNo]} op wachtlijst)`));
		small.classList.add("text-danger");
		if (mergedBlockStudents.wachtlijsten[trimNo] > 0 && mergedBlockStudents.trimesterStudents[trimNo].length < mergedBlockStudents.maxAantallen[trimNo]) {
			cell.querySelector("small").classList.add("yellowMarker");
			newTableBody.children[studentTopRowNo + mergedBlockStudents.trimesterStudents[trimNo].length].children[trimNo].classList.add("yellowMarker");
		}
	}
}
function createLesRow(groupId, blockId) {
	let tr = document.createElement("tr");
	tr.dataset.blockId = "" + blockId;
	if (blockId) tr.dataset.groupId = groupId;
	else tr.dataset.blockId = "groupTitle";
	return tr;
}
function buildTitleRow(newTableBody, title) {
	const trTitle = createLesRow(title, void 0);
	newTableBody.appendChild(trTitle);
	trTitle.classList.add("blockRow", "groupHeader");
	trTitle.dataset.groupId = title;
	const tdTitle = document.createElement("td");
	trTitle.appendChild(tdTitle);
	tdTitle.classList.add("titleCell");
	tdTitle.setAttribute("colspan", "3");
	let divTitle = document.createElement("div");
	tdTitle.appendChild(divTitle);
	divTitle.classList.add("blockTitle");
	divTitle.appendChild(document.createTextNode(title));
	return {
		trTitle,
		divTitle
	};
}
function buildBlockTitle(newTableBody, block, getBlockTitle, groupId) {
	if (!getBlockTitle && !block.errors) return void 0;
	const trBlockTitle = newTableBody.appendChild(createLesRow(groupId, block.id));
	trBlockTitle.classList.add("blockRow");
	let { last: divBlockTitle } = emmet.append(trBlockTitle, "td.infoCell[colspan=3]>div.text-muted");
	if (getBlockTitle) emmet.appendChild(divBlockTitle, `span.blockTitle{${getBlockTitle(block)}}`);
	for (let jaarModule of block.jaarModules) divBlockTitle.appendChild(buildModuleButton(">", jaarModule.id, false));
	if (block.errors) {
		let errorSpan = document.createElement("span");
		errorSpan.appendChild(document.createTextNode(block.errors));
		errorSpan.classList.add("lesError");
		divBlockTitle.appendChild(errorSpan);
	}
	return trBlockTitle;
}
var DisplayOptions = /* @__PURE__ */ function(DisplayOptions$1) {
	DisplayOptions$1[DisplayOptions$1["Teacher"] = 1] = "Teacher";
	DisplayOptions$1[DisplayOptions$1["Hour"] = 2] = "Hour";
	DisplayOptions$1[DisplayOptions$1["Instrument"] = 4] = "Instrument";
	DisplayOptions$1[DisplayOptions$1["Location"] = 8] = "Location";
	return DisplayOptions$1;
}(DisplayOptions || {});
function buildInfoRow(newTableBody, _text, show, groupId, blockId) {
	const trBlockInfo = newTableBody.appendChild(createLesRow(groupId, blockId));
	trBlockInfo.classList.add("blockRow");
	if (show === false) trBlockInfo.dataset.keepHidden = "true";
	trBlockInfo.dataset.groupId = groupId;
	return emmet.append(trBlockInfo, "td.infoCell[colspan=3]>div.text-muted");
}
function buildInfoRowWithText(newTableBody, show, blockId, groupId, text) {
	let { last: divMuted } = buildInfoRow(newTableBody, "", show, groupId, blockId);
	divMuted.appendChild(document.createTextNode(text));
}
function buildBlockHeader(newTableBody, block, groupId, trimesterHeaders, displayOptions) {
	buildInfoRowWithText(newTableBody, Boolean(DisplayOptions.Teacher & displayOptions), block.id, groupId, block.teacher);
	buildInfoRowWithText(newTableBody, Boolean(DisplayOptions.Instrument & displayOptions), block.id, groupId, block.instrumentName);
	buildInfoRowWithText(newTableBody, Boolean(DisplayOptions.Hour & displayOptions), block.id, groupId, block.lesmoment);
	buildInfoRowWithText(newTableBody, Boolean(DisplayOptions.Location & displayOptions), block.id, groupId, block.vestiging);
	if (block.tags.length > 0) {
		let { last: divMuted } = buildInfoRow(newTableBody, block.tags.join(), true, groupId, block.id);
		emmet.appendChild(divMuted, block.tags.map((tag) => {
			let mutedClass = tag.partial ? ".muted" : "";
			return `span.badge.badge-ill.badge-warning${mutedClass}{${tag.name}}`;
		}).join("+"));
	}
	const trModuleLinks = createLesRow(groupId, block.id);
	newTableBody.appendChild(trModuleLinks);
	trModuleLinks.classList.add("blockRow");
	const tdLink1 = document.createElement("td");
	trModuleLinks.appendChild(tdLink1);
	tdLink1.appendChild(document.createTextNode(trimesterHeaders[0]));
	if (block.trimesters[0][0]) tdLink1.appendChild(buildModuleButton("1", block.trimesters[0][0].id, true));
	const tdLink2 = document.createElement("td");
	trModuleLinks.appendChild(tdLink2);
	tdLink2.appendChild(document.createTextNode(trimesterHeaders[1]));
	if (block.trimesters[1][0]) tdLink2.appendChild(buildModuleButton("2", block.trimesters[1][0].id, true));
	const tdLink3 = document.createElement("td");
	trModuleLinks.appendChild(tdLink3);
	tdLink3.appendChild(document.createTextNode(trimesterHeaders[2]));
	if (block.trimesters[2][0]) tdLink3.appendChild(buildModuleButton("3", block.trimesters[2][0].id, true));
	return { trModuleLinks };
}
function buildModuleButton(buttonText, id, floatRight) {
	const button = document.createElement("a");
	button.href = "#";
	button.setAttribute("onclick", `showView('lessen-les','','id=${id}'); return false;`);
	button.classList.add("lesButton");
	if (floatRight) button.classList.add("float-right");
	button.innerText = buttonText;
	return button;
}
function buildStudentCell(student) {
	const cell = document.createElement("td");
	let studentSpan = document.createElement("span");
	let displayName = String.fromCharCode(NBSP);
	studentSpan.appendChild(document.createTextNode(displayName));
	cell.appendChild(studentSpan);
	if (!student) return cell;
	if (pageState.nameSorting === NameSorting.LastName) displayName = student.naam + " " + student.voornaam;
	else displayName = student.voornaam + " " + student.naam;
	studentSpan.textContent = displayName;
	if (student.allYearSame) studentSpan.classList.add("allYear");
	const button = cell.appendChild(document.createElement("button"));
	button.classList.add("student");
	button.title = student.info;
	button.onclick = async function() {
		let id = await fetchStudentId(student.name);
		if (id <= 0) window.location.href = "/#zoeken?zoek=" + stripStudentName(student.name).replaceAll(" ", "+");
		else window.location.href = "#leerlingen-leerling?id=" + id + ",tab=inschrijvingen";
		return false;
	};
	const iTag = document.createElement("i");
	button.appendChild(iTag);
	iTag.classList.add("fas", "fa-user-alt");
	if (student.notAllTrimsHaveAnInstrument) iTag.classList.add("no3trims");
	return cell;
}
async function fetchStudentId(studentName) {
	let strippedStudentName = stripStudentName(studentName);
	return fetch("/view.php?args=zoeken?zoek=" + encodeURIComponent(strippedStudentName)).then((response) => response.text()).then((_text) => fetch("/views/zoeken/index.view.php")).then((response) => response.text()).then((text) => findStudentId(studentName, text)).catch((err) => {
		console.error("Request failed", err);
		return -1;
	});
}
function findStudentId(studentName, text) {
	studentName = studentName.replaceAll(",", "");
	db3(studentName);
	db3(text);
	let namePos = text.indexOf(studentName);
	if (namePos < 0) return 0;
	let idPos = text.substring(0, namePos).lastIndexOf("'id=", namePos);
	let id = text.substring(idPos, idPos + 10);
	let found = id.match(/\d+/);
	if (found?.length) return parseInt(found[0]);
	throw `No id found for student ${studentName}.`;
}
function sortStudents(students) {
	if (!students) return;
	let comparator = new Intl.Collator();
	let sorting = getSavedNameSorting();
	students.sort((a, b) => {
		if (a.allYearSame && !b.allYearSame) return -1;
		else if (!a.allYearSame && b.allYearSame) return 1;
		else {
			let aName = sorting === NameSorting.LastName ? a.naam + a.voornaam : a.voornaam + a.naam;
			let bName = sorting === NameSorting.LastName ? b.naam + b.voornaam : b.voornaam + b.naam;
			return comparator.compare(aName, bName);
		}
	});
}

//#endregion
//#region typescript/filter.ts
function combineFilters(f1, f2) {
	return {
		context: {
			f1,
			f2
		},
		rowFilter: function(tr, _context) {
			if (!f1.rowFilter(tr, f1.context)) return false;
			return f2.rowFilter(tr, f2.context);
		}
	};
}
function createTextRowFilter(searchText, getRowSearchText) {
	let search_OR_list = searchText.split(",").map((txt) => txt.trim());
	let context = {
		search_OR_list,
		getRowSearchText
	};
	let rowFilter = function(tr, context$1) {
		for (let search of context$1.search_OR_list) {
			let rowText = context$1.getRowSearchText(tr);
			if (match_AND_expression(search, rowText)) return true;
		}
		return false;
	};
	return {
		context,
		rowFilter
	};
}
/**

* Try to match a filter expression of type "string1+string2", where both strings need to be present.

* @param searchText

* @param rowText

* @return true if all strings match

*/
function match_AND_expression(searchText, rowText) {
	let search_AND_list = searchText.split("+").map((txt) => txt.trim());
	for (let search of search_AND_list) {
		let caseText = rowText;
		if (search === search.toLowerCase()) caseText = rowText.toLowerCase();
		if (!caseText.includes(search)) return false;
	}
	return true;
}
function filterTableRows(table, rowFilter) {
	if (typeof table === "string") table = document.getElementById(table);
	return Array.from(table.tBodies[0].rows).filter((tr) => rowFilter.rowFilter(tr, rowFilter.context));
}
function filterTable(table, rowFilter) {
	if (typeof table === "string") table = document.getElementById(table);
	for (let tr of table.tBodies[0].rows) {
		tr.style.visibility = "collapse";
		tr.style.borderColor = "transparent";
	}
	for (let tr of filterTableRows(table, rowFilter)) if (!tr.dataset.keepHidden) {
		tr.style.visibility = "visible";
		tr.style.borderColor = "";
	}
}

//#endregion
//#region typescript/menus.ts
function addMenuItem(menu, title, indentLevel, onClick) {
	let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
	let { first } = emmet.appendChild(menu, `button.naked.dropDownItem${indentClass}{${title}}`);
	let item = first;
	item.onclick = (ev) => {
		closeMenus();
		onClick(ev);
	};
}
function closeMenus() {
	let dropdowns = document.getElementsByClassName("dropDownMenu");
	for (let dropDown of dropdowns) dropDown.classList.remove("show");
}
function onWindowClick(event) {
	if (event.target.matches(".dropDownIgnoreHide")) return;
	closeMenus();
}
function initMenuEvents() {
	window.onclick = onWindowClick;
}
function addMenuSeparator(menu, title, indentLevel) {
	let indentClass = indentLevel ? ".menuIndent" + indentLevel : "";
	let { first } = emmet.appendChild(menu, `div.dropDownSeparator.dropDownIgnoreHide${indentClass}{${title}}`);
	let item = first;
	item.onclick = (ev) => {
		ev.stopPropagation();
	};
}
function setupMenu(container, button) {
	initMenuEvents();
	container.classList.add("dropDownContainer");
	button.classList.add("dropDownIgnoreHide", "dropDownButton");
	let { first } = emmet.appendChild(container, "div.dropDownMenu");
	let menu = first;
	button.onclick = (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		let dropDowwnMenu = ev.target.closest(".dropDownContainer").querySelector(".dropDownMenu");
		if (dropDowwnMenu.classList.contains("show")) {
			closeMenus();
			return;
		}
		closeMenus();
		dropDowwnMenu.classList.add("show");
	};
	return menu;
}

//#endregion
//#region typescript/lessen/filter.ts
function createBlockFilter(filter) {
	return BlockInfo.getAllBlocks().filter(filter);
}
function createRowFilterFromBlockFilter(blocks) {
	let ids = distinct(blocks.map((b) => b.getIds()).flat());
	return {
		context: { ids },
		rowFilter: function(tr, context) {
			return context.ids.includes(parseInt(tr.dataset.blockId));
		}
	};
}
function createQuerySelectorFilter(selector) {
	return {
		context: void 0,
		rowFilter: function(tr, _context) {
			return tr.querySelector(selector) != void 0;
		}
	};
}
function createInverseFilter(filter) {
	return {
		context: filter.context,
		rowFilter: function(tr, context) {
			return !filter.rowFilter(tr, context);
		}
	};
}
function createAncestorFilter(rowPreFilter) {
	let filteredRows = filterTableRows(
		//doesn't really make sense for trimesters, but whatever.
		// Filter original table:
		TRIM_TABLE_ID,
		rowPreFilter
);
	let filteredBlockIds = [...new Set(filteredRows.filter((tr) => tr.dataset.blockId !== "groupTitle").map((tr) => tr.dataset.blockId))];
	let filteredGroupIds = [...new Set(filteredRows.map((tr) => tr.dataset.groupId))];
	let filteredHeaderGroupIds = [...new Set(filteredRows.filter((tr) => tr.dataset.blockId === "groupTitle").map((tr) => tr.dataset.groupId))];
	function siblingsAndAncestorsFilter(tr, context) {
		if (context.filteredHeaderGroupIds.includes(tr.dataset.groupId)) return true;
		if (context.filteredBlockIds.includes(tr.dataset.blockId)) return true;
		return context.filteredGroupIds.includes(tr.dataset.groupId) && tr.classList.contains("groupHeader");
	}
	return {
		context: {
			filteredBlockIds,
			filteredGroupIds,
			filteredHeaderGroupIds
		},
		rowFilter: siblingsAndAncestorsFilter
	};
}
const TXT_FILTER_ID$1 = "txtFilter";
function setFilterInfo(text) {
	document.getElementById(FILTER_INFO_ID).innerText = text;
}
function applyFilters() {
	let pageState$1 = getPageSettings(PageName.Lessen, getDefaultPageSettings());
	pageState$1.searchText = document.getElementById(TXT_FILTER_ID$1).value;
	savePageSettings(pageState$1);
	let extraFilter = void 0;
	if (isTrimesterTableVisible()) {
		let textPreFilter = createTextRowFilter(pageState$1.searchText, (tr) => tr.textContent);
		let preFilter = textPreFilter;
		if (pageState$1.filterOffline) extraFilter = createRowFilterFromBlockFilter(createBlockFilter((b) => b.hasSomeOfflineLessen()));
		else if (pageState$1.filterOnline) extraFilter = createRowFilterFromBlockFilter(createBlockFilter((b) => !b.hasSomeOfflineLessen()));
		else if (pageState$1.filterNoTeacher) extraFilter = createRowFilterFromBlockFilter(createBlockFilter((b) => b.hasMissingTeachers()));
		else if (pageState$1.filterNoMax) extraFilter = createRowFilterFromBlockFilter(createBlockFilter((b) => b.hasMissingMax()));
		else if (pageState$1.filterFullClass) extraFilter = createRowFilterFromBlockFilter(createBlockFilter((b) => b.hasFullClasses()));
		else if (pageState$1.filterOnlineAlc) extraFilter = createRowFilterFromBlockFilter(createBlockFilter((b) => b.hasOnlineAlcClasses()));
		else if (pageState$1.filterWarnings) extraFilter = createRowFilterFromBlockFilter(createBlockFilter((b) => b.hasWarningLessons()));
		if (extraFilter) preFilter = combineFilters(createAncestorFilter(textPreFilter), extraFilter);
		let filter = createAncestorFilter(preFilter);
		filterTable(TRIM_TABLE_ID, filter);
	} else {
		let textFilter = createTextRowFilter(pageState$1.searchText, (tr) => tr.cells[0].textContent);
		let filter = textFilter;
		if (pageState$1.filterOffline) extraFilter = createQuerySelectorFilter("td>i.fa-eye-slash");
		else if (pageState$1.filterOnline) extraFilter = createInverseFilter(createQuerySelectorFilter("td>i.fa-eye-slash"));
		else if (pageState$1.filterNoTeacher) extraFilter = createTextRowFilter("(geen klasleerkracht)", (tr) => tr.cells[0].textContent);
		else if (pageState$1.filterNoMax) extraFilter = createTextRowFilter("999", (tr) => tr.cells[1].textContent);
		else if (pageState$1.filterFullClass) extraFilter = {
			context: void 0,
			rowFilter(tr, context) {
				let scrapeResult = scrapeStudentsCellMeta(tr.cells[1]);
				return scrapeResult.aantal >= scrapeResult.maxAantal;
			}
		};
		else if (pageState$1.filterOnlineAlc) extraFilter = {
			context: void 0,
			rowFilter(tr, context) {
				let scrapeResult = scrapeLesInfo(tr.cells[0]);
				return scrapeResult.online && scrapeResult.alc;
			}
		};
		else if (pageState$1.filterWarnings) extraFilter = createQuerySelectorFilter(".text-warning");
		if (extraFilter) filter = combineFilters(textFilter, extraFilter);
		filterTable(LESSEN_TABLE_ID, filter);
	}
	if (pageState$1.filterOnline) setFilterInfo("Online lessen");
	else if (pageState$1.filterOffline) setFilterInfo("Offline lessen");
	else if (pageState$1.filterNoTeacher) setFilterInfo("Zonder leraar");
	else if (pageState$1.filterNoMax) setFilterInfo("Zonder maximum");
	else if (pageState$1.filterFullClass) setFilterInfo("Volle lessen");
	else if (pageState$1.filterOnlineAlc) setFilterInfo("Online ALC lessen");
	else if (pageState$1.filterWarnings) setFilterInfo("Opmerkingen");
	else setFilterInfo("");
}
function setExtraFilter(set) {
	let pageState$1 = getPageSettings(PageName.Lessen, getDefaultPageSettings());
	pageState$1.filterOffline = false;
	pageState$1.filterOnline = false;
	pageState$1.filterNoTeacher = false;
	pageState$1.filterNoMax = false;
	pageState$1.filterFullClass = false;
	pageState$1.filterOnlineAlc = false;
	pageState$1.filterWarnings = false;
	set(pageState$1);
	savePageSettings(pageState$1);
	applyFilters();
}
function addFilterFields() {
	let divButtonNieuweLes = document.querySelector("#lessen_overzicht > div > button");
	if (!document.getElementById(TXT_FILTER_ID$1)) {
		let pageState$1 = getPageSettings(PageName.Lessen, getDefaultPageSettings());
		let searchField$1 = createSearchField(TXT_FILTER_ID$1, applyFilters, pageState$1.searchText);
		divButtonNieuweLes.insertAdjacentElement("afterend", searchField$1);
		let { first: span, last: idiom } = emmet.insertAfter(searchField$1, "span.btn-group-sm>button.btn.btn-sm.btn-outline-secondary.ml-2>i.fas.fa-list");
		let menu = setupMenu(span, idiom.parentElement);
		addMenuItem(menu, "Toon alles", 0, (_) => setExtraFilter((_$1) => {}));
		addMenuItem(menu, "Filter online lessen", 0, (_) => setExtraFilter((pageState$2) => pageState$2.filterOnline = true));
		addMenuItem(menu, "Filter offline lessen", 0, (_) => setExtraFilter((pageState$2) => pageState$2.filterOffline = true));
		addMenuItem(menu, "Lessen zonder leraar", 0, (_) => setExtraFilter((pageState$2) => pageState$2.filterNoTeacher = true));
		addMenuItem(menu, "Lessen zonder maximum", 0, (_) => setExtraFilter((pageState$2) => pageState$2.filterNoMax = true));
		addMenuItem(menu, "Volle lessen", 0, (_) => setExtraFilter((pageState$2) => pageState$2.filterFullClass = true));
		addMenuItem(menu, "Online ALC lessen", 0, (_) => setExtraFilter((pageState$2) => pageState$2.filterOnlineAlc = true));
		addMenuItem(menu, "Opmerkingen", 0, (_) => setExtraFilter((pageState$2) => pageState$2.filterWarnings = true));
		emmet.insertAfter(idiom.parentElement, `span#${FILTER_INFO_ID}.filterInfo`);
	}
	applyFilters();
}

//#endregion
//#region typescript/lessen/observer.ts
var observer_default$8 = new HashObserver("#lessen-overzicht", onMutation$6);
function onMutation$6(mutation) {
	let btnZoek = document.getElementById("btn_lessen_overzicht_zoeken");
	if (btnZoek) {
		if (!document.getElementById("btn_show_trimesters")) {
			let { first } = emmet.insertAfter(btnZoek, "button.btn.btn-sm.btn-primary.w-100.mt-1#btn_show_trimesters>i.fas.fa-sitemap+{ Toon trimesters}");
			first.onclick = onClickShowTrimesters;
		}
	}
	let lessenOverzicht = document.getElementById(LESSEN_OVERZICHT_ID);
	if (mutation.target !== lessenOverzicht) return false;
	let pageState$1 = getGotoStateOrDefault(PageName.Lessen);
	switch (pageState$1.goto) {
		case Goto.Lessen_trimesters_set_filter:
			pageState$1.goto = Goto.None;
			saveGotoState(pageState$1);
			onClickShowTrimesters();
			return true;
		case Goto.Lessen_trimesters_show:
			pageState$1.goto = Goto.None;
			saveGotoState(pageState$1);
			return true;
	}
	return decorateTable() !== void 0;
}
function onClickShowTrimesters() {
	document.getElementById("lessen_overzicht").innerHTML = "<span class=\"text-muted\">\n                <i class=\"fa fa-cog fa-spin\"></i> <i>Bezig met laden...</i>\n            </span>";
	setTrimesterFilterAndFetch().then((text) => {
		document.getElementById("lessen_overzicht").innerHTML = text;
		showTrimesterTable(decorateTable(), true);
	});
}
async function setTrimesterFilterAndFetch() {
	let params = new URLSearchParams({
		schooljaar: findSchooljaar(),
		domein: "3",
		vestigingsplaats: "",
		vak: "",
		graad: "",
		leerkracht: "",
		ag: "",
		lesdag: "",
		verberg_online: "-1",
		soorten_lessen: "3",
		volzet: "-1"
	});
	let url = "https://administratie.dko3.cloud/views/lessen/overzicht/index.filters.php";
	await fetch(url + "?" + params);
	url = "https://administratie.dko3.cloud/views/lessen/overzicht/index.lessen.php";
	let res = await fetch(url + "?" + params);
	return res.text();
}
function createTrimTableDiv() {
	let trimDiv = document.getElementById(TRIM_DIV_ID);
	if (!trimDiv) {
		trimDiv = document.createElement("div");
		let originalTable = document.getElementById(LESSEN_TABLE_ID);
		originalTable.insertAdjacentElement("afterend", trimDiv);
		trimDiv.id = TRIM_DIV_ID;
	}
	return trimDiv;
}
function decorateTable() {
	let printButton = document.getElementById("btn_print_overzicht_lessen");
	if (!printButton) return void 0;
	let copyLessonButton = printButton.parentElement.querySelector("button:has(i.fa-reply-all)");
	if (copyLessonButton?.title === "") {
		copyLessonButton.title = copyLessonButton.textContent.replaceAll("\n", " ").replaceAll("      ", " ").replaceAll("     ", " ").replaceAll("    ", " ").replaceAll("   ", " ").replaceAll("  ", " ");
		copyLessonButton.childNodes.forEach((node) => {
			if (node.nodeType === Node.TEXT_NODE) node.remove();
		});
		copyLessonButton.querySelector("strong")?.remove();
		copyLessonButton.style.backgroundColor = "red";
		copyLessonButton.style.color = "white";
	}
	let overzichtDiv = document.getElementById(LESSEN_OVERZICHT_ID);
	createTrimTableDiv();
	overzichtDiv.dataset.filterFullClasses = "false";
	let badges = document.getElementsByClassName("badge");
	let hasModules = Array.from(badges).some((el) => el.textContent === "module");
	if (hasModules) addButton(printButton, TRIM_BUTTON_ID, "Toon trimesters", onClickToggleTrimesters, "fa-sitemap");
	addFilterFields();
	return getTrimPageElements();
}
function addButton(printButton, buttonId, title, clickFunction, imageId) {
	let button = document.getElementById(buttonId);
	if (button === null) {
		const button$1 = document.createElement("button");
		button$1.classList.add("btn", "btn-sm", "btn-outline-secondary", "w-100");
		button$1.id = buttonId;
		button$1.style.marginTop = "0";
		button$1.onclick = clickFunction;
		button$1.title = title;
		const buttonContent = document.createElement("i");
		button$1.appendChild(buttonContent);
		buttonContent.classList.add("fas", imageId);
		printButton.insertAdjacentElement("beforebegin", button$1);
	}
}
function onClickToggleTrimesters() {
	showTrimesterTable(getTrimPageElements(), !isTrimesterTableVisible());
}
function isTrimesterTableVisible() {
	return document.getElementById(LESSEN_TABLE_ID).style.display === "none";
}
function getTrimPageElements() {
	return {
		trimTable: document.getElementById(TRIM_TABLE_ID),
		trimTableDiv: createTrimTableDiv(),
		lessenTable: document.getElementById(LESSEN_TABLE_ID),
		trimButton: document.getElementById(TRIM_BUTTON_ID)
	};
}
function showTrimesterTable(trimElements, show) {
	trimElements.trimTable?.remove();
	let inputModules = scrapeModules(trimElements.lessenTable);
	let tableData = buildTableData(inputModules.trimesterModules.concat(inputModules.jaarModules));
	buildTrimesterTable(tableData, trimElements);
	trimElements.lessenTable.style.display = show ? "none" : "table";
	trimElements.trimTable.style.display = show ? "table" : "none";
	trimElements.trimButton.title = show ? "Toon normaal" : "Toon trimesters";
	setButtonHighlighted(TRIM_BUTTON_ID, show);
	setSorteerLine(show);
	applyFilters();
}
function addSortingAnchorOrText() {
	let sorteerDiv = document.getElementById("trimSorteerDiv");
	sorteerDiv.innerHTML = "Sorteer : ";
	if (getSavedNameSorting() === NameSorting.FirstName) emmet.append(sorteerDiv, "a{Naam}[href=\"#\"]+{ | }+strong{Voornaam}");
	else emmet.append(sorteerDiv, "strong{Naam}+{ | }+a{Voornaam}[href=\"#\"]");
	for (let anchor of sorteerDiv.querySelectorAll("a")) anchor.onclick = (mouseEvent) => {
		if (mouseEvent.target.textContent === "Naam") setSavedNameSorting(NameSorting.LastName);
		else setSavedNameSorting(NameSorting.FirstName);
		showTrimesterTable(getTrimPageElements(), true);
		addSortingAnchorOrText();
		return false;
	};
}
function setSorteerLine(showTrimTable) {
	let pageState$1 = getPageSettings(PageName.Lessen, getDefaultPageSettings());
	let oldSorteerSpan = document.querySelector("#lessen_overzicht > span");
	let newGroupingDiv = document.getElementById("trimGroepeerDiv");
	if (!newGroupingDiv) newGroupingDiv = emmet.insertAfter(oldSorteerSpan, "div#trimGroepeerDiv.text-muted").first;
	let newSortingDiv = document.getElementById("trimSorteerDiv");
	if (!newSortingDiv) {
		emmet.insertBefore(newGroupingDiv, "div#trimSorteerDiv.text-muted");
		addSortingAnchorOrText();
	}
	newGroupingDiv.innerText = "Groepeer: ";
	oldSorteerSpan.style.display = showTrimTable ? "none" : "";
	newGroupingDiv.style.display = showTrimTable ? "" : "none";
	appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.InstrumentTeacherHour, pageState$1.grouping, "");
	appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.TeacherInstrumentHour, pageState$1.grouping, " | ");
	appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.TeacherHour, pageState$1.grouping, " | ");
	appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.Instrument, pageState$1.grouping, " | ");
	appendGroupingAnchorOrText(newGroupingDiv, TrimesterGrouping.Teacher, pageState$1.grouping, " | ");
}
function appendGroupingAnchorOrText(target, grouping, activeSorting, separator) {
	let sortingText = "";
	switch (grouping) {
		case TrimesterGrouping.InstrumentTeacherHour:
			sortingText = "instrument+leraar+lesuur";
			break;
		case TrimesterGrouping.TeacherInstrumentHour:
			sortingText = "leraar+instrument+lesuur";
			break;
		case TrimesterGrouping.TeacherHour:
			sortingText = "leraar+lesuur";
			break;
		case TrimesterGrouping.InstrumentHour:
			sortingText = "instrument+lesuur";
			break;
		case TrimesterGrouping.Instrument:
			sortingText = "instrument";
			break;
		case TrimesterGrouping.Teacher:
			sortingText = "leraar";
			break;
	}
	if (separator) separator = "{" + separator + "}+";
	if (activeSorting === grouping) emmet.appendChild(target, separator + "strong{" + sortingText + "}");
	else {
		let button = emmet.appendChild(target, separator + "button.likeLink{" + sortingText + "}").last;
		button.onclick = () => {
			let pageState$1 = getPageSettings(PageName.Lessen, getDefaultPageSettings());
			pageState$1.grouping = grouping;
			savePageSettings(pageState$1);
			showTrimesterTable(getTrimPageElements(), true);
			return false;
		};
	}
}

//#endregion
//#region typescript/les/observer.ts
var observer_default$7 = new HashObserver("#lessen-les", onMutation$5);
function onMutation$5(mutation) {
	let tabLeerlingen = document.getElementById("les_leerlingen_leerlingen");
	if (mutation.target === tabLeerlingen) {
		onLeerlingenChanged();
		return true;
	}
	return false;
}
function onLeerlingenChanged() {
	console.log("Les-Leerlingen changed.");
	addSortVoornaamLink();
}
function addSortVoornaamLink() {
	try {
		let headerSpans = document.querySelectorAll("#les_leerlingen_leerlingen > span");
		let sortSpan = Array.from(headerSpans).find((value) => value.textContent.includes("gesorteerd op:"));
		let graadEnNaam = Array.from(sortSpan.querySelectorAll("a")).find((anchor) => anchor.textContent === "graad en naam");
		const SORT_VOORNAAM_ID = "dko_plugin_sortVoornaam";
		if (document.getElementById(SORT_VOORNAAM_ID)) return;
		let anchorSortVoornaam = document.createElement("a");
		anchorSortVoornaam.id = SORT_VOORNAAM_ID;
		anchorSortVoornaam.href = "#";
		anchorSortVoornaam.innerText = "voornaam";
		anchorSortVoornaam.classList.add("text-muted");
		anchorSortVoornaam.onclick = onSortVoornaam;
		sortSpan.insertBefore(anchorSortVoornaam, graadEnNaam);
		sortSpan.insertBefore(document.createTextNode(" | "), graadEnNaam);
	} catch (e) {}
}
function onSortVoornaam(event) {
	sortVoornaam(event);
	switchNaamVoornaam(event);
	return false;
}
function sortVoornaam(event) {
	let rows = Array.from(document.querySelectorAll("#les_leerlingen_leerlingen > table > tbody > tr"));
	rows.sort((tr1, tr2) => {
		let name1 = tr1.querySelector("td > strong").textContent;
		let name2 = tr2.querySelector("td > strong").textContent;
		let voornaam1 = name1.split(",").pop();
		let voornaam2 = name2.split(",").pop();
		return voornaam1.localeCompare(voornaam2);
	});
	let table = document.querySelector("#les_leerlingen_leerlingen > table");
	rows.forEach((row) => table.tBodies[0].appendChild(row));
	Array.from(document.querySelectorAll("#les_leerlingen_leerlingen > span > a")).forEach((a) => a.classList.add("text-muted"));
	event.target.classList.remove("text-muted");
}
function switchNaamVoornaam(_event) {
	let rows = Array.from(document.querySelectorAll("#les_leerlingen_leerlingen > table > tbody > tr"));
	rows.forEach((tr) => {
		let strong = tr.querySelector("td > strong");
		let name = strong.textContent;
		let split = name.split(",");
		let voornaam = split.pop() ?? "";
		let naam = split.pop() ?? "";
		strong.textContent = voornaam + " " + naam;
	});
}

//#endregion
//#region typescript/academie/observer.ts
var observer_default$6 = new PageObserver(setSchoolBackground);
registerSettingsObserver(setSchoolBackground);
function setSchoolBackground() {
	let { schoolName } = getUserAndSchoolName();
	let isMyAcademy = options.myAcademies.split("\n").filter((needle) => needle !== "").find((needle) => schoolName.includes(needle)) != void 0;
	if (options.myAcademies === "") isMyAcademy = true;
	if (isMyAcademy || getGlobalSettings().globalHide === true || options.markOtherAcademies === false) document.body.classList.remove("otherSchool");
	else document.body.classList.add("otherSchool");
}

//#endregion
//#region typescript/werklijst/buildUren.ts
let isUpdatePaused = true;
let cellChanged = false;
let popoverIndex = 1;
let editableObserver = new MutationObserver((mutationList, observer) => editableObserverCallback(mutationList, observer));
setInterval(onTimer, 5e3);
function onTimer() {
	checkAndUpdate(globalUrenData);
}
let globalUrenData = void 0;
let colDefsArray = [
	{
		key: "vak",
		def: {
			label: "Vak",
			classList: [],
			factor: 1,
			getText: (ctx) => ctx.vakLeraar.vak
		}
	},
	{
		key: "leraar",
		def: {
			label: "Leraar",
			classList: [],
			factor: 1,
			getText: (ctx) => ctx.vakLeraar.leraar.replaceAll("{", "").replaceAll("}", "")
		}
	},
	{
		key: "grjr2_1",
		def: {
			label: "2.1",
			classList: [],
			factor: 1 / 4,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "grjr2_2",
		def: {
			label: "2.2",
			classList: [],
			factor: 1 / 4,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "grjr2_3",
		def: {
			label: "2.3",
			classList: [],
			factor: 1 / 3,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "grjr2_4",
		def: {
			label: "2.4",
			classList: [],
			factor: 1 / 3,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "uren_2e_gr",
		def: {
			label: "uren\n2e gr",
			classList: ["yellow"],
			factor: 1,
			getValue: (ctx) => calcUrenFactored(ctx, [
				"grjr2_1",
				"grjr2_2",
				"grjr2_3",
				"grjr2_4"
			]),
			totals: true,
			calculated: true
		}
	},
	{
		key: "grjr3_1",
		def: {
			label: "3.1",
			classList: [],
			factor: 1 / 3,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "grjr3_2",
		def: {
			label: "3.2",
			classList: [],
			factor: 1 / 3,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "grjr3_3",
		def: {
			label: "3.3",
			classList: [],
			factor: 1 / 2,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "uren_3e_gr",
		def: {
			label: "uren\n3e gr",
			classList: ["yellow"],
			factor: 1,
			getValue: (ctx) => calcUrenFactored(ctx, [
				"grjr3_1",
				"grjr3_2",
				"grjr3_3"
			]),
			totals: true,
			calculated: true
		}
	},
	{
		key: "grjr4_1",
		def: {
			label: "4.1",
			classList: [],
			factor: 1 / 2,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "grjr4_2",
		def: {
			label: "4.2",
			classList: [],
			factor: 1 / 2,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "grjr4_3",
		def: {
			label: "4.3",
			classList: [],
			factor: 1 / 2,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "uren_4e_gr",
		def: {
			label: "uren\n4e gr",
			classList: ["yellow"],
			factor: 1,
			getValue: (ctx) => calcUrenFactored(ctx, [
				"grjr4_1",
				"grjr4_2",
				"grjr4_3"
			]),
			totals: true,
			calculated: true
		}
	},
	{
		key: "grjr_s_1",
		def: {
			label: "S.1",
			classList: [],
			factor: 1 / 2,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "grjr_s_2",
		def: {
			label: "S.2",
			classList: [],
			factor: 1 / 2,
			getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count,
			fill: fillGraadCell
		}
	},
	{
		key: "uren_spec",
		def: {
			label: "uren\nspec",
			classList: ["yellow"],
			factor: 1,
			getValue: (ctx) => calcUrenFactored(ctx, ["grjr_s_1", "grjr_s_2"]),
			totals: true,
			calculated: true
		}
	},
	{
		key: "aantal_lln",
		def: {
			label: "aantal\nlln",
			classList: ["blueish"],
			factor: 1,
			getValue: (ctx) => calcUren(ctx, [
				"grjr2_1",
				"grjr2_2",
				"grjr2_3",
				"grjr2_4",
				"grjr3_1",
				"grjr3_2",
				"grjr3_3",
				"grjr4_1",
				"grjr4_2",
				"grjr4_3",
				"grjr_s_1",
				"grjr_s_2"
			]),
			totals: true,
			calculated: true
		}
	},
	{
		key: "tot_uren",
		def: {
			label: "tot\nuren",
			classList: ["creme"],
			factor: 1,
			getValue: (ctx) => calcUrenFactored(ctx, [
				"grjr2_1",
				"grjr2_2",
				"grjr2_3",
				"grjr2_4",
				"grjr3_1",
				"grjr3_2",
				"grjr3_3",
				"grjr4_1",
				"grjr4_2",
				"grjr4_3",
				"grjr_s_1",
				"grjr_s_2"
			]),
			totals: true,
			calculated: true
		}
	},
	{
		key: "over",
		def: {
			label: "Over",
			classList: [],
			factor: 1,
			getValue: (ctx) => calcOver(ctx),
			calculated: true
		}
	}
];
let colDefs = new Map(colDefsArray.map((def) => [def.key, def.def]));
function getYearKeys(year) {
	let yrPrev = year - 2e3 - 1;
	let yrNow = yrPrev + 1;
	let yrNext = yrPrev + 2;
	let keyPrev = `uren_${yrPrev}_${yrNow}`;
	let keyNext = `uren_${yrNow}_${yrNext}`;
	return {
		yrPrev,
		yrNow,
		yrNext,
		keyPrev,
		keyNext
	};
}
function updateColDefs(year) {
	let { yrPrev, yrNow, yrNext, keyPrev, keyNext } = getYearKeys(year);
	let yearColDefs = new Map();
	yearColDefs.set(keyPrev, {
		label: `Uren\n${yrPrev}-${yrNow}`,
		classList: ["editable_number"],
		factor: 1,
		getValue: (ctx) => parseInt(ctx.data.fromCloud.columnMap.get(`uren_${yrPrev}_${yrNow}`)?.get(ctx.vakLeraar.id)),
		totals: true
	});
	yearColDefs.set(keyNext, {
		label: `Uren\n${yrNow}-${yrNext}`,
		classList: ["editable_number"],
		factor: 1,
		getValue: (ctx) => parseInt(ctx.data.fromCloud.columnMap.get(`uren_${yrNow}_${yrNext}`)?.get(ctx.vakLeraar.id)),
		totals: true
	});
	colDefs = new Map([...yearColDefs, ...new Map(colDefsArray.map((def) => [def.key, def.def]))]);
	let idx = 0;
	colDefs.forEach((colDef) => {
		colDef.colIndex = idx++;
		colDef.total = 0;
	});
}
function calcOver(ctx) {
	let totUren = getColValue(ctx, "tot_uren");
	if (isNaN(totUren)) totUren = 0;
	let urenJaar = getColValue(ctx, ctx.yearKey);
	if (isNaN(urenJaar)) urenJaar = 0;
	return urenJaar - totUren;
}
function getColValue(ctx, colKey) {
	let newCtx = { ...ctx };
	newCtx.colKey = colKey;
	newCtx.colDef = newCtx.colDefs.get(colKey);
	return newCtx.colDef.getValue(newCtx);
}
function editableObserverCallback(mutationList, _observer) {
	if (mutationList.every((mut) => mut.type === "attributes")) return;
	cellChanged = true;
}
function getUrenVakLeraarFileName() {
	return getSchoolIdString() + "_uren_vak_lk_" + findSchooljaar().replace("-", "_") + ".json";
}
function checkAndUpdate(urenData) {
	if (isUpdatePaused) return;
	if (!cellChanged) return;
	cellChanged = false;
	let colKeys = getYearKeys(urenData.year);
	updateCloudColumnMapFromScreen(urenData, colKeys.keyPrev);
	updateCloudColumnMapFromScreen(urenData, colKeys.keyNext);
	cloud.json.upload(getUrenVakLeraarFileName(), urenData.fromCloud.toJson(colKeys.keyPrev, colKeys.keyNext)).then((_r) => {
		console.log("Uploaded uren.");
	});
	recalculate(urenData);
}
function updateCloudColumnMapFromScreen(urenData, colKey) {
	let colDef = colDefs.get(colKey);
	for (let tr of document.querySelectorAll("#" + COUNT_TABLE_ID + " tbody tr")) urenData.fromCloud.columnMap.get(colKey).set(tr.id, tr.children[colDef.colIndex].textContent);
}
function observeTable(observe) {
	const config = {
		attributes: true,
		childList: true,
		subtree: true,
		characterData: true
	};
	let table = document.getElementById(
		//ignore attrubute changes.
		//clear
		//get value when not a calculated value.
		COUNT_TABLE_ID
);
	if (observe) {
		editableObserver.takeRecords();
		editableObserver.observe(table, config);
	} else editableObserver.disconnect();
}
function fillCell(ctx) {
	if (ctx.colDef.getText) {
		ctx.td.innerText = ctx.colDef.getText(ctx);
		return void 0;
	}
	if (ctx.colDef.fill) {
		ctx.colDef.fill(ctx);
		return void 0;
	}
	let theValue = ctx.colDef.getValue(ctx);
	ctx.td.innerText = trimNumber(theValue);
	return theValue;
}
function calculateAndSumCell(colDef, ctx, onlyRecalc) {
	let theValue = void 0;
	if (colDef.calculated || !onlyRecalc) theValue = fillCell(ctx);
	if (colDef.totals) {
		if (!theValue) theValue = colDef.getValue(ctx);
		if (theValue) colDef.total += theValue;
	}
}
function clearTotals() {
	for (let [_colKey, colDef] of colDefs) if (colDef.totals) colDef.total = 0;
}
function recalculate(urenData) {
	isUpdatePaused = true;
	observeTable(false);
	clearTotals();
	let yearKey = getYearKeys(urenData.year).keyNext;
	for (let [vakLeraarKey, vakLeraar] of urenData.vakLeraars) {
		let tr = document.getElementById(createValidId(vakLeraarKey));
		for (let [colKey, colDef] of colDefs) {
			let td = tr.children[colDef.colIndex];
			let ctx = {
				td,
				colKey,
				colDef,
				vakLeraar,
				tr,
				colDefs,
				data: urenData,
				yearKey
			};
			calculateAndSumCell(colDef, ctx, true);
		}
	}
	let trTotal = document.getElementById("__totals__");
	for (let [_colKey, colDef] of colDefs) {
		let td = trTotal.children[colDef.colIndex];
		if (colDef.totals) td.innerText = trimNumber(colDef.total);
	}
	cellChanged = false;
	isUpdatePaused = false;
	observeTable(true);
}
function buildTable(urenData, tableDef) {
	isUpdatePaused = true;
	globalUrenData = urenData;
	let table = document.createElement("table");
	tableDef.tableRef.getOrgTableContainer().insertAdjacentElement("afterend", table);
	table.id = COUNT_TABLE_ID;
	table.classList.add(CAN_SORT, NO_MENU);
	updateColDefs(urenData.year);
	fillTableHeader(table, urenData.vakLeraars);
	let tbody = document.createElement("tbody");
	table.appendChild(tbody);
	let lastVak = "";
	let rowClass = void 0;
	clearTotals();
	let yearKey = getYearKeys(urenData.year).keyNext;
	for (let [vakLeraarKey, vakLeraar] of urenData.vakLeraars) {
		let tr = document.createElement("tr");
		tbody.appendChild(tr);
		tr.dataset["vak_leraar"] = vakLeraarKey;
		tr.id = createValidId(vakLeraarKey);
		if (vakLeraar.vak !== lastVak) rowClass = rowClass === "" ? "darkRow" : "";
		if (rowClass !== "") tr.classList.add(rowClass);
		lastVak = vakLeraar.vak;
		for (let [colKey, colDef] of colDefs) {
			let td = document.createElement("td");
			tr.appendChild(td);
			td.classList.add(...colDef.classList);
			let ctx = {
				td,
				colKey,
				colDef,
				vakLeraar,
				tr,
				colDefs,
				data: urenData,
				yearKey
			};
			calculateAndSumCell(colDef, ctx, false);
		}
	}
	let tFoot = document.createElement("tfoot");
	table.appendChild(tFoot);
	tFoot.classList.add("separatorLine");
	let trTotal = document.createElement("tr");
	tFoot.appendChild(trTotal);
	trTotal.id = "__totals__";
	for (let [_colKey, colDef] of colDefs) {
		let td = document.createElement("td");
		trTotal.appendChild(td);
		if (colDef.totals) td.innerText = trimNumber(colDef.total);
	}
	let editables = table.querySelectorAll("td.editable_number");
	editables.forEach((td) => td.setAttribute("contenteditable", "true"));
	observeTable(true);
	isUpdatePaused = false;
}
function calcUren(ctx, keys) {
	let tot = 0;
	for (let key of keys) {
		let colDef = ctx.colDefs.get(key);
		let cnt = ctx.vakLeraar.countMap.get(colDef.label).students.length;
		tot += cnt;
	}
	return tot;
}
function calcUrenFactored(ctx, keys) {
	let tot = 0;
	for (let key of keys) {
		let colDef = ctx.colDefs.get(key);
		let cnt = ctx.vakLeraar.countMap.get(colDef.label).students.length;
		let factor = colDefs.get(key).factor;
		tot += cnt * factor;
	}
	return tot;
}
function trimNumber(num) {
	if (isNaN(num)) return "";
	return (Math.round(num * 100) / 100).toFixed(2).replace(".00", "");
}
function fillTableHeader(table, _vakLeraars) {
	let thead = document.createElement("thead");
	table.appendChild(thead);
	let tr_head = document.createElement("tr");
	thead.appendChild(tr_head);
	let th = document.createElement("th");
	for (let colDef of colDefs.values()) {
		th = document.createElement("th");
		tr_head.appendChild(th);
		th.innerText = colDef.label;
	}
}
function fillGraadCell(ctx) {
	let graadJaar = ctx.vakLeraar.countMap.get(ctx.colDef.label);
	let button = document.createElement("button");
	ctx.td.appendChild(button);
	if (graadJaar.count === 0) return graadJaar.count;
	button.innerText = graadJaar.count.toString();
	popoverIndex++;
	button.setAttribute("popovertarget", "students_" + popoverIndex);
	let popoverDiv = document.createElement("div");
	ctx.td.appendChild(popoverDiv);
	popoverDiv.id = "students_" + popoverIndex;
	popoverDiv.setAttribute("popover", "auto");
	for (let student of graadJaar.students) {
		let studentDiv = document.createElement("div");
		popoverDiv.appendChild(studentDiv);
		studentDiv.innerText = student.voornaam + " " + student.naam;
		const anchor = document.createElement("a");
		studentDiv.appendChild(anchor);
		anchor.href = "/?#leerlingen-leerling?id=" + student.id + ",tab=inschrijvingen";
		anchor.classList.add("pl-1");
		anchor.dataset.studentid = student.id.toString();
		const iTag = document.createElement("i");
		anchor.appendChild(iTag);
		iTag.classList.add("fas", "fa-user-alt");
	}
	return graadJaar.count;
}

//#endregion
//#region typescript/werklijst/scrapeUren.ts
function scrapeStudent(_tableDef, fetchListener, tr, collection) {
	let student = new StudentInfo();
	student.naam = fetchListener.getColumnText(tr, "naam");
	student.voornaam = fetchListener.getColumnText(tr, "voornaam");
	student.id = parseInt(tr.attributes["onclick"].value.replace("showView('leerlingen-leerling', '', 'id=", ""));
	let leraar = fetchListener.getColumnText(tr, "klasleerkracht");
	let vak = fetchListener.getColumnText(tr, "vak");
	let graadLeerjaar = fetchListener.getColumnText(tr, "graad + leerjaar");
	if (leraar === "") leraar = "{nieuw}";
	if (!isInstrument$1(vak)) {
		console.error("vak is geen instrument!!!");
		return `Vak "${vak}" is geen instrument.`;
	}
	let vakLeraarKey = translateVak(vak) + "_" + leraar;
	if (!collection.has(vakLeraarKey)) {
		let countMap = new Map();
		countMap.set("2.1", {
			count: 0,
			students: []
		});
		countMap.set("2.2", {
			count: 0,
			students: []
		});
		countMap.set("2.3", {
			count: 0,
			students: []
		});
		countMap.set("2.4", {
			count: 0,
			students: []
		});
		countMap.set("3.1", {
			count: 0,
			students: []
		});
		countMap.set("3.2", {
			count: 0,
			students: []
		});
		countMap.set("3.3", {
			count: 0,
			students: []
		});
		countMap.set("4.1", {
			count: 0,
			students: []
		});
		countMap.set("4.2", {
			count: 0,
			students: []
		});
		countMap.set("4.3", {
			count: 0,
			students: []
		});
		countMap.set("S.1", {
			count: 0,
			students: []
		});
		countMap.set("S.2", {
			count: 0,
			students: []
		});
		let vakLeraarObject = {
			vak: translateVak(vak),
			leraar,
			id: createValidId(vakLeraarKey),
			countMap
		};
		collection.set(vakLeraarKey, vakLeraarObject);
	}
	let vakLeraar = collection.get(vakLeraarKey);
	if (!vakLeraar.countMap.has(graadLeerjaar)) vakLeraar.countMap.set(graadLeerjaar, {
		count: 0,
		students: []
	});
	let graadLeraarObject = collection.get(vakLeraarKey).countMap.get(graadLeerjaar);
	graadLeraarObject.count += 1;
	graadLeraarObject.students.push(student);
	return null;
}
function isInstrument$1(vak) {
	switch (vak) {
		case "Muziekatelier":
		case "Groepsmusiceren (jazz pop rock)":
		case "Groepsmusiceren (klassiek)":
		case "Harmonielab":
		case "Instrumentinitiatie - elke trimester een ander instrument":
		case "instrumentinitiatie – piano het hele jaar":
		case "Klanklab elektronische muziek":
		case "Muziektheorie":
		case "Koor (jazz pop rock)":
		case "Koor (musical)":
		case "Arrangeren":
		case "Groepsmusiceren (opera)": return false;
	}
	return true;
}
let subjectAliases = [
	{
		name: "Basklarinet",
		alias: "Klarinet"
	},
	{
		name: "Altfluit",
		alias: "Dwarsfluit"
	},
	{
		name: "Piccolo",
		alias: "Dwarsfluit"
	},
	{
		name: "Trompet",
		alias: "Koper"
	},
	{
		name: "Hoorn",
		alias: "Koper"
	},
	{
		name: "Trombone",
		alias: "Koper"
	},
	{
		name: "Bugel",
		alias: "Koper"
	},
	{
		name: "Eufonium",
		alias: "Koper"
	},
	{
		name: "Altsaxofoon",
		alias: "Saxofoon"
	},
	{
		name: "Sopraansaxofoon",
		alias: "Saxofoon"
	},
	{
		name: "Tenorsaxofoon",
		alias: "Saxofoon"
	}
];
function translateVak(vak) {
	vak = subjectAliases.find((alias) => alias.name === vak)?.alias ?? vak;
	let foundTranslation = false;
	translationDefs.filter((translation) => translation.find !== "").forEach((translation) => {
		if (vak.includes(translation.find)) {
			foundTranslation = true;
			vak = translation.prefix + vak.replace(translation.find, translation.replace) + translation.suffix;
		}
	});
	if (foundTranslation) return vak;
	let defaultTranslation = translationDefs.find((defaultTranslation$1) => defaultTranslation$1.find === "");
	if (defaultTranslation) return defaultTranslation.prefix + vak.replace(defaultTranslation.find, defaultTranslation.replace) + defaultTranslation.suffix;
	return vak;
}
let translationDefs = [
	{
		find: "Altsaxofoon",
		replace: "Saxofoon",
		prefix: "",
		suffix: ""
	},
	{
		find: "Sopraansaxofoon",
		replace: "Saxofoon",
		prefix: "",
		suffix: ""
	},
	{
		find: "Tenorsaxofoon",
		replace: "Saxofoon",
		prefix: "",
		suffix: ""
	},
	{
		find: "(klassiek)",
		replace: "",
		prefix: "K ",
		suffix: ""
	},
	{
		find: "(jazz pop rock)",
		replace: "",
		prefix: "JPR ",
		suffix: ""
	},
	{
		find: "(musical)",
		replace: "",
		prefix: "M ",
		suffix: ""
	},
	{
		find: "(musical 2e graad)",
		replace: "(2e graad)",
		prefix: "M ",
		suffix: ""
	},
	{
		find: "(wereldmuziek)",
		replace: "",
		prefix: "WM ",
		suffix: ""
	},
	{
		find: "instrumentinitiatie",
		replace: "init",
		prefix: "",
		suffix: ""
	},
	{
		find: "",
		replace: "",
		prefix: "K ",
		suffix: ""
	}
];

//#endregion
//#region typescript/werklijst/criteria.ts
async function fetchVakken(clear, schooljaar) {
	if (clear) await sendClearWerklijst();
	await sendAddCriterium(schooljaar, "Vak");
	let text = await fetchCritera(schooljaar);
	const template = document.createElement("template");
	template.innerHTML = text;
	let vakken = template.content.querySelectorAll("#form_field_leerling_werklijst_criterium_vak option");
	return Array.from(vakken).map((vak) => [vak.label, vak.value]);
}
async function fetchCritera(schoolYear) {
	return (await fetch("https://administratie.dko3.cloud/views/leerlingen/werklijst/index.criteria.php?schooljaar=" + schoolYear, { method: "GET" })).text();
}
async function sendAddCriterium(schoolYear, criterium) {
	const formData = new FormData();
	formData.append(`criterium`, criterium);
	formData.append(`schooljaar`, schoolYear);
	await fetch("https://administratie.dko3.cloud/views/leerlingen/werklijst/index.criteria.session_add.php", {
		method: "POST",
		body: formData
	});
}
async function sendClearWerklijst() {
	const formData = new FormData();
	formData.append("session", "leerlingen_werklijst");
	await fetch("/views/util/clear_session.php", {
		method: "POST",
		body: formData
	});
	await fetch("views/leerlingen/werklijst/index.velden.php", { method: "GET" });
}
async function sendCriteria(criteria) {
	const formData = new FormData();
	formData.append("criteria", JSON.stringify(criteria));
	await fetch("/views/leerlingen/werklijst/index.criteria.session_reload.php", {
		method: "POST",
		body: formData
	});
}
async function sendGrouping(grouping) {
	const formData = new FormData();
	formData.append("groepering", grouping);
	await fetch("/views/leerlingen/werklijst/index.groeperen.session_add.php", {
		method: "POST",
		body: formData
	});
}
async function sendFields(fields) {
	const formData = new FormData();
	let fieldCnt = 0;
	for (let field of fields) {
		formData.append(`velden[${fieldCnt}][value]`, field.value);
		formData.append(`velden[${fieldCnt}][text]`, field.text);
		fieldCnt++;
	}
	await fetch("/views/leerlingen/werklijst/index.velden.session_add.php", {
		method: "POST",
		body: formData
	});
}

//#endregion
//#region typescript/werklijst/prefillInstruments.ts
let instrumentSet = new Set([
	"Accordeon",
	"Altfluit",
	"Althoorn",
	"Altklarinet",
	"Altsaxofoon",
	"Altsaxofoon (jazz pop rock)",
	"Altviool",
	"Baglama/saz (wereldmuziek)",
	"Bariton",
	"Baritonsaxofoon",
	"Baritonsaxofoon (jazz pop rock)",
	"Basfluit",
	"Basgitaar (jazz pop rock)",
	"Basklarinet",
	"Bastrombone",
	"Bastuba",
	"Bugel",
	"Cello",
	"Contrabas (jazz pop rock)",
	"Contrabas (klassiek)",
	"Dwarsfluit",
	"Engelse hoorn",
	"Eufonium",
	"Fagot",
	"Gitaar",
	"Gitaar (jazz pop rock)",
	"Harp",
	"Hobo",
	"Hoorn",
	"Keyboard (jazz pop rock)",
	"Klarinet",
	"Kornet",
	"Orgel",
	"Piano",
	"Piano (jazz pop rock)",
	"Pianolab",
	"Piccolo",
	"Slagwerk",
	"Slagwerk (jazz pop rock)",
	"Sopraansaxofoon",
	"Sopraansaxofoon (jazz pop rock)",
	"Tenorsaxofoon",
	"Tenorsaxofoon (jazz pop rock)",
	"Trombone",
	"Trompet",
	"Trompet (jazz pop rock)",
	"Ud (wereldmuziek)",
	"Viool",
	"Zang",
	"Zang (jazz pop rock)",
	"Zang (musical 2e graad)",
	"Zang (musical)"
]);
async function setCriteriaForTeacherHours(schooljaar) {
	await sendClearWerklijst();
	let vakken = await fetchVakken(false, schooljaar);
	let instruments = vakken.filter((vak) => isInstrument(vak[0]));
	let values = instruments.map((vak) => parseInt(vak[1]));
	let valueString = values.join();
	let criteria = [
		{
			"criteria": "Schooljaar",
			"operator": "=",
			"values": schooljaar
		},
		{
			"criteria": "Status",
			"operator": "=",
			"values": "12"
		},
		{
			"criteria": "Uitschrijvingen",
			"operator": "=",
			"values": "0"
		},
		{
			"criteria": "Domein",
			"operator": "=",
			"values": "3"
		},
		{
			"criteria": "Vak",
			"operator": "=",
			"values": valueString
		}
	];
	await sendCriteria(criteria);
	await sendFields([
		{
			value: "vak_naam",
			text: "vak"
		},
		{
			value: "graad_leerjaar",
			text: "graad + leerjaar"
		},
		{
			value: "klasleerkracht",
			text: "klasleerkracht"
		}
	]);
	await sendGrouping("vak_id");
	let pageState$1 = getGotoStateOrDefault(PageName.Werklijst);
	pageState$1.werklijstTableName = UREN_TABLE_STATE_NAME;
	saveGotoState(pageState$1);
	document.querySelector("#btn_werklijst_maken").click();
}
function isInstrument(text) {
	return instrumentSet.has(text);
}

//#endregion
//#region typescript/pageHandlers.ts
var NamedCellTableFetchListener = class NamedCellTableFetchListener {
	onStartFetching;
	onLoaded;
	onFinished;
	requiredHeaderLabels;
	onBeforeLoading;
	headerIndices;
	onColumnsMissing;
	isValidPage;
	constructor(requiredHeaderLabels, onRequiredColumnsMissing) {
		this.requiredHeaderLabels = requiredHeaderLabels;
		this.onColumnsMissing = onRequiredColumnsMissing;
		this.headerIndices = void 0;
		this.isValidPage = false;
	}
	onPageLoaded(tableFetcher, _pageCnt, _text) {
		if (!this.headerIndices) {
			this.headerIndices = NamedCellTableFetchListener.getHeaderIndices(tableFetcher.fetchedTable.getTemplate().content);
			if (!this.hasAllHeadersAndAlert()) {
				this.isValidPage = false;
				if (this.onColumnsMissing) this.onColumnsMissing(tableFetcher);
				else throw "Cannot build table object - required columns missing";
			} else this.isValidPage = true;
		}
	}
	onBeforeLoadingPage(tableFetcher) {
		let orgTableContainer = tableFetcher.tableRef.getOrgTableContainer();
		if (!orgTableContainer) return true;
		this.headerIndices = NamedCellTableFetchListener.getHeaderIndices(orgTableContainer);
		return this.hasAllHeadersAndAlert();
	}
	hasAllHeadersAndAlert() {
		if (!this.hasAllHeaders()) {
			let labelString = this.requiredHeaderLabels.map((label) => "\"" + label.toUpperCase() + "\"").join(", ");
			alert(`Voeg velden ${labelString} toe.`);
			return false;
		}
		return true;
	}
	static getHeaderIndices(element) {
		let headers = element.querySelectorAll("thead th");
		return this.getHeaderIndicesFromHeaderCells(headers);
	}
	static getHeaderIndicesFromHeaderCells(headers) {
		let headerIndices = new Map();
		Array.from(headers).forEach((header, index) => {
			let label = header.innerText;
			if (label.startsWith("e-mailadressen")) headerIndices.set("e-mailadressen", index);
			else headerIndices.set(label, index);
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
};

//#endregion
//#region typescript/table/tableNavigation.ts
var TableNavigation = class {
	step;
	maxCount;
	constructor(step, maxCount) {
		this.step = step;
		this.maxCount = maxCount;
	}
	steps() {
		return Math.ceil(this.maxCount / this.step);
	}
	isOnePage() {
		return this.step >= this.maxCount;
	}
};
function findFirstNavigation(element) {
	element = element ?? document.body;
	let buttonPagination = element.querySelector("button.datatable-paging-numbers");
	if (!buttonPagination) return void 0;
	let buttonContainer = buttonPagination.closest("div");
	if (!buttonContainer) return void 0;
	let rx = /(\d*) tot (\d*) van (\d*)/;
	let matches = buttonPagination.innerText.match(rx);
	let buttons = buttonContainer.querySelectorAll("button.btn-secondary");
	let offsets = Array.from(buttons).filter((btn) => btn.attributes["onclick"]?.value.includes("goto(")).filter((btn) => !btn.querySelector("i.fa-fast-backward")).map((btn) => getGotoNumber(btn.attributes["onclick"].value));
	let numbers = matches.slice(1).map((txt) => parseInt(txt));
	numbers[0] = numbers[0] - 1;
	numbers = numbers.concat(offsets);
	numbers.sort((a, b) => a - b);
	numbers = [...new Set(numbers)];
	return new TableNavigation(numbers[1] - numbers[0], numbers.pop());
}
function getGotoNumber(functionCall) {
	return parseInt(functionCall.substring(functionCall.indexOf("goto(") + 5));
}

//#endregion
//#region typescript/table/tableFetcher.ts
var TableRef = class {
	htmlTableId;
	buildFetchUrl;
	navigationData;
	constructor(htmlTableId, navigationData, buildFetchUrl) {
		this.htmlTableId = htmlTableId;
		this.buildFetchUrl = buildFetchUrl;
		this.navigationData = navigationData;
	}
	getOrgTableContainer() {
		return document.getElementById(this.htmlTableId);
	}
	createElementAboveTable(element) {
		let el = document.createElement(element);
		this.getOrgTableContainer().insertAdjacentElement("beforebegin", el);
		return el;
	}
};
function findTableRefInCode() {
	let foundTableRef = findTable();
	if (!foundTableRef) return void 0;
	let buildFetchUrl = (offset) => `/views/ui/datatable.php?id=${foundTableRef.viewId}&start=${offset}&aantal=0`;
	let navigation = findFirstNavigation();
	if (!navigation) return void 0;
	return new TableRef(foundTableRef.tableId, navigation, buildFetchUrl);
}
function findTable() {
	let table = document.querySelector("div.table-responsive > table");
	let tableId$1 = table.id.replace("table_", "").replace("_table", "");
	let parentDiv = document.querySelector("div#table_" + tableId$1);
	let scripts = Array.from(parentDiv.querySelectorAll("script")).map((script) => script.text).join("\n");
	let goto = scripts.split("_goto(")[1];
	let func = goto.split(/ function *\w/)[0];
	let viewId = / *datatable_id *= *'(.*)'/.exec(func)[1];
	let url = /_table'\).load\('(.*?)\?id='\s*\+\s*datatable_id\s*\+\s*'&start='\s*\+\s*start/.exec(func)[1];
	return {
		tableId: table.id,
		viewId,
		url
	};
}
var TableFetcher = class {
	tableRef;
	calculateTableCheckSum;
	isUsingCached = false;
	shadowTableDate;
	fetchedTable;
	tableHandler;
	listeners;
	constructor(tableRef, calculateTableCheckSum, tableHandler) {
		this.tableRef = tableRef;
		if (!calculateTableCheckSum) throw "Tablechecksum required.";
		this.calculateTableCheckSum = calculateTableCheckSum;
		this.fetchedTable = void 0;
		this.tableHandler = tableHandler;
		this.listeners = [];
	}
	reset() {
		this.clearCache();
		this.tableHandler?.onReset?.(this);
	}
	clearCache() {
		db3(`Clear cache for ${this.tableRef.htmlTableId}.`);
		window.sessionStorage.removeItem(this.getCacheId());
		window.sessionStorage.removeItem(this.getCacheId() + CACHE_DATE_SUFFIX);
		this.fetchedTable = void 0;
	}
	loadFromCache() {
		if (this.tableRef.navigationData.isOnePage()) return null;
		db3(`Loading from cache: ${this.getCacheId()}.`);
		let text = window.sessionStorage.getItem(this.getCacheId());
		let dateString = window.sessionStorage.getItem(this.getCacheId() + CACHE_DATE_SUFFIX);
		if (!text) return void 0;
		return {
			text,
			date: new Date(dateString)
		};
	}
	getCacheId() {
		let checksum = "";
		if (this.calculateTableCheckSum) checksum = "__" + this.calculateTableCheckSum(this);
		let id = this.tableRef.htmlTableId + checksum;
		return id.replaceAll(/\s/g, "");
	}
	async fetch() {
		if (this.fetchedTable) {
			this.onFinished(true);
			return this.fetchedTable;
		}
		let cachedData = this.loadFromCache();
		let succes;
		this.fetchedTable = new FetchedTable(this);
		if (cachedData) {
			this.fetchedTable.addPage(cachedData.text);
			this.shadowTableDate = cachedData.date;
			this.isUsingCached = true;
			this.onPageLoaded(1, cachedData.text);
			this.onLoaded();
			succes = true;
		} else {
			this.isUsingCached = false;
			succes = await this.#fetchPages(this.fetchedTable);
			if (!succes) {
				this.onFinished(succes);
				throw "Failed to fetch the pages.";
			}
			this.fetchedTable.saveToCache();
			this.onLoaded();
		}
		this.onFinished(succes);
		return this.fetchedTable;
	}
	onStartFetching() {
		for (let lst of this.listeners) lst.onStartFetching?.(this);
	}
	onFinished(succes) {
		for (let lst of this.listeners) lst.onFinished?.(this, succes);
	}
	onPageLoaded(pageCnt, text) {
		for (let lst of this.listeners) lst.onPageLoaded?.(this, pageCnt, text);
	}
	onLoaded() {
		for (let lst of this.listeners) lst.onLoaded?.(this);
	}
	onBeforeLoadingPage() {
		for (let lst of this.listeners) if (lst.onBeforeLoadingPage) {
			if (!lst.onBeforeLoadingPage(this)) return false;
		}
		return true;
	}
	async #fetchPages(fetchedTable) {
		if (!this.onBeforeLoadingPage()) return false;
		await this.#doFetchAllPages(fetchedTable);
		return true;
	}
	async #doFetchAllPages(fetchedTable) {
		try {
			this.onStartFetching();
			let pageCnt = 0;
			while (true) {
				console.log("fetching page " + fetchedTable.getNextPageNumber());
				let response = await fetch(this.tableRef.buildFetchUrl(fetchedTable.getNextOffset()));
				let text = await response.text();
				fetchedTable.addPage(text);
				pageCnt++;
				this.onPageLoaded(pageCnt, text);
				if (pageCnt >= this.tableRef.navigationData.steps()) break;
			}
		} finally {}
	}
	addListener(listener) {
		this.listeners.push(listener);
	}
};
var FetchedTable = class {
	shadowTableTemplate;
	tableFetcher;
	lastPageNumber;
	lastPageStartRow;
	constructor(tableDef) {
		this.tableFetcher = tableDef;
		this.lastPageNumber = -1;
		this.lastPageStartRow = 0;
		this.shadowTableTemplate = document.createElement("template");
	}
	getRows() {
		let template = this.shadowTableTemplate;
		return template.content.querySelectorAll("tbody tr:not(:has(i.fa-meh))");
	}
	getRowsAsArray = () => Array.from(this.getRows());
	getLastPageRows = () => this.getRowsAsArray().slice(this.lastPageStartRow);
	getLastPageNumber = () => this.lastPageNumber;
	getNextPageNumber = () => this.lastPageNumber + 1;
	getNextOffset = () => this.getNextPageNumber() * this.tableFetcher.tableRef.navigationData.step;
	getTemplate = () => this.shadowTableTemplate;
	saveToCache() {
		db3(`Caching ${this.tableFetcher.getCacheId()}.`);
		window.sessionStorage.setItem(this.tableFetcher.getCacheId(), this.shadowTableTemplate.innerHTML);
		window.sessionStorage.setItem(this.tableFetcher.getCacheId() + CACHE_DATE_SUFFIX, new Date().toJSON());
	}
	addPage(text) {
		let pageTemplate;
		pageTemplate = document.createElement("template");
		pageTemplate.innerHTML = text;
		let rows = pageTemplate.content.querySelectorAll("tbody > tr");
		this.lastPageStartRow = this.getRows().length;
		if (this.lastPageNumber === -1) this.shadowTableTemplate.innerHTML = text;
		else this.shadowTableTemplate.content.querySelector("tbody").append(...rows);
		this.lastPageNumber++;
	}
};

//#endregion
//#region typescript/table/observer.ts
var observer_default$5 = new BaseObserver(void 0, new AllPageFilter(), onMutation$4);
function onMutation$4(_mutation) {
	let navigationBars = getBothToolbars();
	if (!navigationBars) return;
	if (!findTableRefInCode()?.navigationData.isOnePage()) addTableNavigationButton(navigationBars, DOWNLOAD_TABLE_BTN_ID, "download full table", () => {
		downloadTableRows().then((_r) => {});
	}, "fa-arrow-down");
	if (document.querySelector("main div.table-responsive table thead")) {
		let table = document.querySelector("main div.table-responsive table");
		decorateTableHeader(document.querySelector("main div.table-responsive table"));
	}
	let canSort = document.querySelector("table." + CAN_SORT);
	if (canSort) decorateTableHeader(canSort);
	return true;
}
let tableCriteriaBuilders = new Map();
function getChecksumBuilder(tableId$1) {
	let builder = tableCriteriaBuilders.get(tableId$1);
	if (builder) return builder;
	return (_tableFetcher) => "";
}
function registerChecksumHandler(tableId$1, checksumHandler) {
	tableCriteriaBuilders.set(tableId$1, checksumHandler);
}

//#endregion
//#region typescript/infoBar.ts
var InfoBar = class {
	divInfoContainer;
	divInfoLine;
	divTempLine;
	divExtraLine;
	tempMessage;
	divCacheInfo;
	constructor(divInfoContainer) {
		this.divInfoContainer = divInfoContainer;
		this.divInfoContainer.id = INFO_CONTAINER_ID;
		this.divInfoContainer.innerHTML = "";
		this.divExtraLine = emmet.appendChild(divInfoContainer, `div#${INFO_EXTRA_ID}.infoMessage`).last;
		this.divInfoLine = emmet.appendChild(divInfoContainer, "div.infoLine").last;
		this.divTempLine = emmet.appendChild(divInfoContainer, `div#${INFO_TEMP_ID}.infoMessage.tempLine`).last;
		this.divCacheInfo = emmet.appendChild(this.divInfoContainer, `div#${INFO_CACHE_ID}.cacheInfo`).last;
		this.tempMessage = "";
	}
	setCacheInfo(cacheInfo, reset_onclick) {
		this.updateCacheInfo(cacheInfo, reset_onclick);
	}
	setTempMessage(msg) {
		this.tempMessage = msg;
		this.#updateTempMessage();
		setTimeout(this.clearTempMessage.bind(this), 4e3);
	}
	clearTempMessage() {
		this.tempMessage = "";
		this.#updateTempMessage();
	}
	#updateTempMessage() {
		this.divTempLine.innerHTML = this.tempMessage;
	}
	setInfoLine(message) {
		this.divInfoLine.innerHTML = message;
	}
	clearCacheInfo() {
		this.divCacheInfo.innerHTML = "";
	}
	updateCacheInfo(info, reset_onclick) {
		this.divCacheInfo.innerHTML = info;
		let button = emmet.appendChild(this.divCacheInfo, "button.likeLink").first;
		button.innerHTML = "refresh";
		button.onclick = reset_onclick;
	}
	setExtraInfo(message, click_element_id, callback) {
		this.divExtraLine.innerHTML = message;
		if (click_element_id) document.getElementById(click_element_id).onclick = callback;
	}
};

//#endregion
//#region typescript/progressBar.ts
var ProgressBar = class {
	barElement;
	containerElement;
	maxCount;
	count;
	constructor(containerElement, barElement) {
		this.barElement = barElement;
		this.containerElement = containerElement;
		this.hide();
		this.maxCount = 0;
		this.count = 0;
	}
	reset(maxCount) {
		this.maxCount = maxCount;
		this.count = 0;
		this.barElement.innerHTML = "";
		for (let i = 0; i < maxCount; i++) {
			let block = document.createElement("div");
			this.barElement.appendChild(block);
			block.classList.add("progressBlock");
		}
	}
	start(maxCount) {
		this.reset(maxCount);
		this.containerElement.style.display = "block";
		this.next();
	}
	hide() {
		this.containerElement.style.display = "none";
	}
	stop() {
		this.hide();
	}
	next() {
		if (this.count >= this.maxCount) return false;
		this.barElement.children[this.count].classList.remove("iddle", "loaded");
		this.barElement.children[this.count].classList.add("loading");
		for (let i = 0; i < this.count; i++) {
			this.barElement.children[i].classList.remove("iddle", "loading");
			this.barElement.children[i].classList.add("loaded");
		}
		for (let i = this.count + 1; i < this.maxCount; i++) {
			this.barElement.children[i].classList.remove("loaded", "loading");
			this.barElement.children[i].classList.add("iddle");
		}
		this.count++;
		return true;
	}
};
function insertProgressBar(container, text = "") {
	container.innerHTML = "";
	let { first: divProgressLine, last: divProgressBar } = emmet.appendChild(container, `div.infoLine${PROGRESS_BAR_ID}>div.progressText{${text}}+div.progressBar`);
	return new ProgressBar(divProgressLine, divProgressBar);
}

//#endregion
//#region typescript/table/loadAnyTable.ts
async function getTableRefFromHash(hash) {
	await fetch("https://administratie.dko3.cloud/#" + hash).then((res) => res.text());
	let view = await fetch("view.php?args=" + hash).then((res) => res.text());
	let index_viewUrl = getDocReadyLoadUrl(view);
	let index_view = await fetch(index_viewUrl).then((res) => res.text());
	let htmlTableId = getDocReadyLoadScript(index_view).find("$", "(", "'#").clipTo("'").result();
	if (!htmlTableId) htmlTableId = getDocReadyLoadScript(index_view).find("$", "(", "\"#").clipTo("\"").result();
	let someUrl = getDocReadyLoadUrl(index_view);
	if (!someUrl.includes("ui/datatable.php")) {
		let someCode = await fetch(someUrl).then((res) => res.text());
		someUrl = getDocReadyLoadUrl(someCode);
	}
	let datatableUrl = someUrl;
	let datatable = await fetch(datatableUrl).then((result) => result.text());
	let scanner = new TokenScanner(datatable);
	let datatable_id = "";
	let tableNavUrl = "";
	scanner.find("var", "datatable_id", "=").getString((res) => {
		datatable_id = res;
	}).clipTo("</script>").find(".", "load", "(").getString((res) => tableNavUrl = res).result();
	tableNavUrl += datatable_id + "&pos=top";
	let tableNavText = await fetch(tableNavUrl).then((res) => res.text().then());
	let div = document.createElement("div");
	div.innerHTML = tableNavText;
	let tableNav = findFirstNavigation(div);
	console.log(tableNav);
	let buildFetchUrl = (offset) => `/views/ui/datatable.php?id=${datatable_id}&start=${offset}&aantal=0`;
	return new TableRef(htmlTableId, tableNav, buildFetchUrl);
}
async function getTableFromHash(hash, clearCache, infoBarListener) {
	let tableRef = await getTableRefFromHash(hash);
	console.log(tableRef);
	let tableFetcher = new TableFetcher(tableRef, getChecksumBuilder(tableRef.htmlTableId));
	tableFetcher.addListener(infoBarListener);
	if (clearCache) tableFetcher.clearCache();
	let fetchedTable = await tableFetcher.fetch();
	await setViewFromCurrentUrl();
	return fetchedTable;
}
function findDocReady(scanner) {
	return scanner.find("$", "(", "document", ")", ".", "ready", "(");
}
function getDocReadyLoadUrl(text) {
	let scanner = new TokenScanner(text);
	while (true) {
		let docReady = findDocReady(scanner);
		if (!docReady.valid) return void 0;
		let url = docReady.clone().clipTo("</script>").find(".", "load", "(").clipString().result();
		if (url) return url;
		scanner = docReady;
	}
}
function getDocReadyLoadScript(text) {
	let scanner = new TokenScanner(text);
	while (true) {
		let docReady = findDocReady(scanner);
		if (!docReady.valid) return void 0;
		let script = docReady.clone().clipTo("</script>");
		let load = script.clone().find(".", "load", "(");
		if (load.valid) return script;
		scanner = docReady;
	}
}
function escapeRegexChars(text) {
	return text.replaceAll("\\", "\\\\").replaceAll("^", "\\^").replaceAll("$", "\\$").replaceAll(".", "\\.").replaceAll("|", "\\|").replaceAll("?", "\\?").replaceAll("*", "\\*").replaceAll("+", "\\+").replaceAll("(", "\\(").replaceAll(")", "\\)").replaceAll("[", "\\[").replaceAll("]", "\\]").replaceAll("{", "\\{").replaceAll("}", "\\}");
}
var ScannerElse = class {
	scannerIf;
	constructor(scannerIf) {
		this.scannerIf = scannerIf;
	}
	not(callback) {
		if (!this.scannerIf.yes) callback?.(this.scannerIf.scanner);
		return this.scannerIf.scanner;
	}
};
var ScannerIf = class {
	yes;
	scanner;
	constructor(yes, scanner) {
		this.yes = yes;
		this.scanner = scanner;
	}
	then(callback) {
		if (this.yes) callback(this.scanner);
		return new ScannerElse(this);
	}
};
var TokenScanner = class TokenScanner {
	valid;
	source;
	cursor;
	constructor(text) {
		this.valid = true;
		this.source = text;
		this.cursor = text;
	}
	result() {
		if (this.valid) return this.cursor;
		return void 0;
	}
	find(...tokens) {
		return this.#find("", tokens);
	}
	match(...tokens) {
		return this.#find("^\\s*", tokens);
	}
	#find(prefix, tokens) {
		if (!this.valid) return this;
		let rxString = prefix + tokens.map((token) => escapeRegexChars(token) + "\\s*").join("");
		let match$1 = RegExp(rxString).exec(this.cursor);
		if (match$1) {
			this.cursor = this.cursor.substring(match$1.index + match$1[0].length);
			return this;
		}
		this.valid = false;
		return this;
	}
	ifMatch(...tokens) {
		if (!this.valid) return new ScannerIf(true, this);
		this.match(...tokens);
		if (this.valid) return new ScannerIf(true, this);
		else {
			this.valid = true;
			return new ScannerIf(false, this);
		}
	}
	clip(len) {
		if (!this.valid) return this;
		this.cursor = this.cursor.substring(0, len);
		return this;
	}
	clipTo(end) {
		if (!this.valid) return this;
		let found = this.cursor.indexOf(end);
		if (found < 0) {
			this.valid = false;
			return this;
		}
		this.cursor = this.cursor.substring(0, found);
		return this;
	}
	clone() {
		let newScanner = new TokenScanner(this.cursor);
		newScanner.valid = this.valid;
		return newScanner;
	}
	clipString() {
		let isString = false;
		this.ifMatch("'").then((result) => {
			isString = true;
			return result.clipTo("'");
		}).not().ifMatch("\"").then((result) => {
			isString = true;
			return result.clipTo("\"");
		}).not();
		this.valid = this.valid && isString;
		return this;
	}
	getString(callback) {
		let subScanner = this.clone();
		let result = subScanner.clipString().result();
		if (result) {
			callback(result);
			this.ifMatch("'").then((result$1) => result$1.find("'")).not().ifMatch("\"").then((result$1) => result$1.find("\"")).not();
		}
		return this;
	}
};
async function downloadTableRows() {
	let result = createDefaultTableFetcher();
	if ("error" in result) {
		console.error(result.error);
		return;
	}
	let { tableFetcher } = result.result;
	tableFetcher.tableHandler = new TableHandlerForHeaders();
	let fetchedTable = await tableFetcher.fetch();
	let fetchedRows = fetchedTable.getRows();
	let tableContainer = fetchedTable.tableFetcher.tableRef.getOrgTableContainer();
	tableContainer.querySelector("tbody").replaceChildren(...fetchedRows);
	tableContainer.querySelector("table").classList.add("fullyFetched");
	executeTableCommands(fetchedTable.tableFetcher.tableRef);
	return fetchedTable;
}
async function checkAndDownloadTableRows() {
	let tableRef = findTableRefInCode();
	if (tableRef.getOrgTableContainer().querySelector("table").classList.contains("fullyFetched")) return tableRef;
	await downloadTableRows();
	return tableRef;
}
var InfoBarTableFetchListener = class {
	infoBar;
	progressBar;
	constructor(infoBar, progressBar) {
		this.infoBar = infoBar;
		this.progressBar = progressBar;
	}
	onStartFetching(tableFetcher) {
		this.progressBar.start(tableFetcher.tableRef.navigationData.steps());
	}
	onLoaded(tableFetcher) {
		if (tableFetcher.isUsingCached) {
			let reset_onclick = (e) => {
				e.preventDefault();
				tableFetcher.reset();
				downloadTableRows().then((_fetchedTable) => {});
				return true;
			};
			this.infoBar.setCacheInfo(`Gegevens uit cache, ${millisToString(new Date().getTime() - tableFetcher.shadowTableDate.getTime())} oud. `, reset_onclick);
		}
	}
	onBeforeLoadingPage(_tableFetcher) {
		return true;
	}
	onFinished(_tableFetcher) {
		this.progressBar.stop();
	}
	onPageLoaded(_tableFetcher, _pageCnt, _text) {
		this.progressBar.next();
	}
};
function createDefaultTableRefAndInfoBar() {
	let tableRef = findTableRefInCode();
	if (!tableRef) return { error: "Cannot find table." };
	document.getElementById(INFO_CONTAINER_ID)?.remove();
	let divInfoContainer = tableRef.createElementAboveTable("div");
	let infoBar = new InfoBar(divInfoContainer.appendChild(document.createElement("div")));
	let progressBar = insertProgressBar(infoBar.divInfoLine, "loading pages... ");
	return { result: {
		tableRef,
		infoBar,
		progressBar
	} };
}
function createDefaultTableFetcher() {
	let result = createDefaultTableRefAndInfoBar();
	if ("error" in result) return { error: result.error };
	let { tableRef, infoBar, progressBar } = result.result;
	let tableFetcher = new TableFetcher(tableRef, getChecksumBuilder(tableRef.htmlTableId));
	let infoBarListener = new InfoBarTableFetchListener(infoBar, progressBar);
	tableFetcher.addListener(infoBarListener);
	return { result: {
		tableFetcher,
		infoBar,
		progressBar,
		infoBarListener
	} };
}

//#endregion
//#region typescript/table/tableHeaders.ts
function sortRows(cmpFunction, header, rows, index, descending) {
	let cmpDirectionalFunction;
	if (descending) {
		cmpDirectionalFunction = (a, b) => cmpFunction(b.cells[index], a.cells[index]);
		header.classList.add("sortDescending");
	} else {
		cmpDirectionalFunction = (a, b) => cmpFunction(a.cells[index], b.cells[index]);
		header.classList.add("sortAscending");
	}
	rows.sort((a, b) => cmpDirectionalFunction(a, b));
}
function cmpAlpha(a, b) {
	return a.innerText.localeCompare(b.innerText);
}
function cmpDate(a, b) {
	return normalizeDate(a.innerText).localeCompare(normalizeDate(b.innerText));
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
function sortTableByColumn(table, index, descending) {
	let header = table.tHead.children[0].children[index];
	let rows = Array.from(table.tBodies[0].rows);
	for (let thead of table.tHead.children[0].children) thead.classList.remove("sortAscending", "sortDescending");
	let cmpFunc = cmpAlpha;
	if (isColumnProbablyNumeric(table, index)) cmpFunc = cmpNumber;
	else if (isColumnProbablyDate(table, index)) cmpFunc = cmpDate;
	try {
		sortRows(cmpFunc, header, rows, index, descending);
	} catch (e) {
		console.error(e);
		if (cmpFunc !== cmpAlpha) sortRows(cmpAlpha, header, rows, index, descending);
	}
	rows.forEach((row) => table.tBodies[0].appendChild(row));
}
function copyFullTable(table) {
	let headerCells = table.tHead.children[0].children;
	let headers = [...headerCells].filter((cell) => cell.style.display !== "none").map((cell) => cell.innerText);
	let rows = table.tBodies[0].children;
	let cells = [...rows].map((row) => [...row.cells].filter((cell) => cell.style.display !== "none").map((cell) => cell.innerText));
	createAndCopyTable(headers, cells);
}
function copyOneColumn(table, index) {
	createAndCopyTable([table.tHead.children[0].children[index].innerText], [...table.tBodies[0].rows].map((row) => [row.cells[index].innerText]));
}
function createAndCopyTable(headers, cols) {
	navigator.clipboard.writeText(createTable(headers, cols).outerHTML).then((_r) => {});
}
function reSortTableByColumn(ev, table) {
	let header = table.tHead.children[0].children[getColumnIndex(ev)];
	let wasAscending = header.classList.contains("sortAscending");
	forTableDo(ev, (_fetchedTable, index) => sortTableByColumn(table, index, wasAscending));
}
function isColumnProbablyDate(table, index) {
	let rows = Array.from(table.tBodies[0].rows);
	return stringToDate(rows[0].cells[index].textContent);
}
function stringToDate(text) {
	let reDate = /^(\d\d)[-\/](\d\d)[-\/](\d\d\d\d)/;
	let matches = text.match(reDate);
	if (!matches) return void 0;
	return new Date(matches[3] + "-" + matches[2] + "/" + matches[1]);
}
function isColumnProbablyNumeric(table, index) {
	let rows = Array.from(table.tBodies[0].rows);
	const MAX_SAMPLES = 100;
	let samples = rangeGenerator(0, rows.length, rows.length > MAX_SAMPLES ? rows.length / MAX_SAMPLES : 1).map((float) => Math.floor(float));
	return !samples.map((rowIndex) => rows[rowIndex]).some((row) => {
		return isNaN(Number(row.children[index].innerText));
	});
}
function decorateTableHeader(table) {
	if (table.tHead.classList.contains("clickHandler")) return;
	table.tHead.classList.add("clickHandler");
	if (!options.showTableHeaders) return;
	Array.from(table.tHead.children[0].children).forEach((colHeader) => {
		colHeader.onclick = (ev) => {
			reSortTableByColumn(ev, table);
		};
		if (table.classList.contains(
			//just to be sure.
			//THEAD
			NO_MENU
)) return;
		let { first: span, last: idiom } = emmet.appendChild(colHeader, "span>button.miniButton.naked>i.fas.fa-list");
		let menu = setupMenu(span, idiom.parentElement);
		addMenuItem(menu, "Toon unieke waarden", 0, (ev) => {
			forTableDo(ev, showDistinctColumn);
		});
		addMenuItem(menu, "Verberg kolom", 0, (ev) => {
			console.log("verberg kolom");
			forTableColumnDo(ev, hideColumn);
		});
		addMenuItem(menu, "Toon alle kolommen", 0, (ev) => {
			console.log("verberg kolom");
			forTableColumnDo(ev, showColumns);
		});
		addMenuSeparator(menu, "Sorteer", 0);
		addMenuItem(menu, "Laag naar hoog (a > z)", 1, (ev) => {
			forTableDo(ev, (_fetchedTable, index) => sortTableByColumn(table, index, false));
		});
		addMenuItem(menu, "Hoog naar laag (z > a)", 1, (ev) => {
			forTableDo(ev, (_fetchedTable, index) => sortTableByColumn(table, index, true));
		});
		addMenuSeparator(menu, "Sorteer als:", 1);
		addMenuItem(menu, "Tekst", 2, (_ev) => {});
		addMenuItem(menu, "Getallen", 2, (_ev) => {});
		addMenuSeparator(menu, "Kopieer nr klipbord", 0);
		addMenuItem(menu, "Kolom", 1, (ev) => {
			forTableDo(ev, (_fetchedTable, index) => copyOneColumn(table, index));
		});
		addMenuItem(menu, "Hele tabel", 1, (ev) => {
			forTableDo(ev, (_fetchedTable, _index) => copyFullTable(table));
		});
		addMenuSeparator(menu, "<= Samenvoegen", 0);
		addMenuItem(menu, "met spatie", 1, (ev) => {
			forTableColumnDo(ev, createTwoColumnsCmd(Direction.LEFT, mergeColumnWithSpace));
		});
		addMenuItem(menu, "met comma", 1, (ev) => {
			forTableColumnDo(ev, createTwoColumnsCmd(Direction.LEFT, mergeColumnWithComma));
		});
		addMenuSeparator(menu, "Verplaatsen", 0);
		addMenuItem(menu, "<=", 1, (ev) => {
			forTableColumnDo(ev, createTwoColumnsCmd(Direction.LEFT, swapColumns));
		});
		addMenuItem(menu, "=>", 1, (ev) => {
			forTableColumnDo(ev, createTwoColumnsCmd(Direction.RIGHT, swapColumns));
		});
	});
	relabelHeaders(table.tHead.children[0]);
}
function getDistinctColumn(tableContainer, index) {
	let rows = Array.from(tableContainer.querySelector("tbody").rows);
	return distinct(rows.map((row) => row.children[index].textContent)).sort();
}
var TableHandlerForHeaders = class {
	onReset(_tableDef) {
		console.log("RESET");
	}
};
function getColumnIndex(ev) {
	let td = ev.target;
	if (td.tagName !== "TD") td = td.closest("TH");
	return Array.prototype.indexOf.call(td.parentElement.children, td);
}
function executeTableCommands(tableRef) {
	let cmds = getPageTransientStateValue(GLOBAL_COMMAND_BUFFER_KEY, []);
	console.log("Executing:");
	console.log(cmds);
	for (let cmd of cmds) executeCmd(cmd, tableRef, true);
}
function forTableDo(ev, doIt) {
	ev.preventDefault();
	ev.stopPropagation();
	checkAndDownloadTableRows().then((tableRef) => {
		doIt(tableRef, getColumnIndex(ev));
	});
}
function forTableColumnDo(ev, cmdDef) {
	ev.preventDefault();
	ev.stopPropagation();
	checkAndDownloadTableRows().then((tableRef) => {
		let index = getColumnIndex(ev);
		let cmd = {
			cmdDef,
			index
		};
		executeCmd(cmd, tableRef, false);
		let cmds = getPageTransientStateValue(GLOBAL_COMMAND_BUFFER_KEY, []);
		cmds.push(cmd);
		relabelHeaders(tableRef.getOrgTableContainer().querySelector("thead>tr"));
	});
}
function executeCmd(cmd, tableRef, onlyBody) {
	let context = cmd.cmdDef.getContext?.(tableRef, cmd.index);
	let rows;
	if (onlyBody) rows = tableRef.getOrgTableContainer().querySelector("tbody").rows;
	else rows = tableRef.getOrgTableContainer().querySelectorAll("tr");
	for (let row of rows) cmd.cmdDef.doForRow(row, cmd.index, context);
}
function showDistinctColumn(tableRef, index) {
	let cols = getDistinctColumn(tableRef.getOrgTableContainer(), index);
	let tmpDiv = document.createElement("div");
	let tbody = emmet.appendChild(tmpDiv, "table>tbody").last;
	for (let col of cols) emmet.appendChild(tbody, `tr>td>{${col}}`);
	let headerRow = tableRef.getOrgTableContainer().querySelector("thead>tr");
	let headerNodes = [...headerRow.querySelectorAll("th")[index].childNodes];
	let headerText = headerNodes.filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(" ");
	openTab(tmpDiv.innerHTML, headerText + " (uniek)");
}
let hideColumn = { doForRow: function(row, index, _context) {
	row.cells[index].style.display = "none";
} };
let showColumns = { doForRow: function(row, _index, _context) {
	for (let cell of row.cells) cell.style.display = "";
} };
function mergeColumnWithSpace(row, index, leftIndex) {
	mergeColumnToLeft(row, index, leftIndex, " ");
}
function mergeColumnWithComma(row, index, leftIndex) {
	mergeColumnToLeft(row, index, leftIndex, ", ");
}
function mergeColumnToLeft(row, index, leftIndex, separator) {
	if (index === 0) return;
	if (row.parentElement.tagName == "TBODY") {
		row.cells[index].style.display = "none";
		row.cells[leftIndex].innerText += separator + row.cells[index].innerText;
	} else {
		row.cells[index].style.display = "none";
		let firstTextNode = [...row.cells[leftIndex].childNodes].filter((node) => node.nodeType === Node.TEXT_NODE)[0];
		let secondTextNode = [...row.cells[index].childNodes].filter((node) => node.nodeType === Node.TEXT_NODE)[0];
		if (firstTextNode && secondTextNode) firstTextNode.textContent += separator + secondTextNode.textContent;
	}
}
function relabelHeaders(headerRow) {
	for (let cell of headerRow.cells) cell.classList.remove("shiftMenuLeft");
	headerRow.cells[headerRow.cells.length - 1].classList.add("shiftMenuLeft");
}
function findNextVisibleCell(headerRow, indexes) {
	let index = void 0;
	for (let i of indexes) if (headerRow.children[i].style.display !== "none") {
		index = i;
		break;
	}
	return index;
}
var Direction = /* @__PURE__ */ function(Direction$1) {
	Direction$1[Direction$1["LEFT"] = 0] = "LEFT";
	Direction$1[Direction$1["RIGHT"] = 1] = "RIGHT";
	return Direction$1;
}(Direction || {});
function createTwoColumnsCmd(direction, twoColumnFunc) {
	return {
		getContext: function(tableRef, index) {
			let row = tableRef.getOrgTableContainer().querySelector("thead>tr");
			let cellRange = direction === Direction.LEFT ? range(index - 1, -1) : range(index + 1, row.cells.length);
			return findNextVisibleCell(row, cellRange);
		},
		doForRow: function(row, index, context) {
			twoColumnFunc(row, index, context);
		}
	};
}
function swapColumns(row, index1, index2) {
	if (index1 == void 0 || index2 == void 0) return;
	if (index1 > index2) [index1, index2] = [index2, index1];
	row.children[index1].parentElement.insertBefore(row.children[index2], row.children[index1]);
}

//#endregion
//#region typescript/werklijst/urenData.ts
var UrenData = class {
	year;
	fromCloud;
	vakLeraars;
	constructor(year, cloudData, vakLeraars) {
		this.year = year;
		this.fromCloud = cloudData;
		this.vakLeraars = vakLeraars;
	}
};
var JsonCloudData = class {
	version;
	columns;
	constructor(object) {
		this.version = "1.0";
		this.columns = [];
		if (object) Object.assign(this, object);
	}
};
var CloudData = class {
	columnMap;
	constructor(jsonCloudData) {
		this.#buildMapFromJsonData(jsonCloudData);
	}
	#buildMapFromJsonData(jsonCloudData) {
		for (let column of jsonCloudData.columns) column.rowMap = new Map(column.rows.map((row) => [row.key, row.value]));
		this.columnMap = new Map(jsonCloudData.columns.map((col) => [col.key, col.rowMap]));
	}
	toJson(colKey1, colKey2) {
		let data = new JsonCloudData();
		let col1 = this.#columnToJson(colKey1);
		let col2 = this.#columnToJson(colKey2);
		data.columns.push({
			key: colKey1,
			rows: col1
		});
		data.columns.push({
			key: colKey2,
			rows: col2
		});
		return data;
	}
	#columnToJson(colKey) {
		let cells = [];
		for (let [key, value] of this.columnMap.get(colKey)) {
			let row = {
				key,
				value
			};
			cells.push(row);
		}
		return cells;
	}
};

//#endregion
//#region typescript/werklijst/observer.ts
const tableId = "table_leerlingen_werklijst_table";
registerChecksumHandler(tableId, (_tableDef) => {
	return document.querySelector("#view_contents > div.alert.alert-primary")?.textContent.replace("Criteria aanpassen", "")?.replace("Criteria:", "") ?? "";
});
var observer_default$4 = new HashObserver("#leerlingen-werklijst", onMutation$3);
function onMutation$3(mutation) {
	if (mutation.target.id === "table_leerlingen_werklijst_table") {
		onWerklijstChanged();
		return true;
	}
	let buttonBar = document.getElementById("tablenav_leerlingen_werklijst_top");
	if (mutation.target === buttonBar) {
		onButtonBarChanged();
		return true;
	}
	if (document.querySelector("#btn_werklijst_maken")) {
		onCriteriaShown();
		return true;
	}
	return false;
}
function onCriteriaShown() {
	let pageState$1 = getGotoStateOrDefault(PageName.Werklijst);
	if (pageState$1.goto == Goto.Werklijst_uren_prevYear) {
		pageState$1.goto = Goto.None;
		saveGotoState(pageState$1);
		setCriteriaForTeacherHours(createSchoolyearString(calculateSchooljaar())).then(() => {});
		return;
	}
	if (pageState$1.goto == Goto.Werklijst_uren_nextYear) {
		pageState$1.goto = Goto.None;
		saveGotoState(pageState$1);
		setCriteriaForTeacherHours(createSchoolyearString(calculateSchooljaar() + 1)).then(() => {});
		return;
	}
	pageState$1.werklijstTableName = "";
	saveGotoState(pageState$1);
	let btnWerklijstMaken = document.querySelector("#btn_werklijst_maken");
	if (document.getElementById(UREN_PREV_BTN_ID)) return;
	let year = parseInt(getHighestSchooljaarAvailable());
	let prevSchoolyear = createSchoolyearString(year - 1);
	let nextSchoolyear = createSchoolyearString(year);
	let prevSchoolyearShort = createShortSchoolyearString(year - 1);
	let nextSchoolyearShort = createShortSchoolyearString(year);
	addButton$1(btnWerklijstMaken, UREN_PREV_BTN_ID, "Toon lerarenuren voor " + prevSchoolyear, async () => {
		await setCriteriaForTeacherHours(prevSchoolyear);
	}, "", ["btn", "btn-outline-dark"], "Uren " + prevSchoolyearShort);
	addButton$1(btnWerklijstMaken, UREN_PREV_SETUP_BTN_ID, "Setup voor " + prevSchoolyear, async () => {
		await showUrenSetup(prevSchoolyear);
	}, "fas-certificate", ["btn", "btn-outline-dark"], "");
	addButton$1(btnWerklijstMaken, UREN_NEXT_BTN_ID, "Toon lerarenuren voor " + nextSchoolyear, async () => {
		await setCriteriaForTeacherHours(nextSchoolyear);
	}, "", ["btn", "btn-outline-dark"], "Uren " + nextSchoolyearShort);
	getSchoolIdString();
}
async function showUrenSetup(schoolyear) {
	let instrumentList = document.getElementById("leerling_werklijst_criterium_vak");
	let options$1 = [...instrumentList.options].map((option) => {
		return {
			text: option.text,
			value: option.value
		};
	});
	console.log(options$1);
}
function onWerklijstChanged() {
	let werklijstPageState = getGotoStateOrDefault(PageName.Werklijst);
	if (werklijstPageState.werklijstTableName === UREN_TABLE_STATE_NAME) tryUntil(onShowLerarenUren);
	decorateTableHeader(document.querySelector("table#table_leerlingen_werklijst_table"));
}
function onButtonBarChanged() {
	let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)");
	addButton$1(targetButton, COUNT_BUTTON_ID, "Toon telling", onShowLerarenUren, "fa-guitar", ["btn-outline-info"]);
	addButton$1(targetButton, MAIL_BTN_ID, "Email to clipboard", onClickCopyEmails, "fa-envelope", ["btn", "btn-outline-info"]);
}
function onClickCopyEmails() {
	let requiredHeaderLabels = ["e-mailadressen"];
	let namedCellListener = new NamedCellTableFetchListener(requiredHeaderLabels, (_tableDef1) => {
		navigator.clipboard.writeText("").then((_value) => {
			console.log("Clipboard cleared.");
		});
	});
	let result = createDefaultTableFetcher();
	if ("error" in result) {
		console.error(result.error);
		return;
	}
	let { tableFetcher, infoBar } = result.result;
	tableFetcher.addListener(namedCellListener);
	tableFetcher.fetch().then((fetchedTable) => {
		let allEmails = fetchedTable.getRowsAsArray().map((tr) => namedCellListener.getColumnText(tr, "e-mailadressen"));
		let flattened = allEmails.map((emails) => emails.split(/[,;]/)).flat().filter((email) => !email.includes("@academiestudent.be")).filter((email) => email !== "");
		navigator.clipboard.writeText(flattened.join(";\n")).then(() => infoBar.setTempMessage("Alle emails zijn naar het clipboard gekopieerd. Je kan ze plakken in Outlook."));
	}).catch((reason) => {
		console.log("Loading failed (gracefully.");
		console.log(reason);
	});
}
function tryUntil(func) {
	if (!func()) setTimeout(() => tryUntil(func), 100);
}
function onShowLerarenUren() {
	if (!document.getElementById(COUNT_TABLE_ID)) {
		let result = createDefaultTableFetcher();
		if ("error" in result) {
			console.log(result.error);
			return false;
		}
		let { tableFetcher } = result.result;
		let fileName = getUrenVakLeraarFileName();
		let requiredHeaderLabels = [
			"naam",
			"voornaam",
			"vak",
			"klasleerkracht",
			"graad + leerjaar"
		];
		let tableFetchListener = new NamedCellTableFetchListener(requiredHeaderLabels, () => {});
		tableFetcher.addListener(tableFetchListener);
		Promise.all([tableFetcher.fetch(), getUrenFromCloud(fileName)]).then((results) => {
			let [fetchedTable, jsonCloudData] = results;
			let vakLeraars = new Map();
			let rows = fetchedTable.getRows();
			let errors = [];
			for (let tr of rows) {
				let error = scrapeStudent(tableFetcher, tableFetchListener, tr, vakLeraars);
				if (error) errors.push(error);
			}
			if (errors.length) openTab(createTable(["Error"], errors.map((error) => [error])).outerHTML, "Errors");
			let fromCloud = upgradeCloudData(jsonCloudData);
			vakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
			document.getElementById(COUNT_TABLE_ID)?.remove();
			let schoolYear = findSchooljaar();
			let year = parseInt(schoolYear);
			buildTable(new UrenData(year, new CloudData(fromCloud), vakLeraars), tableFetcher);
			document.getElementById(COUNT_TABLE_ID).style.display = "none";
			showOrHideNewTable();
		});
		return true;
	}
	showOrHideNewTable();
	return true;
}
async function getUrenFromCloud(fileName) {
	try {
		return await cloud.json.fetch(fileName);
	} catch (e) {
		return new JsonCloudData();
	}
}
function showOrHideNewTable() {
	let showNewTable = document.getElementById(COUNT_TABLE_ID).style.display === "none";
	document.getElementById("table_leerlingen_werklijst_table").style.display = showNewTable ? "none" : "table";
	document.getElementById(COUNT_TABLE_ID).style.display = showNewTable ? "table" : "none";
	document.getElementById(COUNT_BUTTON_ID).title = showNewTable ? "Toon normaal" : "Toon telling";
	setButtonHighlighted(COUNT_BUTTON_ID, showNewTable);
	let pageState$1 = getGotoStateOrDefault(PageName.Werklijst);
	pageState$1.werklijstTableName = showNewTable ? UREN_TABLE_STATE_NAME : "";
	saveGotoState(pageState$1);
}
function upgradeCloudData(fromCloud) {
	return new JsonCloudData(fromCloud);
}

//#endregion
//#region typescript/vakgroep/observer.ts
var observer_default$3 = new HashObserver("#extra-inschrijvingen-vakgroepen-vakgroep", onMutation$2);
function onMutation$2(mutation) {
	let divVakken = document.getElementById("div_table_vakgroepen_vakken");
	if (mutation.target !== divVakken) return false;
	onVakgroepChanged(divVakken);
	return true;
}
const TXT_FILTER_ID = "txtFilter";
let savedSearch = "";
function onVakgroepChanged(divVakken) {
	let table = divVakken.querySelector("table");
	if (!document.getElementById(TXT_FILTER_ID)) table.parentElement.insertBefore(createSearchField(TXT_FILTER_ID, onSearchInput, savedSearch), table);
	onSearchInput();
}
function onSearchInput() {
	savedSearch = document.getElementById(TXT_FILTER_ID).value;
	function getRowText(tr) {
		let instrumentName = tr.cells[0].querySelector("label").textContent.trim();
		let strong = tr.cells[0].querySelector("strong")?.textContent.trim();
		return instrumentName + " " + strong;
	}
	let rowFilter = createTextRowFilter(savedSearch, getRowText);
	filterTable(document.querySelector("#div_table_vakgroepen_vakken table"), rowFilter);
}

//#endregion
//#region typescript/verwittigen/observer.ts
var observer_default$2 = new HashObserver("#leerlingen-verwittigen", onMutation$1);
const CHAR_COUNTER = "charCounterClass";
const COUNTER_ID = "charCounter";
function onMutation$1(_mutation) {
	let txtSms = document.getElementById("leerlingen_verwittigen_bericht_sjabloon");
	if (txtSms && !txtSms?.classList.contains(CHAR_COUNTER)) {
		txtSms.classList.add(CHAR_COUNTER);
		txtSms.addEventListener("input", onSmsChanged);
		let span = document.createElement("span");
		span.id = COUNTER_ID;
		txtSms.parentElement.appendChild(span);
		onSmsChanged(void 0);
	}
	return true;
}
function onSmsChanged(_event) {
	let txtSms = document.getElementById("leerlingen_verwittigen_bericht_sjabloon");
	let spanCounter = document.getElementById(COUNTER_ID);
	spanCounter.textContent = txtSms.value.length.toString();
}

//#endregion
//#region typescript/aanwezigheden/observer.ts
var observer_default$1 = new HashObserver("#leerlingen-lijsten-awi-percentages_leerling_vak", onMutationAanwezgheden);
function onMutationAanwezgheden(_mutation) {
	let tableId$1 = document.getElementById("table_lijst_awi_percentages_leerling_vak_table");
	if (!tableId$1) return false;
	let navigationBars = getBothToolbars();
	if (!navigationBars) return;
	addTableNavigationButton(navigationBars, COPY_TABLE_BTN_ID, "copy table to clipboard", copyTable, "fa-clipboard");
	return true;
}
async function copyTable() {
	let result = createDefaultTableFetcher();
	if ("error" in result) {
		console.error(result.error);
		return;
	}
	let { tableFetcher, infoBar, infoBarListener } = result.result;
	infoBar.setExtraInfo("Fetching 3-weken data...");
	let wekenLijst = await getTableFromHash("leerlingen-lijsten-awi-3weken", true, infoBarListener).then((bckTableDef) => {
		let rowsArray = bckTableDef.getRowsAsArray();
		return rowsArray.map((row) => {
			let namen = row.cells[0].textContent.split(", ");
			return {
				naam: namen[0],
				voornaam: namen[1],
				weken: parseInt(row.cells[2].textContent)
			};
		});
	});
	console.log(wekenLijst);
	infoBar.setExtraInfo("Fetching attesten...");
	let attestenLijst = await getTableFromHash("leerlingen-lijsten-awi-ontbrekende_attesten", true, infoBarListener).then((bckTableDef) => {
		return bckTableDef.getRowsAsArray().map((tr) => {
			return {
				datum: tr.cells[0].textContent,
				leerling: tr.cells[1].textContent,
				vak: tr.cells[2].textContent,
				leraar: tr.cells[3].textContent,
				reden: tr.cells[4].textContent
			};
		});
	});
	console.log(attestenLijst);
	infoBar.setExtraInfo("Fetching afwezigheidscodes...");
	let pList = await getTableFromHash("leerlingen-lijsten-awi-afwezigheidsregistraties", true, infoBarListener).then((bckTableDef) => {
		let rowsArray = bckTableDef.getRowsAsArray();
		return rowsArray.map((row) => {
			let namen = row.cells[1].querySelector("strong").textContent.split(", ");
			let vakTxt = Array.from(row.cells[1].childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join("");
			let vak = reduceVaknaam(vakTxt.substring(3));
			let leraar = row.cells[1].querySelector("small").textContent.substring(16);
			return {
				naam: namen[0],
				voornaam: namen[1],
				code: row.cells[2].textContent[0],
				vak,
				leraar
			};
		});
	});
	console.log(pList);
	tableFetcher.clearCache();
	tableFetcher.fetch().then((fetchedTable) => {
		let wekenMap = new Map();
		for (let week of wekenLijst) wekenMap.set(week.naam + "," + week.voornaam, week);
		let rowsArray = fetchedTable.getRowsAsArray();
		let nu = new Date();
		let text = "data:" + nu.toLocaleDateString() + "\n";
		let aanwList = rowsArray.map((row) => {
			let percentFinancierbaar = parseFloat(row.cells[1].querySelector("strong")?.textContent?.replace(",", ".") ?? "0") / 100;
			let percentTotaal = parseFloat(row.cells[2].querySelector("strong")?.textContent?.replace(",", ".") ?? "0") / 100;
			let vak = row.cells[0].querySelector("br")?.nextSibling?.textContent;
			let namen = row.cells[0].querySelector("strong").textContent.split(", ");
			let aanw = {
				naam: namen[0],
				voornaam: namen[1],
				vak,
				vakReduced: reduceVaknaam(vak),
				percentFinancierbaar,
				percentTotaal,
				percentFinancierbaarAP: 0,
				percentTotaalAP: 0,
				weken: "",
				codeP: 0
			};
			let week = wekenMap.get(aanw.naam + "," + aanw.voornaam);
			if (week) if (aanw.weken) aanw.weken += " + " + week.weken;
			else aanw.weken = week.weken.toString();
			return aanw;
		});
		let studentVakPees = new Map();
		let leraarPees = new Map();
		pList.filter((line) => line.code === "P").forEach((p) => {
			studentVakPees.set(p.naam + "," + p.voornaam + "," + p.vak, (studentVakPees.get(p.naam + "," + p.voornaam + "," + p.vak) ?? 0) + 1);
			leraarPees.set(p.leraar, (leraarPees.get(p.leraar) ?? 0) + 1);
		});
		console.log(studentVakPees);
		console.log(leraarPees);
		aanwList.forEach((aanw) => {
			let newP = studentVakPees.get(aanw.naam + "," + aanw.voornaam + "," + aanw.vakReduced) ?? 0;
			if (newP > aanw.codeP) aanw.codeP = newP;
		});
		aanwList.forEach((aanw) => {
			text += "lln: " + aanw.naam + "," + aanw.voornaam + "," + aanw.vakReduced + "," + aanw.percentFinancierbaar + "," + aanw.weken + "," + aanw.codeP + "\n";
		});
		leraarPees.forEach((leraarP, key) => {
			text += "leraar: " + key + "," + leraarP + "\n";
		});
		attestenLijst.forEach((attest) => {
			text += "attest: " + attest.datum + "," + attest.leerling + "," + attest.vak + "," + attest.leraar + "," + attest.reden + "\n";
		});
		console.log(text);
		window.sessionStorage.setItem(AANW_LIST, text);
		aanwezighedenToClipboard(infoBar);
		tableFetcher.tableRef.getOrgTableContainer().querySelector("tbody").replaceChildren(...fetchedTable.getRows());
	});
}
function aanwezighedenToClipboard(infoBar) {
	let text = window.sessionStorage.getItem(AANW_LIST);
	navigator.clipboard.writeText(text).then((_r) => {
		infoBar.setExtraInfo("Data copied to clipboard. <a id=" + COPY_AGAIN + " href='javascript:void(0);'>Copy again</a>", COPY_AGAIN, () => {
			aanwezighedenToClipboard(infoBar);
		});
	}).catch((_reason) => {
		infoBar.setExtraInfo("Could not copy to clipboard!!! <a id=" + COPY_AGAIN + " href='javascript:void(0);'>Copy again</a>", COPY_AGAIN, () => {
			aanwezighedenToClipboard(infoBar);
		});
	});
}
function reduceVaknaam(vaknaam) {
	let vak = reduceVaknaamStep1(vaknaam);
	return vak.replace("orkestslagwerk", "slagwerk").replace("jazz pop rock)", "JPR").replace("koor", "GM").replace(": musical", "").replace(" (musical)", "");
}
function reduceVaknaamStep1(vaknaam) {
	vaknaam = vaknaam.toLowerCase();
	if (vaknaam.includes("culturele vorming")) if (vaknaam.includes("3.")) return "ML";
	else return "MA";
	if (vaknaam.includes("uziekatelier")) return "MA";
	if (vaknaam.includes("uzieklab")) return "ML";
	if (vaknaam.includes("roepsmusiceren")) return "GM";
	if (vaknaam.includes("theorie")) return "MT";
	if (vaknaam.includes("geleidingspraktijk")) return "BP";
	if (vaknaam.includes("oordatelier")) return "WA";
	if (vaknaam.includes("oordlab")) return "WL";
	if (vaknaam.includes("mprovisatie")) return "impro";
	if (vaknaam.includes("omeinoverschrijdende")) return "KB";
	if (vaknaam.includes("unstenbad")) return "KB";
	if (vaknaam.includes("ramalab")) return "DL";
	if (vaknaam.includes("oordstudio")) return "WS";
	if (vaknaam.includes("ramastudio")) return "DS";
	if (vaknaam.includes("ompositie")) return "compositie";
	if (vaknaam.includes(" saz")) return "saz";
	if (vaknaam.includes("instrument: klassiek: ")) {
		let rx = /instrument: klassiek: (\S*)/;
		let matches$1 = vaknaam.match(rx);
		if (matches$1.length > 1) return matches$1[1];
		else return vaknaam;
	}
	if (vaknaam.includes("instrument: jazz-pop-rock: ")) {
		let rx = /instrument: jazz-pop-rock: (\S*)/;
		let matches$1 = vaknaam.match(rx);
		if (matches$1.length > 1) if (matches$1[1].includes("elektrische")) return "gitaar JPR";
		else return matches$1[1] + " JPR";
		else return vaknaam;
	}
	if (vaknaam.includes("rrangeren") || vaknaam.includes("opname") || vaknaam.includes("electronics")) return "elektronische muziek";
	let rx2 = /(.*).•./;
	let matches = vaknaam.match(rx2);
	if (matches.length > 1) return matches[1];
	return "??";
}

//#endregion
//#region typescript/afwezigheden/observer.ts
var observer_default = new ExactHashObserver("#extra-tickets?h=afwezigheden", onMutation, true);
function onMutation(mutation) {
	if (mutation.target === document.getElementById("ticket_payload")) {
		onTicket();
		return true;
	}
	if (mutation.target === document.getElementById("dko3_modal_contents")) {
		onAddMelding();
		return true;
	}
	if (mutation.target === document.getElementById("div_tickets_afwezigheid_toevoegen_leerling") && mutation.addedNodes.length > 0) {
		setTimeout(gotoVolgende, 10);
		return true;
	}
	return false;
}
function gotoVolgende() {
	let table = document.querySelector("#div_tickets_afwezigheid_toevoegen_leerling table");
	let tableHasOneStudent = table.querySelectorAll("i.fa-square").length === 1;
	if (tableHasOneStudent) {
		let tr = document.querySelector(".tr-ticket-afwezigheidsmelding-leerling");
		tr.click();
		document.getElementById("btn_opslaan_tickets_afwezigheid_toevoegen").click();
	}
}
function addMatchingStudents() {
	let leerlingLabel = document.querySelector("#form_field_tickets_afwezigheid_toevoegen_leerling_zoeken > label");
	if (leerlingLabel && !leerlingLabel.dataset.filled) {
		leerlingLabel.dataset.filled = "true";
		leerlingLabel.textContent = "Leerling:   reeds gevonden: ";
		let target = leerlingLabel;
		for (let lln of matchingLeerlingen) {
			let anchorClasses = lln.winner ? ".bold" : "";
			function hook(el) {
				if (el.tagName == "A") el.onclick = () => fillAndClick(lln.name);
			}
			target = emmet.insertAfter(target, `a[href="#"].leerlingLabel${anchorClasses}{${lln.name}}`, void 0, hook).first;
		}
	}
}
function addEmailText() {
	let emailDiv = emmet.create("div.modal-body>div>button#btnShowEmail{Show email}.btn.btn-sm.btn-outline-success+div#showEmail.collapsed").last;
	emailDiv.innerHTML = currentEmailHtml;
	document.getElementById("btnShowEmail").addEventListener("click", showEmail);
}
function showEmail() {
	document.getElementById("showEmail").classList.toggle("collapsed");
}
function onAddMelding() {
	addMatchingStudents();
	addEmailText();
}
function fillAndClick(name) {
	let formDiv = document.querySelector("#form_field_tickets_afwezigheid_toevoegen_leerling_zoeken");
	let input = formDiv.querySelector("input");
	input.value = name;
	let button = formDiv.querySelector("button");
	button.click();
	return false;
}
let matchingLeerlingen = [];
let currentEmailHtml = "";
async function onTicket() {
	let card_bodyDiv = document.querySelector(".card-body");
	if (!card_bodyDiv) return;
	let emailText = card_bodyDiv.textContent;
	currentEmailHtml = card_bodyDiv.innerHTML;
	let matches = [...emailText.matchAll(rxEmail)];
	let uniqueEmails = [...new Set(matches.map((match$1) => match$1[0]))];
	let { email: myEmail } = whoAmI();
	uniqueEmails = uniqueEmails.filter((m) => m != myEmail);
	console.log(uniqueEmails);
	let template = document.createElement("div");
	template.innerHTML = await fetchStudentsSearch(uniqueEmails.join(" "));
	let tdLln = [...template.querySelectorAll("td")];
	matchingLeerlingen = tdLln.map((td) => {
		let id = td.querySelector("small").textContent;
		let name = td.querySelector("strong").textContent;
		setViewFromCurrentUrl();
		return {
			id,
			name,
			weight: 0,
			winner: false
		};
	});
	findUniqueMatch(emailText, matchingLeerlingen);
}
function findUniqueMatch(emailText, matchingLeerlingen$1) {
	if (matchingLeerlingen$1.length === 1) return matchingLeerlingen$1[0];
	let strippedText = emailText.replaceAll("\n", " ").replaceAll("\r", " ");
	let mailLowerCase = strippedText.toLowerCase();
	for (let lln of matchingLeerlingen$1) {
		let nameParts = lln.name.split(" ");
		for (let namePart of nameParts) {
			if (strippedText.includes(" " + namePart + " ")) lln.weight++;
			if (mailLowerCase.includes(" " + namePart.toLowerCase() + " ")) lln.weight++;
		}
	}
	matchingLeerlingen$1.sort((a, b) => b.weight - a.weight);
	if (matchingLeerlingen$1[0].weight > matchingLeerlingen$1[1].weight) matchingLeerlingen$1[0].winner = true;
}

//#endregion
//#region typescript/pages/observer.ts
let extraInschrijvingenObserver = new ExactHashObserver("#extra-inschrijvingen", onMutationExtraInschrijvingen);
let allLijstenObserver = new MenuScrapingObserver("#leerlingen-lijsten", "Lijsten", "Lijsten > ");
let financialObserver = new MenuScrapingObserver("#extra-financieel", "Financieel", "Financieel > ");
let assetsObserver = new MenuScrapingObserver("#extra-assets", "Assets", "Assets > ");
let evaluatieObserver = new MenuScrapingObserver("#extra-evaluatie", "Evaluatie", "Evaluatie > ");
let academieMenuObserver = new MenuScrapingObserver("#extra-academie", "Academie", "Academie > ");
function onMutationExtraInschrijvingen(_mutation) {
	saveQueryItems("ExtraInschrijvingen", scrapeMenuPage("Inschrijvingen > ", inschrijvingenLinkToQueryItem));
	return true;
}
function inschrijvingenLinkToQueryItem(headerLabel, link, longLabelPrefix) {
	let label = link.textContent.trim();
	let longLabel = longLabelPrefix + headerLabel + " > " + label;
	if (label.toLowerCase().includes("inschrijving")) longLabel = headerLabel + " > " + label;
	return createQueryItem(headerLabel, label, link.href, void 0, longLabel);
}

//#endregion
//#region typescript/main.ts
init();
function init() {
	getOptions().then(() => {
		chrome.storage.onChanged.addListener((_changes, area) => {
			if (area === "sync") getOptions().then((_r) => {
				onSettingsChanged();
			});
		});
		window.navigation.addEventListener("navigatesuccess", () => {
			checkGlobalSettings();
			onPageChanged();
		});
		window.addEventListener("load", () => {
			onPageChanged();
		});
		registerObserver(observer_default$9);
		registerObserver(observer_default$8);
		registerObserver(observer_default$7);
		registerObserver(observer_default$6);
		registerObserver(observer_default$4);
		registerObserver(observer_default$5);
		registerObserver(extraInschrijvingenObserver);
		registerObserver(allLijstenObserver);
		registerObserver(financialObserver);
		registerObserver(assetsObserver);
		registerObserver(evaluatieObserver);
		registerObserver(observer_default$3);
		registerObserver(observer_default$2);
		registerObserver(academieMenuObserver);
		registerObserver(observer_default$1);
		registerObserver(observer_default);
		onPageChanged();
		setupPowerQuery();
	});
}
let lastCheckTime = Date.now();
function checkGlobalSettings() {
	if (Date.now() > lastCheckTime + 10 * 1e3) {
		lastCheckTime = Date.now();
		console.log("Re-fetching global settings.");
		fetchGlobalSettings(getGlobalSettings()).then((r) => {
			if (!equals(getGlobalSettings(), r)) {
				setGlobalSetting(r);
				onSettingsChanged();
			}
		});
	}
}
function onSettingsChanged() {
	console.log("on settings changed.");
	for (let observer of settingsObservers) observer();
}
function onPageChanged() {
	if (getGlobalSettings().globalHide) return;
	clearPageTransientState();
	for (let observer of observers) observer.onPageChanged();
}

//#endregion
})(default_items);
//# sourceMappingURL=bundle.js.map