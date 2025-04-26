(() => {
  // typescript/messaging.ts
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
  async function sendGetDataRequest(sender) {
    let tab = await chrome.tabs.getCurrent();
    return await sendRequest("get_tab_data" /* GetTabData */, sender, 0 /* Undefined */, void 0, { tabId: tab.id });
  }
  function createMessageHandler(tabType) {
    let handler2 = {
      getListener: function() {
        let self = this;
        return async function onMessage(request, _sender, _sendResponse) {
          console.log(`blank received: `, request);
          if (request.targetTabType === tabType) {
            self._onMessageForMyTabType?.(request);
            let tab = await chrome.tabs.getCurrent();
            if (request.targetTabId === tab.id) {
              self._onMessageForMe?.(request);
            }
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
    document.addEventListener("DOMContentLoaded", async () => {
      let res = await sendGetDataRequest(tabType);
      handler2._onData?.(res);
    });
    return handler2;
  }

  // libs/Emmeter/tokenizer.ts
  var CLOSING_BRACE = "__CLOSINGBRACE__";
  var DOUBLE_QUOTE = "__DOUBLEQUOTE__";
  function tokenize(textToTokenize) {
    let tokens = [];
    let txt = textToTokenize.replaceAll("\\}", CLOSING_BRACE).replaceAll('\\"', DOUBLE_QUOTE);
    let pos = 0;
    let start = pos;
    function pushToken() {
      if (start != pos)
        tokens.push(txt.substring(start, pos));
      start = pos;
    }
    function getTo(to) {
      pushToken();
      do {
        pos++;
      } while (pos < txt.length && txt[pos] != to);
      if (pos >= txt.length)
        throw `Missing '${to}' at matching from pos ${start}.`;
      pos++;
      pushToken();
    }
    function getChar() {
      pushToken();
      pos++;
      pushToken();
    }
    while (pos < txt.length) {
      switch (txt[pos]) {
        case "{":
          getTo("}");
          break;
        case '"':
          getTo('"');
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
        default:
          pos++;
      }
    }
    pushToken();
    return tokens;
  }

  // libs/Emmeter/html.ts
  var emmet = {
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
  var nested = void 0;
  var lastCreated = void 0;
  function toSelector(node) {
    if (!("tag" in node)) {
      throw "TODO: not yet implemented.";
    }
    let selector = "";
    if (node.tag)
      selector += node.tag;
    if (node.id)
      selector += "#" + node.id;
    if (node.classList.length > 0) {
      selector += "." + node.classList.join(".");
    }
    return selector;
  }
  function create(text, onIndex, hook) {
    nested = tokenize(text);
    let root = parse();
    let parent = document.querySelector(toSelector(root));
    if ("tag" in root) {
      root = root.child;
    } else {
      throw "root should be a single element.";
    }
    buildElement(parent, root, 1, onIndex, hook);
    return { root: parent, last: lastCreated };
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
    for (let child of children) {
      if (!first) {
        if (child.nodeType === Node.TEXT_NODE)
          first = insertPos = insertAdjacentText(target, position, child.wholeText);
        else
          first = insertPos = target.insertAdjacentElement(position, child);
      } else {
        if (child.nodeType === Node.TEXT_NODE)
          insertPos = insertPos.parentElement.insertBefore(document.createTextNode(child.wholeText), insertPos.nextSibling);
        else
          insertPos = insertPos.parentElement.insertBefore(child, insertPos.nextSibling);
      }
    }
    return { target, first, last: result.last };
  }
  function insertAdjacentText(target, position, text) {
    switch (position) {
      case "beforebegin":
        return target.parentElement.insertBefore(document.createTextNode(text), target);
      case "afterbegin":
        return target.insertBefore(document.createTextNode(text), target.firstChild);
      case "beforeend":
        return target.appendChild(document.createTextNode(text));
      case "afterend":
        return target.parentElement.appendChild(document.createTextNode(text));
    }
  }
  function parseAndBuild(root, onIndex, hook) {
    buildElement(root, parse(), 1, onIndex, hook);
    return { root, last: lastCreated };
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
      if (!el)
        return list.length === 1 ? list[0] : { list };
      list.push(el);
      if (!match("+"))
        return list.length === 1 ? list[0] : { list };
    }
  }
  function parseMult() {
    let el = parseElement();
    if (!el)
      return el;
    if (match("*")) {
      let count = parseInt(nested.shift());
      return {
        count,
        child: el
      };
    } else {
      return el;
    }
  }
  function parseElement() {
    let el;
    if (match("(")) {
      el = parsePlus();
      if (!match(")"))
        throw "Expected ')'";
      return el;
    } else {
      let text = matchStartsWith("{");
      if (text) {
        text = stripStringDelimiters(text);
        return { text };
      } else {
        return parseChildDef();
      }
    }
  }
  function parseChildDef() {
    let tag = nested.shift();
    let id = void 0;
    let atts = [];
    let classList = [];
    let text = void 0;
    while (nested.length) {
      if (match(".")) {
        let className = nested.shift();
        if (!className)
          throw "Unexpected end of stream. Class name expected.";
        classList.push(className);
      } else if (match("[")) {
        atts = getAttributes();
      } else {
        let token = matchStartsWith("#");
        if (token) {
          id = token.substring(1);
        } else {
          let token2 = matchStartsWith("{");
          if (token2) {
            text = stripStringDelimiters(token2);
          } else {
            break;
          }
        }
      }
    }
    return { tag, id, atts, classList, innerText: text, child: parseDown() };
  }
  function parseDown() {
    if (match(">")) {
      return parsePlus();
    }
    return void 0;
  }
  function getAttributes() {
    let tokens = [];
    while (nested.length) {
      let prop = nested.shift();
      if (prop == "]")
        break;
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
      if (eq != "=") {
        throw "Equal sign expected.";
      }
      let value = tokens.shift();
      if (value[0] === '"') {
        value = stripStringDelimiters(value);
      }
      if (!value)
        throw "Value expected.";
      attDefs.push({ name, sub, value });
      if (!tokens.length)
        break;
    }
    return attDefs;
  }
  function match(expected) {
    let next = nested.shift();
    if (next === expected)
      return true;
    if (next)
      nested.unshift(next);
    return false;
  }
  function matchStartsWith(expected) {
    let next = nested.shift();
    if (next.startsWith(expected))
      return next;
    if (next)
      nested.unshift(next);
    return void 0;
  }
  function stripStringDelimiters(text) {
    if (text[0] === "'" || text[0] === '"' || text[0] === "{")
      return text.substring(1, text.length - 1);
    return text;
  }
  function createElement(parent, def, index, onIndex, hook) {
    let el = parent.appendChild(document.createElement(def.tag));
    if (def.id)
      el.id = addIndex(def.id, index, onIndex);
    for (let clazz of def.classList) {
      el.classList.add(addIndex(clazz, index, onIndex));
    }
    for (let att of def.atts) {
      if (att.sub)
        el[addIndex(att.name, index, onIndex)][addIndex(att.sub, index, onIndex)] = addIndex(att.value, index, onIndex);
      else {
        el.setAttribute(addIndex(att.name, index, onIndex), addIndex(att.value, index, onIndex));
      }
    }
    if (def.innerText) {
      el.appendChild(document.createTextNode(addIndex(def.innerText, index, onIndex)));
    }
    lastCreated = el;
    if (hook)
      hook(el);
    return el;
  }
  function buildElement(parent, el, index, onIndex, hook) {
    if ("tag" in el) {
      let created = createElement(parent, el, index, onIndex, hook);
      if (el.child)
        buildElement(created, el.child, index, onIndex, hook);
      return;
    }
    if ("list" in el) {
      for (let def of el.list) {
        buildElement(parent, def, index, onIndex, hook);
      }
    }
    if ("count" in el) {
      for (let i = 0; i < el.count; i++) {
        buildElement(parent, el.child, i, onIndex, hook);
      }
    }
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

  // typescript/def.ts
  var JSON_URL = "https://europe-west1-ebo-tain.cloudfunctions.net/json";

  // typescript/cloud.ts
  var cloud = {
    json: {
      fetch: fetchJson,
      upload: uploadJson
    }
  };
  async function fetchJson(fileName) {
    return fetch(JSON_URL + "?fileName=" + fileName, { method: "GET" }).then((res) => res.json());
  }
  async function uploadJson(fileName, data) {
    let res = await fetch(JSON_URL + "?fileName=" + fileName, {
      method: "POST",
      body: JSON.stringify(data),
      keepalive: true
      //keeps the data valid even if window is closing.
    });
    return await res.text();
  }

  // typescript/werklijst/hoursSettings.ts
  function mapHourSettings(hourSettings) {
    let mapped = { ...hourSettings };
    mapped.subjectsMap = new Map(hourSettings.subjects.map((s) => [s.name, s]));
    return mapped;
  }
  var defaultInstruments = [
    { checked: true, name: "Aaaaa", alias: "bbb", stillValid: true },
    { checked: true, name: "Accordeon", alias: "", stillValid: false },
    { checked: true, name: "Altfluit", alias: "Dwarsfluit", stillValid: false },
    { checked: true, name: "Althoorn", alias: "", stillValid: false },
    { checked: true, name: "Altklarinet", alias: "", stillValid: false },
    { checked: true, name: "Altsaxofoon", alias: "Saxofoon", stillValid: false },
    { checked: true, name: "Altsaxofoon (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Altviool", alias: "", stillValid: false },
    { checked: true, name: "Baglama/saz (wereldmuziek)", alias: "", stillValid: false },
    { checked: true, name: "Bariton", alias: "", stillValid: false },
    { checked: true, name: "Baritonsaxofoon", alias: "", stillValid: false },
    { checked: true, name: "Baritonsaxofoon (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Basfluit", alias: "", stillValid: false },
    { checked: true, name: "Basgitaar (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Basklarinet", alias: "Klarinet", stillValid: false },
    { checked: true, name: "Bastrombone", alias: "", stillValid: false },
    { checked: true, name: "Bastuba", alias: "Koper", stillValid: false },
    { checked: true, name: "Bugel", alias: "Koper", stillValid: false },
    { checked: true, name: "Cello", alias: "", stillValid: false },
    { checked: true, name: "Contrabas (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Contrabas (klassiek)", alias: "", stillValid: false },
    { checked: true, name: "Dwarsfluit", alias: "", stillValid: false },
    { checked: true, name: "Engelse hoorn", alias: "", stillValid: false },
    { checked: true, name: "Eufonium", alias: "Koper", stillValid: false },
    { checked: true, name: "Fagot", alias: "", stillValid: false },
    { checked: true, name: "Gitaar", alias: "", stillValid: false },
    { checked: true, name: "Gitaar (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Harp", alias: "", stillValid: false },
    { checked: true, name: "Hobo", alias: "", stillValid: false },
    { checked: true, name: "Hoorn", alias: "Koper", stillValid: false },
    { checked: true, name: "Keyboard (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Klarinet", alias: "", stillValid: false },
    { checked: true, name: "Kornet", alias: "", stillValid: false },
    { checked: true, name: "Orgel", alias: "", stillValid: false },
    { checked: true, name: "Piano", alias: "", stillValid: false },
    { checked: true, name: "Piano (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Pianolab", alias: "", stillValid: false },
    { checked: true, name: "Piccolo", alias: "Dwarsfluit", stillValid: false },
    { checked: true, name: "Slagwerk", alias: "", stillValid: false },
    { checked: true, name: "Slagwerk (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Sopraansaxofoon", alias: "Saxofoon", stillValid: false },
    { checked: true, name: "Sopraansaxofoon (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Tenorsaxofoon", alias: "Saxofoon", stillValid: false },
    { checked: true, name: "Tenorsaxofoon (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Trombone", alias: "Koper", stillValid: false },
    { checked: true, name: "Trompet", alias: "Koper", stillValid: false },
    { checked: true, name: "Trompet (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Ud (wereldmuziek)", alias: "", stillValid: false },
    { checked: true, name: "Viool", alias: "", stillValid: false },
    { checked: true, name: "Zang", alias: "", stillValid: false },
    { checked: true, name: "Zang (jazz pop rock)", alias: "", stillValid: false },
    { checked: true, name: "Zang (musical 2e graad)", alias: "", stillValid: false },
    { checked: true, name: "Zang (musical)", alias: "", stillValid: false }
  ];
  var defaultInstrumentsMap = /* @__PURE__ */ new Map();
  defaultInstruments.forEach((i) => defaultInstrumentsMap.set(i.name, i));
  function createTeacherHoursFileName(schoolyear) {
    return "teacherHoursSetup_" + schoolyear + ".json";
  }

  // typescript/teacherHoursSetup.ts
  var handler = createMessageHandler(2 /* HoursSettings */);
  chrome.runtime.onMessage.addListener(handler.getListener());
  document.addEventListener("DOMContentLoaded", onDocumentLoaded);
  handler.onMessageForMyTabType((msg) => {
    console.log("message for my tab type: ", msg);
    document.getElementById("container").innerHTML = "Message was for my tab type" + msg.data;
  }).onMessageForMe((msg) => {
    console.log("message for me: ", msg);
    document.getElementById("container").innerHTML = "DATA:" + msg.data;
  }).onData(onData);
  function fillSubjectsTable(cloudData) {
    if (cloudData) {
      let globalSubjectMap = new Map(globalSetup.subjects.map((s) => [s.name, s]));
      let cloudSubjectMap = new Map(cloudData.subjects.map((s) => [s.name, s]));
      for (let [key, value] of cloudSubjectMap) {
        globalSubjectMap.set(key, value);
      }
      globalSetup.subjects = [...globalSubjectMap.values()];
    }
    let container = document.getElementById("subjectsContainer");
    let tbody = container.querySelector("table>tbody");
    tbody.innerHTML = "";
    for (let vak of globalSetup.subjects) {
      let validClass = "";
      let bucket = "";
      if (!vak.stillValid) {
        validClass = ".invalid";
        bucket = `+button.naked>img[src="${chrome.runtime.getURL("images/trash-can.svg")}"]`;
      }
      let valueAttribute = "";
      if (vak.alias)
        valueAttribute = ` value="${vak.alias}"`;
      let checkedAttribute = "";
      if (vak.checked)
        checkedAttribute = ` checked="checked"`;
      emmet.appendChild(tbody, `tr>(td>input[type="checkbox" ${checkedAttribute}])+(td${validClass}>({${vak.name}}${bucket}))+td>input[type="text" ${valueAttribute}]`);
    }
  }
  function fillTranslationsTable(cloudData) {
    let container = document.getElementById("translationsContainer");
    let tbody = container.querySelector("table>tbody");
    tbody.innerHTML = "";
    for (let trns of globalSetup.translations) {
      let text = `tr>` + buildField("Vind", trns.find, "trnsFind") + "+" + buildField("vervang door", trns.replace, "trnsReplace") + "+" + buildField("prefix", trns.prefix, "trnsPrefix") + "+" + buildField("suffix", trns.suffix, "trnsSuffix");
      emmet.appendChild(tbody, text);
    }
    function buildField(label, value, id) {
      let attrValue = value ? ` value="${value}"` : "";
      return `(td>{${label}})+(td>input#${id}[type="text"${attrValue}])`;
    }
  }
  async function onData(data) {
    document.title = data.pageTitle;
    document.querySelector("button").addEventListener("click", async () => {
      await sendRequest("greetingsFromChild" /* GreetingsFromChild */, 0 /* Undefined */, 1 /* Main */, void 0, "Hullo! Fly safe!");
    });
    globalSetup = mapHourSettings(data.data);
    let cloudData = await cloud.json.fetch(createTeacherHoursFileName(globalSetup.schoolyear)).catch((e) => {
    });
    fillSubjectsTable(cloudData);
    fillTranslationsTable(cloudData);
    document.querySelectorAll("tbody").forEach((tbody) => tbody.addEventListener("change", (e) => {
      hasTableChanged = true;
    }));
  }
  var globalSetup = void 0;
  var hasTableChanged = false;
  setInterval(onCheckTableChanged, 2e3);
  function scrapeSubjects() {
    let rows = document.querySelectorAll("#subjectsContainer>table>tbody>tr");
    return [...rows].filter((row) => row.cells[0].querySelector("input:checked") !== null || row.cells[2].querySelector("input").value).map((row) => {
      return {
        checked: row.cells[0].querySelector("input:checked") !== null,
        name: row.cells[1].textContent,
        alias: row.cells[2].querySelector("input").value,
        stillValid: false
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
  function onCheckTableChanged() {
    if (!hasTableChanged)
      return;
    let setupData = {
      schoolyear: globalSetup.schoolyear,
      subjects: scrapeSubjects(),
      translations: scrapeTranslations()
    };
    hasTableChanged = false;
    let fileName = createTeacherHoursFileName(globalSetup.schoolyear);
    cloud.json.upload(fileName, setupData).then((res) => {
      sendRequest("open_hours_settings_changed" /* HoursSettingsChanged */, 2 /* HoursSettings */, 1 /* Main */, void 0, setupData);
    });
  }
  window.onbeforeunload = () => {
    onCheckTableChanged();
  };
  function switchTab(btn) {
    let tabId = btn.dataset.tabId;
    let tabs = btn.parentElement;
    tabs.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.add("notSelected");
      document.getElementById(tab.dataset.tabId).style.display = "none";
    });
    btn.classList.remove("notSelected");
    document.getElementById(tabId).style.display = "block";
  }
  function onDocumentLoaded(ev) {
    let tabs = document.querySelector(".tabs");
    switchTab(tabs.querySelector(".tab"));
    document.querySelectorAll(".tabs > button.tab").forEach((btn) => btn.addEventListener("click", (ev2) => {
      switch (ev2.target.id) {
        case "btnTabSubjects":
          switchTab(ev2.target);
          break;
        case "btnTabTranslations":
          switchTab(ev2.target);
          break;
      }
    }));
  }
})();
//# sourceMappingURL=teacherHoursSetup.js.map
