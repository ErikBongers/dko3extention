(() => {
  // typescript/def.ts
  var COPY_AGAIN = "copy_again";
  var PROGRESS_BAR_ID = "progressBarFetch";
  var UREN_PREV_BTN_ID = "prefillInstrButton";
  var UREN_NEXT_BTN_ID = "prefillInstrButtonNext";
  var MAIL_BTN_ID = "mailButton";
  var DOWNLOAD_TABLE_BTN_ID = "downloadTableButton";
  var COPY_TABLE_BTN_ID = "copyTableButton";
  var LESSEN_OVERZICHT_ID = "lessen_overzicht";
  var TRIM_BUTTON_ID = "moduleButton";
  var CHECKS_BUTTON_ID = "checksButton";
  var COUNT_BUTTON_ID = "fetchAllButton";
  var FULL_CLASS_BUTTON_ID = "fullClassButton";
  var TRIM_TABLE_ID = "trimesterTable";
  var COUNT_TABLE_ID = "werklijst_uren";
  var TRIM_DIV_ID = "trimesterDiv";
  var JSON_URL = "https://europe-west1-ebo-tain.cloudfunctions.net/json";
  var CACHE_INFO_ID = "dko3plugin_cacheInfo";
  var TEMP_MSG_ID = "dko3plugin_tempMessage";
  var INFO_MSG_ID = "dko3plugin_infoMessage";
  var AANW_LIST = "aanwezighedenList";
  var GLOBAL_SETTINGS_FILENAME = "global_settings.json";
  function isButtonHighlighted(buttonId) {
    return document.getElementById(buttonId)?.classList.contains("toggled");
  }
  var CACHE_DATE_SUFFIX = "__date";
  var POWER_QUERY_ID = "savedPowerQuery";
  var STORAGE_PAGE_STATE_KEY = "pageState";
  var UREN_TABLE_STATE_NAME = "__uren__";

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
      body: JSON.stringify(data)
    });
    return await res.text();
  }

  // typescript/globals.ts
  var options = {
    showDebug: false,
    myAcademies: "",
    showNotAssignedClasses: true,
    markOtherAcademies: true
  };
  var observers = [];
  var settingsObservers = [];
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
    if (observers.length > 20)
      console.error("Too many observers!");
  }
  function registerSettingsObserver(observer) {
    settingsObservers.push(observer);
    if (settingsObservers.length > 20)
      console.error("Too many settingsObservers!");
  }
  function setButtonHighlighted(buttonId, show) {
    if (show) {
      document.getElementById(buttonId).classList.add("toggled");
    } else {
      document.getElementById(buttonId).classList.remove("toggled");
    }
  }
  function addButton(targetElement, buttonId, title, clickFunction, imageId, classList, text = "", where = "beforebegin") {
    let button = document.getElementById(buttonId);
    if (button === null) {
      const button2 = document.createElement("button");
      button2.classList.add("btn", ...classList);
      button2.id = buttonId;
      button2.style.marginTop = "0";
      button2.onclick = clickFunction;
      button2.title = title;
      if (text) {
        let span = document.createElement("span");
        button2.appendChild(span);
        span.innerText = text;
      }
      const buttonContent = document.createElement("i");
      button2.appendChild(buttonContent);
      if (imageId)
        buttonContent.classList.add("fas", imageId);
      targetElement.insertAdjacentElement(where, button2);
    }
  }
  function getSchooljaarSelectElement() {
    let selects = document.querySelectorAll("select");
    return Array.from(selects).filter((element) => element.id.includes("schooljaar")).pop();
  }
  function getHighestSchooljaarAvailable() {
    let el = getSchooljaarSelectElement();
    if (!el)
      return void 0;
    return Array.from(el.querySelectorAll("option")).map((option) => option.value).sort().pop();
  }
  function findSchooljaar() {
    let el = getSchooljaarSelectElement();
    if (el)
      return el.value;
    el = document.querySelector("div.alert-primary");
    return el.textContent.match(/schooljaar *= (\d{4}-\d{4})*/)[1];
  }
  function calculateSchooljaar() {
    let now = /* @__PURE__ */ new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    if (month < 8)
      return year - 1;
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
    const match2 = footer.textContent.match(reInstrument);
    if (match2?.length !== 3) {
      throw new Error(`Could not process footer text "${footer.textContent}"`);
    }
    let userName = match2[1];
    let schoolName = match2[2];
    return { userName, schoolName };
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
    if (days > 0)
      return days + (days === 1 ? " dag" : " dagen");
    else if (hours > 0)
      return hours + " uur";
    else if (minutes > 0)
      return minutes + (minutes === 1 ? " minuut" : " minuten");
    else if (seconds > 0)
      return seconds + " seconden";
    else return "";
  }
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  function isAlphaNumeric(str) {
    if (str.length > 1)
      return false;
    let code;
    let i;
    let len;
    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (!(code > 47 && code < 58) && // numeric (0-9)
      !(code > 64 && code < 91) && // upper alpha (A-Z)
      !(code > 96 && code < 123)) {
        return false;
      }
    }
    return true;
  }
  function rangeGenerator(start, stop, step = 1) {
    return Array(Math.ceil((stop - start) / step)).fill(start).map((x, y) => x + y * step);
  }
  function createScearchField(id, onSearchInput3, value) {
    let input = document.createElement("input");
    input.type = "text";
    input.id = id;
    input.classList.add("tableFilter");
    input.oninput = onSearchInput3;
    input.value = value;
    input.placeholder = "filter";
    return input;
  }
  function match_AND_expression(searchText, rowText) {
    let search_AND_list = searchText.split("+").map((txt) => txt.trim());
    for (let search of search_AND_list) {
      let caseText = rowText;
      if (search === search.toLowerCase()) {
        caseText = rowText.toLowerCase();
      }
      if (!caseText.includes(search))
        return false;
    }
    return true;
  }
  function filterTableRows(table, rowFilter) {
    if (typeof table === "string")
      table = document.getElementById(table);
    return Array.from(table.tBodies[0].rows).filter((tr) => rowFilter.rowFilter(tr, rowFilter.context));
  }
  function filterTable(table, rowFilter) {
    if (typeof table === "string")
      table = document.getElementById(table);
    for (let tr of table.tBodies[0].rows) {
      tr.style.visibility = "collapse";
      tr.style.borderColor = "transparent";
    }
    for (let tr of filterTableRows(table, rowFilter)) {
      if (!tr.dataset.keepHidden) {
        tr.style.visibility = "visible";
        tr.style.borderColor = "";
      }
    }
  }
  function createTextRowFilter(searchText, getRowSearchText) {
    let search_OR_list = searchText.split(",").map((txt) => txt.trim());
    let context = {
      search_OR_list,
      getRowSearchText
    };
    let rowFilter = function(tr, context2) {
      for (let search of context2.search_OR_list) {
        let rowText = context2.getRowSearchText(tr);
        if (match_AND_expression(search, rowText))
          return true;
      }
      return false;
    };
    return { context, rowFilter };
  }
  function getBothToolbars() {
    let navigationBars = document.querySelectorAll("div.datatable-navigation-toolbar");
    if (navigationBars.length < 2)
      return void 0;
    return navigationBars;
  }
  function addTableNavigationButton(navigationBars, btnId, title, onClick, fontIconId) {
    addButton(navigationBars[0].lastElementChild, btnId, title, onClick, fontIconId, ["btn-secondary"], "", "afterend");
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
    let page = await fetch("https://administratie.dko3.cloud/#" + hash).then((res) => res.text());
    let view = await fetch("view.php?args=" + hash).then((res) => res.text());
  }
  function equals(g1, g2) {
    return g1.globalHide === g2.globalHide;
  }
  async function fetchGlobalSettings(defaultSettings) {
    return await cloud.json.fetch(GLOBAL_SETTINGS_FILENAME).catch((err) => {
      console.log(err);
      return defaultSettings;
    });
  }
  var globalSettings = {
    globalHide: false
  };
  function getGlobalSettings() {
    return globalSettings;
  }
  function setGlobalSetting(settings) {
    globalSettings = settings;
  }
  var rxEmail = /\w[\w.\-]*\@\w+\.\w+/gm;
  function whoAmI() {
    let allScripts = document.querySelectorAll("script");
    let scriptTexts = [...allScripts].map((s) => s.textContent).join();
    let email = scriptTexts.match(rxEmail)[0];
    let rxName = /name: '(.*)'/;
    let name = scriptTexts.match(rxName)[1];
    return { email, name };
  }

  // typescript/pageObserver.ts
  var HashPageFilter = class {
    constructor(urlHash) {
      this.urlHash = urlHash;
    }
    match() {
      return window.location.hash.startsWith(this.urlHash);
    }
  };
  var ExactHashPageFilter = class {
    constructor(urlHash) {
      this.urlHash = urlHash;
    }
    match() {
      return window.location.hash === this.urlHash;
    }
  };
  var AllPageFilter = class {
    constructor() {
    }
    match() {
      return true;
    }
  };
  var BaseObserver = class {
    constructor(onPageChangedCallback, pageFilter, onMutationCallback, trackModal = false) {
      this.onPageChangedCallback = onPageChangedCallback;
      this.pageFilter = pageFilter;
      this.onMutation = onMutationCallback;
      this.trackModal = trackModal;
      if (onMutationCallback) {
        this.observer = new MutationObserver((mutationList, observer) => this.observerCallback(mutationList, observer));
      }
    }
    observerCallback(mutationList, _observer) {
      for (const mutation of mutationList) {
        if (mutation.type !== "childList") {
          continue;
        }
        if (this.onMutation(mutation)) {
          break;
        }
      }
    }
    onPageChanged() {
      if (!this.pageFilter.match()) {
        this.disconnect();
        return;
      }
      if (this.onPageChangedCallback) {
        this.onPageChangedCallback();
      }
      if (!this.onMutation)
        return;
      this.observeElement(document.querySelector("main"));
      if (this.trackModal)
        this.observeElement(document.getElementById("dko3_modal"));
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
    //onMutationCallback should return true if handled definitively.
    constructor(urlHash, onMutationCallback, trackModal = false) {
      this.baseObserver = new BaseObserver(void 0, new HashPageFilter(urlHash), onMutationCallback, trackModal);
    }
    onPageChanged() {
      this.baseObserver.onPageChanged();
    }
  };
  var ExactHashObserver = class {
    //onMutationCallback should return true if handled definitively.
    constructor(urlHash, onMutationCallback, trackModal = false) {
      this.baseObserver = new BaseObserver(void 0, new ExactHashPageFilter(urlHash), onMutationCallback, trackModal);
    }
    onPageChanged() {
      this.baseObserver.onPageChanged();
    }
  };
  var PageObserver = class {
    constructor(onPageChangedCallback) {
      this.baseObserver = new BaseObserver(onPageChangedCallback, new AllPageFilter(), void 0, false);
    }
    onPageChanged() {
      this.baseObserver.onPageChanged();
    }
  };

  // typescript/leerling/observer.ts
  var observer_default = new HashObserver("#leerlingen-leerling", onMutation);
  function onMutation(mutation) {
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
      if (cell.classList.contains("text-muted")) {
        break;
      }
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
    if (!selectedYearElement)
      return true;
    let selectedYear = parseInt(selectedYearElement.value);
    let now = /* @__PURE__ */ new Date();
    let month = now.getMonth();
    let registrationSchoolYearStart = now.getFullYear();
    if (month <= 3) {
      registrationSchoolYearStart--;
    }
    return selectedYear === registrationSchoolYearStart;
  }
  function decorateSchooljaar() {
    let view = document.getElementById("view_contents");
    let activeYear = isActiveYear();
    if (activeYear) {
      view.classList.remove("oldYear");
    } else {
      view.classList.add("oldYear");
    }
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
            if (matches?.length >= 2) {
              return matches[1].trim() + " - " + matches[2].trim();
            }
            matches = modName.match(rxBasic);
            if (matches?.length >= 1) {
              return matches[1].trim();
            }
            matches = modName.match(rxDesperate);
            if (matches?.length >= 1) {
              return matches[1].trim();
            }
            return ": ???";
          }).join(", ");
        }
        let span = document.createElement("span");
        tr.children[0].appendChild(span);
        if (modNames.length > 1) {
          span.classList.add("badge-warning");
        }
        span.innerText = instrumentText;
      });
    }
    if (options.showNotAssignedClasses) {
      setStripedLessons();
    }
  }
  function setStripedLessons() {
    let classRows = document.querySelectorAll("#leerling_inschrijvingen_weergave tr");
    let classCells = Array.from(classRows).filter((row) => row.querySelector(".table-info") !== null).map((row) => row.children.item(row.children.length - 2));
    for (let td of classCells) {
      let classDate = td.querySelector("span.text-muted");
      if (!classDate)
        continue;
      if (classDate.textContent === "(geen lesmomenten)")
        continue;
      for (let tdd of td.parentElement.children) {
        if (tdd.classList.contains("table-info")) {
          tdd.classList.add("runningStripes");
        }
      }
    }
  }
  async function getModules(size, modal, file, args) {
    let res2 = await fetch("/views/leerlingen/leerling/inschrijvingen/modules_kiezen.modules.div.php?" + args);
    let text2 = await res2.text();
    const template = document.createElement("template");
    template.innerHTML = text2;
    let checks = template.content.querySelectorAll("i.fa-check-square");
    return Array.from(checks).map((check) => check.parentNode.parentNode.parentNode.querySelector("strong").textContent);
  }

  // typescript/lessen/scrape.ts
  function scrapeLessenOverzicht() {
    let table = document.getElementById("table_lessen_resultaat_tabel");
    let body = table.tBodies[0];
    let lessen = [];
    for (const row of body.rows) {
      let lesInfo = row.cells[0];
      let studentsCell = row.cells[1];
      let les = scrapeLesInfo(lesInfo);
      les.tableRow = row;
      les.studentsTable = studentsCell.querySelectorAll("table")[0];
      let smallTags = studentsCell.querySelectorAll("small");
      let arrayLeerlingenAantal = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("leerlingen"));
      if (arrayLeerlingenAantal.length > 0) {
        let reAantallen = /(\d+).\D+(\d+)/;
        let matches = arrayLeerlingenAantal[0].match(reAantallen);
        les.aantal = parseInt(matches[1]);
        les.maxAantal = parseInt(matches[2]);
      }
      let idTag = Array.from(smallTags).find((item) => item.classList.contains("float-right"));
      les.id = idTag.textContent;
      les.wachtlijst = 0;
      let arrayWachtlijst = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("wachtlijst"));
      if (arrayWachtlijst.length > 0) {
        let reWachtlijst = /(\d+)/;
        let matches = arrayWachtlijst[0].match(reWachtlijst);
        les.wachtlijst = parseInt(matches[1]);
      }
      lessen.push(les);
    }
    return lessen;
  }
  function scrapeModules() {
    let lessen = scrapeLessenOverzicht();
    return {
      trimesterModules: scrapeTrimesterModules(lessen),
      jaarModules: scrapeJaarModules(lessen)
    };
  }
  function scrapeTrimesterModules(lessen) {
    let modules = lessen.filter((les) => les.lesType === 0 /* TrimesterModule */);
    let trimesterModules = [];
    for (let module of modules) {
      module.students = scrapeStudents(module.studentsTable);
      const reInstrument = /.*\Snitiatie\s*(\S+).*(\d).*/;
      const match2 = module.naam.match(reInstrument);
      if (match2?.length !== 3) {
        console.error(`Could not process trimester module "${module.naam}" (${module.id}).`);
        continue;
      }
      module.instrumentName = match2[1];
      module.trimesterNo = parseInt(match2[2]);
      trimesterModules.push(module);
    }
    db3(trimesterModules);
    return trimesterModules;
  }
  function scrapeJaarModules(lessen) {
    let modules = lessen.filter((les) => les.lesType === 1 /* JaarModule */);
    let jaarModules = [];
    for (let module of modules) {
      module.students = scrapeStudents(module.studentsTable);
      const reInstrument = /.*\Snitiatie\s*(\S+).*/;
      const match2 = module.naam.match(reInstrument);
      if (match2?.length !== 2) {
        console.error(`Could not process jaar module "${module.naam}" (${module.id}).`);
        continue;
      }
      module.instrumentName = match2[1];
      module.trimesterNo = parseInt(match2[2]);
      jaarModules.push(module);
    }
    db3(jaarModules);
    return jaarModules;
  }
  var StudentInfo = class {
  };
  function scrapeStudents(studentTable) {
    let students = [];
    if (studentTable.tBodies.length === 0) {
      return students;
    }
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
  var Les = class {
  };
  function scrapeLesInfo(lesInfo) {
    let les = new Les();
    let [first] = lesInfo.getElementsByTagName("strong");
    les.vakNaam = first.textContent;
    let badges = lesInfo.getElementsByClassName("badge");
    les.alc = Array.from(badges).some((el) => el.textContent === "ALC");
    les.visible = lesInfo.getElementsByClassName("fa-eye-slash").length === 0;
    let mutedSpans = lesInfo.querySelectorAll("span.text-muted");
    if (mutedSpans.length > 1) {
      les.naam = mutedSpans.item(0).textContent;
    } else {
      les.naam = lesInfo.children[1].textContent;
    }
    if (Array.from(badges).some((el) => el.textContent === "module")) {
      if (les.naam.includes("jaar"))
        les.lesType = 1 /* JaarModule */;
      else if (les.naam.includes("rimester"))
        les.lesType = 0 /* TrimesterModule */;
      else
        les.lesType = 3 /* UnknownModule */;
    } else {
      les.lesType = 2 /* Les */;
    }
    if (mutedSpans.length > 0) {
      les.teacher = Array.from(mutedSpans).pop().textContent;
    }
    let textNodes = Array.from(lesInfo.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
    if (!textNodes) return les;
    les.lesmoment = textNodes[0].nodeValue;
    les.vestiging = textNodes[1].nodeValue;
    return les;
  }

  // libs/Emmeter/tokenizer.ts
  var CLOSING_BRACE = "__CLOSINGBRACE__";
  var DOUBLE_QUOTE = "__DOUBLEQUOTE__";
  var NBSP = 160;
  function tokenize(textToTokenize) {
    let tokens = [];
    let txt = textToTokenize.replaceAll("\\}", CLOSING_BRACE).replaceAll('\\"', DOUBLE_QUOTE);
    let pos = 0;
    let start = pos;
    function pushToken() {
      if (start != pos)
        tokens.push(unescape(txt.substring(start, pos)));
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
    testEmmet,
    //todo: this should only be exported to test.ts
    tokenize
    //todo: this should only be exported to test.ts
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
  function create(text, onIndex) {
    nested = tokenize(text);
    let root = parse();
    let parent = document.querySelector(toSelector(root));
    if ("tag" in root) {
      root = root.child;
    } else {
      throw "root should be a single element.";
    }
    buildElement(parent, root, 1, onIndex);
    return { root: parent, last: lastCreated };
  }
  function append(root, text, onIndex) {
    nested = tokenize(text);
    return parseAndBuild(root, onIndex);
  }
  function insertBefore(root, text, onIndex) {
    nested = tokenize(text);
    let tempRoot = document.createElement("div");
    let result = parseAndBuild(tempRoot, onIndex);
    for (let child of tempRoot.children) {
      root.parentElement.insertBefore(child, root);
    }
    return { root, last: result.last };
  }
  function parseAndBuild(root, onIndex) {
    buildElement(root, parse(), 1, onIndex);
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
    let list2 = [];
    while (true) {
      let el = parseMult();
      if (!el)
        return list2.length === 1 ? list2[0] : { list: list2 };
      list2.push(el);
      if (!match("+"))
        return list2.length === 1 ? list2[0] : { list: list2 };
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
        classList.push(nested.shift());
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
  function createElement(parent, def, index, onIndex) {
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
    return el;
  }
  function buildElement(parent, el, index, onIndex) {
    if ("tag" in el) {
      let created = createElement(parent, el, index, onIndex);
      if (el.child)
        buildElement(created, el.child, index, onIndex);
      return;
    }
    if ("list" in el) {
      for (let def of el.list) {
        buildElement(parent, def, index, onIndex);
      }
    }
    if ("count" in el) {
      for (let i = 0; i < el.count; i++) {
        buildElement(parent, el.child, i, onIndex);
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

  // typescript/lessen/build.ts
  var savedNameSorting = 1 /* LastName */;
  function setSavedNameSorting(sorting) {
    savedNameSorting = sorting;
  }
  function getSavedNameSorting() {
    return savedNameSorting;
  }
  function buildTrimesterTable(tableData, trimesterSorting) {
    tableData.blocks.sort((block1, block2) => block1.instrumentName.localeCompare(block2.instrumentName));
    let trimDiv = emmet.create(`#${TRIM_DIV_ID}>table#trimesterTable[border="2" style.width="100%"]>colgroup>col*3`).root;
    trimDiv.dataset.showFullClass = isButtonHighlighted(FULL_CLASS_BUTTON_ID) ? "true" : "false";
    let { root: newTable, last: trHeader } = emmet.create("#trimesterTable>tbody+thead.table-secondary>tr");
    let newTableBody = newTable.querySelector("tbody");
    let totTrim = [0, 0, 0];
    for (let block of tableData.blocks) {
      let totJaar = block.jaarModules.map((mod) => mod.students.length).reduce((prev, curr) => prev + curr, 0);
      for (let trimNo of [0, 1, 2]) {
        totTrim[trimNo] += totJaar + (block.trimesters[trimNo][0]?.students?.length ?? 0);
      }
    }
    emmet.append(trHeader, "(th>div>span.bold{Trimester $}+span.plain{ ($$ lln)})*3", (index) => totTrim[index].toString());
    switch (trimesterSorting) {
      case 1 /* InstrumentTeacherHour */:
        for (let [instrumentName, instrument] of tableData.instruments) {
          buildGroup(newTableBody, instrument.blocks, instrumentName, (block) => block.teacher, 2 /* Hour */ | 8 /* Location */);
        }
        break;
      case 0 /* TeacherInstrumentHour */:
        for (let [teacherName, teacher] of tableData.teachers) {
          buildGroup(newTableBody, teacher.blocks, teacherName, (block) => block.instrumentName, 2 /* Hour */ | 8 /* Location */);
        }
        break;
      case 2 /* TeacherHour */:
        for (let [teacherName, teacher] of tableData.teachers) {
          buildTitleRow(newTableBody, teacherName);
          for (let [hour, block] of teacher.lesMomenten) {
            buildBlock(newTableBody, block, teacherName, (_block) => hour, 8 /* Location */);
          }
        }
        break;
      case 3 /* InstrumentHour */:
        for (let [instrumentName, instrument] of tableData.instruments) {
          buildTitleRow(newTableBody, instrumentName);
          for (let [hour, block] of instrument.lesMomenten) {
            buildBlock(newTableBody, block, instrumentName, (_block) => hour, 8 /* Location */);
          }
        }
        break;
      case 4 /* Instrument */:
        for (let [instrumentName, instrument] of tableData.instruments) {
          buildTitleRow(newTableBody, instrumentName);
          for (let [, block] of instrument.mergedBlocks) {
            buildBlock(newTableBody, block, instrumentName, void 0, 2 /* Hour */ | 8 /* Location */ | 1 /* Teacher */);
          }
        }
        break;
      case 5 /* Teacher */:
        for (let [teacherName, teacher] of tableData.teachers) {
          buildTitleRow(newTableBody, teacherName);
          for (let [, block] of teacher.mergedBlocks) {
            buildBlock(newTableBody, block, teacherName, void 0, 2 /* Hour */ | 8 /* Location */ | 4 /* Instrument */);
          }
        }
        break;
    }
  }
  function buildGroup(newTableBody, blocks, groupId, getBlockTitle, displayOptions) {
    buildTitleRow(newTableBody, groupId);
    for (let block of blocks) {
      buildBlock(newTableBody, block, groupId, getBlockTitle, displayOptions);
    }
  }
  function createStudentRow(tableBody, rowClass, groupId) {
    let row = createLesRow(groupId);
    tableBody.appendChild(row);
    row.classList.add(rowClass);
    row.dataset.hasFullClass = "false";
    return row;
  }
  function buildBlock(newTableBody, block, groupId, getBlockTitle, displayOptions) {
    blockCounter++;
    let mergedBlock = mergeBlockStudents(block);
    let trimesterHeaders = [0, 1, 2].map((trimNo) => {
      if (mergedBlock.trimesterStudents[trimNo].length < 5 && mergedBlock.maxAantallen[trimNo] < 5)
        return "";
      return `${mergedBlock.trimesterStudents[trimNo].length} van ${mergedBlock.maxAantallen[trimNo]} lln`;
    });
    let trTitle = buildBlockTitle(newTableBody, block, getBlockTitle, groupId);
    let headerRows = buildBlockHeader(newTableBody, block, groupId, trimesterHeaders, displayOptions);
    let studentTopRowNo = newTableBody.children.length;
    if (trTitle)
      trTitle.dataset.hasFullClass = "false";
    headerRows.trModuleLinks.dataset.hasFullClass = "false";
    let hasFullClass = false;
    let filledRowCount = 0;
    sortStudents(mergedBlock.jaarStudents);
    for (let student of mergedBlock.jaarStudents) {
      let row = createStudentRow(newTableBody, "jaarRow", groupId);
      for (let trimNo = 0; trimNo < 3; trimNo++) {
        let cell = buildStudentCell(student);
        row.appendChild(cell);
        cell.classList.add("jaarStudent");
        if (mergedBlock.maxAantallen[trimNo] <= filledRowCount) {
          cell.classList.add("gray");
        }
      }
      filledRowCount++;
    }
    for (let rowNo = 0; rowNo < mergedBlock.blockNeededRows - filledRowCount; rowNo++) {
      let row = createStudentRow(newTableBody, "trimesterRow", groupId);
      for (let trimNo = 0; trimNo < 3; trimNo++) {
        let trimester = mergedBlock.trimesterStudents[trimNo];
        sortStudents(trimester);
        let student = void 0;
        if (trimester) {
          student = trimester[rowNo];
          let maxTrimStudentCount = Math.max(mergedBlock.maxAantallen[trimNo], mergedBlock.maxJaarStudentCount);
          if (trimester.length > 0 && trimester.length >= maxTrimStudentCount) {
            row.dataset.hasFullClass = "true";
            hasFullClass = true;
          }
        }
        let cell = buildStudentCell(student);
        row.appendChild(cell);
        cell.classList.add("trimesterStudent");
        if (mergedBlock.maxAantallen[trimNo] <= rowNo) {
          cell.classList.add("gray");
        }
        if (student?.trimesterInstruments) {
          if (student?.trimesterInstruments[trimNo].length > 1) {
            cell.classList.add("yellowMarker");
          }
        }
      }
    }
    if (hasFullClass) {
      if (trTitle)
        trTitle.dataset.hasFullClass = "true";
      headerRows.trModuleLinks.dataset.hasFullClass = "true";
    }
    if (!mergedBlock.hasWachtlijst) {
      return;
    }
    for (let trimNo of [0, 1, 2]) {
      let row = newTableBody.children[newTableBody.children.length - 1];
      row.classList.add("wachtlijst");
      let cell = row.children[trimNo];
      if (mergedBlock.wachtlijsten[trimNo] === 0) {
        continue;
      }
      const small = document.createElement("small");
      cell.appendChild(small);
      small.appendChild(document.createTextNode(`(${mergedBlock.wachtlijsten[trimNo]} op wachtlijst)`));
      small.classList.add("text-danger");
      if (mergedBlock.wachtlijsten[trimNo] > 0 && mergedBlock.trimesterStudents[trimNo].length < mergedBlock.maxAantallen[trimNo]) {
        cell.querySelector("small").classList.add("yellowMarker");
        newTableBody.children[studentTopRowNo + mergedBlock.trimesterStudents[trimNo].length].children[trimNo].classList.add("yellowMarker");
      }
    }
  }
  var blockCounter = 0;
  function createLesRow(groupId) {
    let tr = document.createElement("tr");
    tr.dataset.blockId = "block" + blockCounter;
    tr.dataset.groupId = groupId;
    return tr;
  }
  function buildTitleRow(newTableBody, title) {
    const trTitle = createLesRow(title);
    trTitle.dataset.blockId = "groupTitle";
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
    return { trTitle, divTitle };
  }
  function buildBlockTitle(newTableBody, block, getBlockTitle, groupId) {
    if (!getBlockTitle && !block.errors)
      return void 0;
    const trBlockTitle = newTableBody.appendChild(createLesRow(groupId));
    trBlockTitle.classList.add("blockRow");
    let { last: divBlockTitle } = emmet.append(trBlockTitle, "td.infoCell[colspan=3]>div.text-muted");
    if (getBlockTitle) {
      let spanSubtitle = document.createElement("span");
      divBlockTitle.appendChild(spanSubtitle);
      spanSubtitle.classList.add("subTitle");
      spanSubtitle.appendChild(document.createTextNode(getBlockTitle(block)));
    }
    for (let jaarModule of block.jaarModules) {
      divBlockTitle.appendChild(buildModuleButton(">", jaarModule.id, false));
    }
    if (block.errors) {
      let errorSpan = document.createElement("span");
      errorSpan.appendChild(document.createTextNode(block.errors));
      errorSpan.classList.add("lesError");
      divBlockTitle.appendChild(errorSpan);
    }
    return trBlockTitle;
  }
  function buildInfoRow(newTableBody, text, show, groupId) {
    const trBlockInfo = newTableBody.appendChild(createLesRow(groupId));
    trBlockInfo.classList.add("blockRow");
    if (show === false)
      trBlockInfo.dataset.keepHidden = "true";
    let { last: divBlockInfo } = emmet.append(trBlockInfo, "td.infoCell[colspan=3]>div.text-muted");
    divBlockInfo.appendChild(document.createTextNode(text));
  }
  function buildBlockHeader(newTableBody, block, groupId, trimesterHeaders, displayOptions) {
    buildInfoRow(newTableBody, block.teacher, Boolean(1 /* Teacher */ & displayOptions), groupId);
    buildInfoRow(newTableBody, block.instrumentName, Boolean(4 /* Instrument */ & displayOptions), groupId);
    buildInfoRow(newTableBody, block.lesmoment, Boolean(2 /* Hour */ & displayOptions), groupId);
    buildInfoRow(newTableBody, block.vestiging, Boolean(8 /* Location */ & displayOptions), groupId);
    const trModuleLinks = createLesRow(groupId);
    newTableBody.appendChild(trModuleLinks);
    trModuleLinks.classList.add("blockRow");
    const tdLink1 = document.createElement("td");
    trModuleLinks.appendChild(tdLink1);
    tdLink1.appendChild(document.createTextNode(trimesterHeaders[0]));
    if (block.trimesters[0][0]) {
      tdLink1.appendChild(buildModuleButton("1", block.trimesters[0][0].id, true));
    }
    const tdLink2 = document.createElement("td");
    trModuleLinks.appendChild(tdLink2);
    tdLink2.appendChild(document.createTextNode(trimesterHeaders[1]));
    if (block.trimesters[1][0]) {
      tdLink2.appendChild(buildModuleButton("2", block.trimesters[1][0].id, true));
    }
    const tdLink3 = document.createElement("td");
    trModuleLinks.appendChild(tdLink3);
    tdLink3.appendChild(document.createTextNode(trimesterHeaders[2]));
    if (block.trimesters[2][0]) {
      tdLink3.appendChild(buildModuleButton("3", block.trimesters[2][0].id, true));
    }
    return {
      trModuleLinks,
      blockId: blockCounter
    };
  }
  function buildModuleButton(buttonText, id, floatRight) {
    const button = document.createElement("a");
    button.href = "#";
    button.setAttribute("onclick", `showView('lessen-les','','id=${id}'); return false;`);
    button.classList.add("lesButton");
    if (floatRight)
      button.classList.add("float-right");
    button.innerText = buttonText;
    return button;
  }
  function buildStudentCell(student) {
    const cell = document.createElement("td");
    let studentSpan = document.createElement("span");
    let displayName = String.fromCharCode(NBSP);
    studentSpan.appendChild(document.createTextNode(displayName));
    cell.appendChild(studentSpan);
    if (!student) {
      return cell;
    }
    if (savedNameSorting === 1 /* LastName */)
      displayName = student.naam + " " + student.voornaam;
    else
      displayName = student.voornaam + " " + student.naam;
    studentSpan.textContent = displayName;
    if (student.allYearSame) {
      studentSpan.classList.add("allYear");
    }
    const anchor = document.createElement("a");
    cell.appendChild(anchor);
    anchor.href = "#";
    anchor.classList.add("pl-2");
    anchor.title = student.info;
    anchor.onclick = async function() {
      let id = await fetchStudentId(student.name);
      if (id <= 0)
        window.location.href = "/?#zoeken?zoek=" + stripStudentName(student.name);
      else {
        await fetch("https://administratie.dko3.cloud/view.php?args=leerlingen-leerling?id=" + id);
        await fetch("https://administratie.dko3.cloud/views/leerlingen/leerling/index.inschrijvingen.tab.php");
        window.location.href = "/?#leerlingen-leerling?id=" + id + ",tab=inschrijvingen";
      }
      return false;
    };
    const iTag = document.createElement("i");
    anchor.appendChild(iTag);
    iTag.classList.add("fas", "fa-user-alt");
    if (student.notAllTrimsHaveAnInstrument) {
      iTag.classList.add("no3trims");
    }
    return cell;
  }
  function stripStudentName(name) {
    return name.replaceAll(/[,()'-]/g, " ").replaceAll("  ", " ");
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
    if (namePos < 0) {
      return 0;
    }
    let idPos = text.substring(0, namePos).lastIndexOf("'id=", namePos);
    let id = text.substring(idPos, idPos + 10);
    let found = id.match(/\d+/);
    if (found?.length)
      return parseInt(found[0]);
    throw `No id found for student ${studentName}.`;
  }

  // typescript/lessen/convert.ts
  var BlockInfo2 = class {
    static emptyBlock() {
      return {
        teacher: void 0,
        vestiging: void 0,
        maxAantal: -1,
        instrumentName: void 0,
        lesmoment: void 0,
        trimesters: [[], [], []],
        jaarModules: [],
        errors: ""
      };
    }
  };
  function buildTrimesters(instrumentTeacherMomentModules) {
    let mergedInstrument = [[], [], []];
    instrumentTeacherMomentModules.filter((module) => module.lesType === 0 /* TrimesterModule */).forEach((module) => {
      mergedInstrument[module.trimesterNo - 1].push(module);
    });
    return mergedInstrument;
  }
  function getLesmomenten(modules) {
    let lesMomenten = modules.map((module) => module.formattedLesmoment);
    return [...new Set(lesMomenten)];
  }
  function getMaxAantal(modules) {
    return modules.map((module) => module.maxAantal).reduce(
      (prev, next) => {
        return prev < next ? next : prev;
      }
    );
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
      } else {
        module.formattedLesmoment = matches[1] + " " + matches[2] + "-" + matches[3];
      }
      module.formattedLesmoment = matches[1] + " " + matches[2] + "-" + matches[3];
    }
  }
  function setStudentPopupInfo(student) {
    student.info = "";
    if (!student.trimesterInstruments)
      return;
    for (let instrs of student.trimesterInstruments) {
      if (instrs.length) {
        student.info += instrs[0].trimesterNo + ". " + instrs.map((instr) => instr.instrumentName) + "\n";
      } else {
        student.info += "?. ---\n";
      }
    }
  }
  function setStudentAllTrimsTheSameInstrument(student) {
    if (!student.trimesterInstruments)
      return;
    let instruments = student.trimesterInstruments.flat();
    if (instruments.length < 3) {
      student.allYearSame = false;
      return;
    }
    student.allYearSame = instruments.every((instr) => instr.instrumentName === (student?.trimesterInstruments[0][0]?.instrumentName ?? "---"));
  }
  function setStudentNoInstrumentForAllTrims(student) {
    if (!student.trimesterInstruments)
      return;
    student.notAllTrimsHaveAnInstrument = false;
    for (let trim of student.trimesterInstruments) {
      if (trim.length == 0)
        student.notAllTrimsHaveAnInstrument = true;
    }
  }
  function buildTableData(inputModules) {
    prepareLesmomenten(inputModules);
    let tableData = {
      students: /* @__PURE__ */ new Map(),
      instruments: /* @__PURE__ */ new Map(),
      teachers: /* @__PURE__ */ new Map(),
      blocks: []
    };
    let instruments = distinct(inputModules.map((module) => module.instrumentName));
    for (let instrumentName of instruments) {
      let instrumentModules = inputModules.filter((module) => module.instrumentName === instrumentName);
      let teachers2 = distinct(instrumentModules.map((module) => module.teacher));
      for (let teacher of teachers2) {
        let instrumentTeacherModules = instrumentModules.filter((module) => module.teacher === teacher);
        let lesmomenten = distinct(getLesmomenten(instrumentTeacherModules));
        for (let lesmoment of lesmomenten) {
          let instrumentTeacherMomentModules = instrumentTeacherModules.filter((module) => module.formattedLesmoment === lesmoment);
          let block = BlockInfo2.emptyBlock();
          block.instrumentName = instrumentName;
          block.teacher = teacher;
          block.lesmoment = lesmoment;
          block.maxAantal = getMaxAantal(instrumentTeacherMomentModules);
          block.vestiging = getVestigingen(instrumentTeacherMomentModules);
          block.trimesters = buildTrimesters(instrumentTeacherMomentModules);
          block.jaarModules = instrumentTeacherMomentModules.filter((module) => module.lesType === 1 /* JaarModule */);
          checkBlockForErrors(block);
          tableData.blocks.push(block);
          for (let trim of block.trimesters) {
            addTrimesterStudentsToMapAndCount(tableData.students, trim);
          }
          for (let jaarModule of block.jaarModules) {
            addJaarStudentsToMapAndCount(tableData.students, jaarModule);
          }
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
    for (let instr of instrumentNames) {
      tableData.instruments.set(instr, { name: instr, blocks: [] });
    }
    for (let block of tableData.blocks) {
      tableData.instruments.get(block.instrumentName).blocks.push(block);
    }
    let teachers = distinct(tableData.blocks.map((b) => b.teacher)).sort((a, b) => {
      return a.localeCompare(b);
    });
    for (let t of teachers) {
      tableData.teachers.set(t, { name: t, blocks: [] });
    }
    for (let block of tableData.blocks) {
      tableData.teachers.get(block.teacher).blocks.push(block);
    }
    groupBlocksTwoLevels(
      tableData.teachers.values(),
      (block) => block.lesmoment,
      (primary, secundary) => {
        primary.lesMomenten = secundary;
      }
    );
    groupBlocksTwoLevels(
      tableData.instruments.values(),
      (block) => block.lesmoment,
      (primary, secundary) => {
        primary.lesMomenten = secundary;
      }
    );
    groupBlocks(
      tableData.teachers.values(),
      (block) => block.teacher
    );
    groupBlocks(
      tableData.instruments.values(),
      (block) => block.instrumentName
    );
    db3(tableData);
    return tableData;
  }
  function groupBlocksTwoLevels(primaryGroups, getSecondaryKey, setSecondaryGroup) {
    for (let primary of primaryGroups) {
      let blocks = primary.blocks;
      let secondaryKeys = distinct(blocks.map(getSecondaryKey));
      let secondaryGroup = new Map(secondaryKeys.map((key) => [key, BlockInfo2.emptyBlock()]));
      for (let block of blocks) {
        mergeBlock(secondaryGroup.get(getSecondaryKey(block)), block);
      }
      secondaryGroup.forEach((block) => {
        updateMergedBlock(block);
      });
      setSecondaryGroup(primary, secondaryGroup);
    }
  }
  function groupBlocks(primaryGroups, getPrimaryKey) {
    for (let primary of primaryGroups) {
      let blocks = primary.blocks;
      let keys = distinct(blocks.map(getPrimaryKey));
      primary.mergedBlocks = new Map(keys.map((key) => [key, BlockInfo2.emptyBlock()]));
      for (let block of blocks) {
        mergeBlock(primary.mergedBlocks.get(getPrimaryKey(block)), block);
      }
      primary.mergedBlocks.forEach((block) => {
        updateMergedBlock(block);
      });
    }
  }
  function mergeBlock(blockToMergeTo, block2) {
    {
      blockToMergeTo.jaarModules.push(...block2.jaarModules);
      for (let trimNo of [0, 1, 2]) {
        blockToMergeTo.trimesters[trimNo].push(block2.trimesters[trimNo][0]);
      }
      blockToMergeTo.errors += block2.errors;
      return blockToMergeTo;
    }
  }
  function updateMergedBlock(block) {
    let allLessen = block.trimesters.flat().concat(block.jaarModules);
    block.lesmoment = [...new Set(allLessen.filter((les) => les).map((les) => les.lesmoment))].join(", ");
    block.teacher = [...new Set(allLessen.filter((les) => les).map((les) => les.teacher))].join(", ");
    block.vestiging = [...new Set(allLessen.filter((les) => les).map((les) => les.vestiging))].join(", ");
    block.instrumentName = [...new Set(allLessen.filter((les) => les).map((les) => les.instrumentName))].join(", ");
  }
  function checkBlockForErrors(block) {
    let maxMoreThan100 = block.jaarModules.map((module) => module.maxAantal > TOO_LARGE_MAX).includes(true);
    if (!maxMoreThan100) {
      maxMoreThan100 = block.trimesters.flat().map((module) => module?.maxAantal > TOO_LARGE_MAX).includes(true);
    }
    if (maxMoreThan100)
      block.errors += "Max aantal lln > " + TOO_LARGE_MAX;
  }
  function addTrimesterStudentsToMapAndCount(allStudents, blockTrimModules) {
    for (let blockTrimModule of blockTrimModules) {
      if (!blockTrimModule)
        continue;
      for (let student of blockTrimModule.students) {
        if (!allStudents.has(student.name)) {
          student.trimesterInstruments = [[], [], []];
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
  function sortStudents(students) {
    if (!students) return;
    let comparator = new Intl.Collator();
    let sorting = getSavedNameSorting();
    students.sort((a, b) => {
      if (a.allYearSame && !b.allYearSame) {
        return -1;
      } else if (!a.allYearSame && b.allYearSame) {
        return 1;
      } else {
        let aName = sorting === 1 /* LastName */ ? a.naam + a.voornaam : a.voornaam + a.naam;
        let bName = sorting === 1 /* LastName */ ? b.naam + b.voornaam : b.voornaam + b.naam;
        return comparator.compare(aName, bName);
      }
    });
  }
  var TOO_LARGE_MAX = 100;
  function mergeBlockStudents(block) {
    let jaarStudents = block.jaarModules.map((les) => les.students).flat();
    let trimesterStudents = [
      block.trimesters[0].map((les) => les?.students ?? []).flat(),
      block.trimesters[1].map((les) => les?.students ?? []).flat(),
      block.trimesters[2].map((les) => les?.students ?? []).flat()
    ];
    trimesterStudents.forEach((trim) => sortStudents(trim));
    let maxAantallen = block.trimesters.map((trimLessen) => {
      if (trimLessen.length === 0)
        return 0;
      return trimLessen.map((les) => les?.maxAantal ?? 0).map((maxAantal) => maxAantal > TOO_LARGE_MAX ? 4 : maxAantal).reduce((a, b) => a + b);
    });
    let blockNeededRows = Math.max(
      ...maxAantallen,
      ...trimesterStudents.map((stud) => stud.length)
    );
    let wachtlijsten = block.trimesters.map((trimLessen) => {
      if (trimLessen.length === 0)
        return 0;
      return trimLessen.map((les) => les?.wachtlijst ?? 0).reduce((a, b) => a + b);
    });
    let hasWachtlijst = wachtlijsten.some((wachtLijst) => wachtLijst > 0);
    if (hasWachtlijst) {
      blockNeededRows++;
    }
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

  // typescript/lessen/observer.ts
  var observer_default2 = new HashObserver("#lessen-overzicht", onMutation2);
  function onMutation2(mutation) {
    let lessenOverzicht = document.getElementById(LESSEN_OVERZICHT_ID);
    if (mutation.target !== lessenOverzicht) {
      return false;
    }
    let printButton = document.getElementById("btn_print_overzicht_lessen");
    if (!printButton) {
      return false;
    }
    let copyLessonButton = printButton.parentElement.querySelector("button:has(i.fa-reply-all)");
    if (copyLessonButton?.title === "") {
      copyLessonButton.title = copyLessonButton.textContent.replaceAll("\n", " ").replaceAll("      ", " ").replaceAll("     ", " ").replaceAll("    ", " ").replaceAll("   ", " ").replaceAll("  ", " ");
      copyLessonButton.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE)
          node.remove();
      });
      copyLessonButton.querySelector("strong")?.remove();
      copyLessonButton.style.backgroundColor = "red";
      copyLessonButton.style.color = "white";
    }
    onLessenOverzichtChanged(printButton);
    return true;
  }
  function onLessenOverzichtChanged(printButton) {
    let overzichtDiv = document.getElementById(LESSEN_OVERZICHT_ID);
    let trimDiv = document.getElementById(TRIM_DIV_ID);
    if (!trimDiv) {
      let trimDiv2 = document.createElement("div");
      let originalTable = document.getElementById("table_lessen_resultaat_tabel");
      originalTable.insertAdjacentElement("afterend", trimDiv2);
      trimDiv2.id = TRIM_DIV_ID;
    }
    overzichtDiv.dataset.filterFullClasses = "false";
    let badges = document.getElementsByClassName("badge");
    let hasModules = Array.from(badges).some((el) => el.textContent === "module");
    let hasAlc = Array.from(badges).some((el) => el.textContent === "ALC");
    let warnings = document.getElementsByClassName("text-warning");
    let hasWarnings = warnings.length !== 0;
    let hasFullClasses = Array.from(warnings).map((item) => item.textContent).some((txt) => txt.includes("leerlingen"));
    if (!hasModules && !hasAlc && !hasWarnings && !hasFullClasses) {
      return;
    }
    if (hasModules) {
      addButton2(printButton, TRIM_BUTTON_ID, "Toon trimesters", onClickShowTrimesters, "fa-sitemap");
    }
    if (hasAlc || hasWarnings) {
      addButton2(printButton, CHECKS_BUTTON_ID, "Controleer lessen op fouten", onClickCheckResults, "fa-stethoscope");
    }
    if (hasFullClasses) {
      addButton2(printButton, FULL_CLASS_BUTTON_ID, "Filter volle klassen", onClickFullClasses, "fa-weight-hanging");
    }
    addFilterField();
  }
  var TXT_FILTER_ID = "txtFilter";
  var savedSearch = "";
  var savedGrouping = 1 /* InstrumentTeacherHour */;
  function addFilterField() {
    let divButtonNieuweLes = document.querySelector("#lessen_overzicht > div > button");
    if (!document.getElementById(TXT_FILTER_ID))
      divButtonNieuweLes.insertAdjacentElement("afterend", createScearchField(TXT_FILTER_ID, onSearchInput, savedSearch));
    onSearchInput();
  }
  function onSearchInput() {
    savedSearch = document.getElementById(TXT_FILTER_ID).value;
    if (isTrimesterTableVisible()) {
      let siblingsAndAncestorsFilter = function(tr, context) {
        if (context.headerGroupIds.includes(tr.dataset.groupId))
          return true;
        if (context.blockIds.includes(tr.dataset.blockId))
          return true;
        return context.groupIds.includes(tr.dataset.groupId) && tr.classList.contains("groupHeader");
      };
      let rowFilter = createTextRowFilter(savedSearch, (tr) => tr.textContent);
      let filteredRows = filterTableRows(TRIM_TABLE_ID, rowFilter);
      let blockIds = [...new Set(filteredRows.filter((tr) => tr.dataset.blockId !== "groupTitle").map((tr) => tr.dataset.blockId))];
      let groupIds = [...new Set(filteredRows.map((tr) => tr.dataset.groupId))];
      let headerGroupIds = [...new Set(filteredRows.filter((tr) => tr.dataset.blockId === "groupTitle").map((tr) => tr.dataset.groupId))];
      filterTable(TRIM_TABLE_ID, { context: { blockIds, groupIds, headerGroupIds }, rowFilter: siblingsAndAncestorsFilter });
    } else {
      let rowFilter = createTextRowFilter(savedSearch, (tr) => tr.cells[0].textContent);
      filterTable("table_lessen_resultaat_tabel", rowFilter);
    }
  }
  function addButton2(printButton, buttonId, title, clickFunction, imageId) {
    let button = document.getElementById(buttonId);
    if (button === null) {
      const button2 = document.createElement("button");
      button2.classList.add("btn", "btn-sm", "btn-outline-secondary", "w-100");
      button2.id = buttonId;
      button2.style.marginTop = "0";
      button2.onclick = clickFunction;
      button2.title = title;
      const buttonContent = document.createElement("i");
      button2.appendChild(buttonContent);
      buttonContent.classList.add("fas", imageId);
      printButton.insertAdjacentElement("beforebegin", button2);
    }
  }
  function onClickCheckResults() {
    let lessen = scrapeLessenOverzicht();
    let table = document.getElementById("table_lessen_resultaat_tabel");
    let checksDiv = document.createElement("div");
    checksDiv.id = "checksDiv";
    checksDiv.classList.add("badge-warning");
    let checksText = "";
    table.parentNode.insertBefore(checksDiv, table.previousSibling);
    for (let les of lessen) {
      if (les.alc) {
        if (les.visible) {
          checksText += `<div>ALC les <b>${les.naam}</b> is online zichtbaar.</div>`;
        }
      }
    }
    checksDiv.innerHTML = checksText;
  }
  function showOnlyFullTrimesters(onlyFull) {
    let trimDiv = document.getElementById(TRIM_DIV_ID);
    trimDiv.dataset.showFullClass = onlyFull ? "true" : "false";
  }
  function onClickFullClasses() {
    let lessen = scrapeLessenOverzicht();
    let overzichtDiv = document.getElementById(LESSEN_OVERZICHT_ID);
    overzichtDiv.dataset.filterFullClasses = (overzichtDiv.dataset.filterFullClasses ?? "false") === "false" ? "true" : "false";
    let displayState = overzichtDiv.dataset.filterFullClasses === "true" ? "none" : "table-row";
    for (let les of lessen) {
      if (les.aantal < les.maxAantal) {
        les.tableRow.style.display = displayState;
      }
    }
    setButtonHighlighted(FULL_CLASS_BUTTON_ID, overzichtDiv.dataset.filterFullClasses === "true");
    showOnlyFullTrimesters(displayState === "none");
  }
  function onClickShowTrimesters() {
    showTrimesterTable(!isTrimesterTableVisible(), savedGrouping);
  }
  function isTrimesterTableVisible() {
    return document.getElementById("table_lessen_resultaat_tabel").style.display === "none";
  }
  function showTrimesterTable(show, grouping) {
    document.getElementById(TRIM_TABLE_ID)?.remove();
    if (!document.getElementById(TRIM_TABLE_ID)) {
      let inputModules = scrapeModules();
      let tableData = buildTableData(inputModules.trimesterModules.concat(inputModules.jaarModules));
      buildTrimesterTable(tableData, grouping);
    }
    document.getElementById("table_lessen_resultaat_tabel").style.display = show ? "none" : "table";
    document.getElementById(TRIM_TABLE_ID).style.display = show ? "table" : "none";
    document.getElementById(TRIM_BUTTON_ID).title = show ? "Toon normaal" : "Toon trimesters";
    setButtonHighlighted(TRIM_BUTTON_ID, show);
    setSorteerLine(show, grouping);
    onSearchInput();
  }
  function addSortingAnchorOrText() {
    let sorteerDiv = document.getElementById("trimSorteerDiv");
    sorteerDiv.innerHTML = "Sorteer : ";
    if (getSavedNameSorting() === 0 /* FirstName */) {
      emmet.append(sorteerDiv, 'a{Naam}[href="#"]+{ | }+strong{Voornaam}');
    } else {
      emmet.append(sorteerDiv, 'strong{Naam}+{ | }+a{Voornaam}[href="#"]');
    }
    for (let anchor of sorteerDiv.querySelectorAll("a")) {
      anchor.onclick = (mouseEvent) => {
        if (mouseEvent.target.textContent === "Naam")
          setSavedNameSorting(1 /* LastName */);
        else
          setSavedNameSorting(0 /* FirstName */);
        showTrimesterTable(true, savedGrouping);
        addSortingAnchorOrText();
        return false;
      };
    }
  }
  function setSorteerLine(showTrimTable, grouping) {
    let oldSorteerSpan = document.querySelector("#lessen_overzicht > span");
    let newGroupingDiv = document.getElementById("trimGroepeerDiv");
    if (!newGroupingDiv) {
      newGroupingDiv = document.createElement("div");
      newGroupingDiv.id = "trimGroepeerDiv";
      newGroupingDiv.classList.add("text-muted");
      oldSorteerSpan.parentNode.insertBefore(newGroupingDiv, oldSorteerSpan.nextSibling);
    }
    let newSortingDiv = document.getElementById("trimSorteerDiv");
    if (!newSortingDiv) {
      emmet.insertBefore(newGroupingDiv, "div#trimSorteerDiv.text-muted");
      addSortingAnchorOrText();
    }
    newGroupingDiv.innerText = "Groepeer: ";
    oldSorteerSpan.style.display = showTrimTable ? "none" : "";
    newGroupingDiv.style.display = showTrimTable ? "" : "none";
    newGroupingDiv.appendChild(createGroupingAnchorOrText(1 /* InstrumentTeacherHour */, grouping));
    newGroupingDiv.appendChild(document.createTextNode(" | "));
    newGroupingDiv.appendChild(createGroupingAnchorOrText(0 /* TeacherInstrumentHour */, grouping));
    newGroupingDiv.appendChild(document.createTextNode(" | "));
    newGroupingDiv.appendChild(createGroupingAnchorOrText(2 /* TeacherHour */, grouping));
    newGroupingDiv.appendChild(document.createTextNode(" | "));
    newGroupingDiv.appendChild(createGroupingAnchorOrText(4 /* Instrument */, grouping));
    newGroupingDiv.appendChild(document.createTextNode(" | "));
    newGroupingDiv.appendChild(createGroupingAnchorOrText(5 /* Teacher */, grouping));
  }
  function createGroupingAnchorOrText(grouping, activeSorting) {
    let sortingText = "";
    switch (grouping) {
      case 1 /* InstrumentTeacherHour */:
        sortingText = "instrument+leraar+lesuur";
        break;
      case 0 /* TeacherInstrumentHour */:
        sortingText = "leraar+instrument+lesuur";
        break;
      case 2 /* TeacherHour */:
        sortingText = "leraar+lesuur";
        break;
      case 3 /* InstrumentHour */:
        sortingText = "instrument+lesuur";
        break;
      case 4 /* Instrument */:
        sortingText = "instrument";
        break;
      case 5 /* Teacher */:
        sortingText = "leraar";
        break;
    }
    if (activeSorting === grouping) {
      let strong = document.createElement("strong");
      strong.appendChild(document.createTextNode(sortingText));
      return strong;
    } else {
      let anchor = document.createElement("a");
      anchor.innerText = sortingText;
      anchor.href = "#";
      anchor.onclick = () => {
        savedGrouping = grouping;
        showTrimesterTable(true, grouping);
        return false;
      };
      return anchor;
    }
  }

  // typescript/les/observer.ts
  var observer_default3 = new HashObserver("#lessen-les", onMutation3);
  function onMutation3(mutation) {
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
      if (document.getElementById(SORT_VOORNAAM_ID))
        return;
      let anchorSortVoornaam = document.createElement("a");
      anchorSortVoornaam.id = SORT_VOORNAAM_ID;
      anchorSortVoornaam.href = "#";
      anchorSortVoornaam.innerText = "voornaam";
      anchorSortVoornaam.classList.add("text-muted");
      anchorSortVoornaam.onclick = onSortVoornaam;
      sortSpan.insertBefore(anchorSortVoornaam, graadEnNaam);
      sortSpan.insertBefore(document.createTextNode(" | "), graadEnNaam);
    } catch (e) {
    }
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
  function switchNaamVoornaam(event) {
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

  // typescript/academie/observer.ts
  var observer_default4 = new PageObserver(setSchoolBackground);
  registerSettingsObserver(setSchoolBackground);
  function setSchoolBackground() {
    let { userName, schoolName } = getUserAndSchoolName();
    let isMyAcademy = options.myAcademies.split("\n").filter((needle) => needle !== "").find((needle) => schoolName.includes(needle)) != void 0;
    if (options.myAcademies === "") {
      isMyAcademy = true;
    }
    if (isMyAcademy || getGlobalSettings().globalHide === true || options.markOtherAcademies === false) {
      document.body.classList.remove("otherSchool");
    } else {
      document.body.classList.add("otherSchool");
    }
  }

  // typescript/werklijst/buildUren.ts
  var isUpdatePaused = true;
  var cellChanged = false;
  var popoverIndex = 1;
  var theData;
  var editableObserver = new MutationObserver((mutationList, observer) => editableObserverCallback(mutationList, observer));
  setInterval(checkAndUpdate, 5e3);
  var colDefsArray = [
    { key: "vak", def: { label: "Vak", classList: [], factor: 1, getText: (ctx) => ctx.vakLeraar.vak } },
    { key: "leraar", def: { label: "Leraar", classList: [], factor: 1, getText: (ctx) => ctx.vakLeraar.leraar.replaceAll("{", "").replaceAll("}", "") } },
    { key: "grjr2_1", def: { label: "2.1", classList: [], factor: 1 / 4, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "grjr2_2", def: { label: "2.2", classList: [], factor: 1 / 4, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "grjr2_3", def: { label: "2.3", classList: [], factor: 1 / 3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "grjr2_4", def: { label: "2.4", classList: [], factor: 1 / 3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "uren_2e_gr", def: { label: "uren\n2e gr", classList: ["yellow"], factor: 1, getValue: (ctx) => calcUrenFactored(ctx, ["grjr2_1", "grjr2_2", "grjr2_3", "grjr2_4"]), totals: true, calculated: true } },
    { key: "grjr3_1", def: { label: "3.1", classList: [], factor: 1 / 3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "grjr3_2", def: { label: "3.2", classList: [], factor: 1 / 3, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "grjr3_3", def: { label: "3.3", classList: [], factor: 1 / 2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "uren_3e_gr", def: { label: "uren\n3e gr", classList: ["yellow"], factor: 1, getValue: (ctx) => calcUrenFactored(ctx, ["grjr3_1", "grjr3_2", "grjr3_3"]), totals: true, calculated: true } },
    { key: "grjr4_1", def: { label: "4.1", classList: [], factor: 1 / 2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "grjr4_2", def: { label: "4.2", classList: [], factor: 1 / 2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "grjr4_3", def: { label: "4.3", classList: [], factor: 1 / 2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "uren_4e_gr", def: { label: "uren\n4e gr", classList: ["yellow"], factor: 1, getValue: (ctx) => calcUrenFactored(ctx, ["grjr4_1", "grjr4_2", "grjr4_3"]), totals: true, calculated: true } },
    { key: "grjr_s_1", def: { label: "S.1", classList: [], factor: 1 / 2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "grjr_s_2", def: { label: "S.2", classList: [], factor: 1 / 2, getValue: (ctx) => ctx.vakLeraar.countMap.get(ctx.colDef.label).count, fill: fillGraadCell } },
    { key: "uren_spec", def: { label: "uren\nspec", classList: ["yellow"], factor: 1, getValue: (ctx) => calcUrenFactored(ctx, ["grjr_s_1", "grjr_s_2"]), totals: true, calculated: true } },
    { key: "aantal_lln", def: { label: "aantal\nlln", classList: ["blueish"], factor: 1, getValue: (ctx) => calcUren(ctx, ["grjr2_1", "grjr2_2", "grjr2_3", "grjr2_4", "grjr3_1", "grjr3_2", "grjr3_3", "grjr4_1", "grjr4_2", "grjr4_3", "grjr_s_1", "grjr_s_2"]), totals: true, calculated: true } },
    { key: "tot_uren", def: { label: "tot\nuren", classList: ["creme"], factor: 1, getValue: (ctx) => calcUrenFactored(ctx, ["grjr2_1", "grjr2_2", "grjr2_3", "grjr2_4", "grjr3_1", "grjr3_2", "grjr3_3", "grjr4_1", "grjr4_2", "grjr4_3", "grjr_s_1", "grjr_s_2"]), totals: true, calculated: true } },
    { key: "over", def: { label: "Over", classList: [], factor: 1, getValue: (ctx) => calcOver(ctx), calculated: true } }
  ];
  var colDefs = new Map(colDefsArray.map((def) => [def.key, def.def]));
  function getYearKeys(year) {
    let yrPrev = year - 2e3 - 1;
    let yrNow = yrPrev + 1;
    let yrNext = yrPrev + 2;
    let keyPrev = `uren_${yrPrev}_${yrNow}`;
    let keyNext = `uren_${yrNow}_${yrNext}`;
    return { yrPrev, yrNow, yrNext, keyPrev, keyNext };
  }
  function updateColDefs(year) {
    let { yrPrev, yrNow, yrNext, keyPrev, keyNext } = getYearKeys(year);
    let yearColDefs = /* @__PURE__ */ new Map();
    yearColDefs.set(keyPrev, { label: `Uren
${yrPrev}-${yrNow}`, classList: ["editable_number"], factor: 1, getValue: (ctx) => parseInt(ctx.data.fromCloud.columnMap.get(`uren_${yrPrev}_${yrNow}`)?.get(ctx.vakLeraar.id)), totals: true });
    yearColDefs.set(keyNext, { label: `Uren
${yrNow}-${yrNext}`, classList: ["editable_number"], factor: 1, getValue: (ctx) => parseInt(ctx.data.fromCloud.columnMap.get(`uren_${yrNow}_${yrNext}`)?.get(ctx.vakLeraar.id)), totals: true });
    colDefs = new Map([...yearColDefs, ...new Map(colDefsArray.map((def) => [def.key, def.def]))]);
    let idx = 0;
    colDefs.forEach((colDef) => {
      colDef.colIndex = idx++;
      colDef.total = 0;
    });
  }
  function calcOver(ctx) {
    let totUren = getColValue(ctx, "tot_uren");
    if (isNaN(totUren)) {
      totUren = 0;
    }
    let urenJaar = getColValue(ctx, ctx.yearKey);
    if (isNaN(urenJaar)) {
      urenJaar = 0;
    }
    return urenJaar - totUren;
  }
  function getColValue(ctx, colKey) {
    let newCtx = { ...ctx };
    newCtx.colKey = colKey;
    newCtx.colDef = newCtx.colDefs.get(colKey);
    return newCtx.colDef.getValue(newCtx);
  }
  function editableObserverCallback(mutationList, _observer) {
    if (mutationList.every((mut) => mut.type === "attributes"))
      return;
    cellChanged = true;
  }
  function getUrenVakLeraarFileName() {
    return getSchoolIdString() + "_uren_vak_lk_" + findSchooljaar().replace("-", "_") + ".json";
  }
  function createJsonCloudData() {
    return {
      version: "1.0",
      columns: []
    };
  }
  function dataToJson() {
    let data = createJsonCloudData();
    let col1 = columnToJson(data, getYearKeys(theData.year).keyPrev);
    let col2 = columnToJson(data, getYearKeys(theData.year).keyNext);
    data.columns.push({ key: getYearKeys(theData.year).keyPrev, rows: col1 });
    data.columns.push({ key: getYearKeys(theData.year).keyNext, rows: col2 });
    return data;
  }
  function columnToJson(_data, colKey) {
    let cells = [];
    for (let [key, value] of theData.fromCloud.columnMap.get(colKey)) {
      let row = {
        key,
        value
      };
      cells.push(row);
    }
    return cells;
  }
  function checkAndUpdate() {
    if (isUpdatePaused) {
      return;
    }
    if (!cellChanged) {
      return;
    }
    let fileName = getUrenVakLeraarFileName();
    cellChanged = false;
    updateColumnData(getYearKeys(theData.year).keyPrev);
    updateColumnData(getYearKeys(theData.year).keyNext);
    let data = dataToJson();
    cloud.json.upload(fileName, data).then((r) => {
      console.log("Uploaded uren.");
    });
    mapCloudData(data);
    theData.fromCloud = data;
    recalculate();
  }
  function updateColumnData(colKey) {
    let colDef = colDefs.get(colKey);
    for (let tr of document.querySelectorAll("#" + COUNT_TABLE_ID + " tbody tr")) {
      theData.fromCloud.columnMap.get(colKey).set(tr.id, tr.children[colDef.colIndex].textContent);
    }
  }
  function observeTable(observe) {
    const config = {
      attributes: true,
      childList: true,
      subtree: true,
      characterData: true
    };
    let table = document.getElementById(COUNT_TABLE_ID);
    if (observe) {
      editableObserver.takeRecords();
      editableObserver.observe(table, config);
    } else {
      editableObserver.disconnect();
    }
  }
  function mapCloudData(fromCloud) {
    for (let column of fromCloud.columns) {
      column.rowMap = new Map(column.rows.map((row) => [row.key, row.value]));
    }
    fromCloud.columnMap = new Map(fromCloud.columns.map((col) => [col.key, col.rowMap]));
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
    if (colDef.calculated || !onlyRecalc)
      theValue = fillCell(ctx);
    if (colDef.totals) {
      if (!theValue)
        theValue = colDef.getValue(ctx);
      if (theValue)
        colDef.total += theValue;
    }
  }
  function clearTotals() {
    for (let [_colKey, colDef] of colDefs) {
      if (colDef.totals) {
        colDef.total = 0;
      }
    }
  }
  function recalculate() {
    isUpdatePaused = true;
    observeTable(false);
    clearTotals();
    let yearKey = getYearKeys(theData.year).keyNext;
    for (let [vakLeraarKey, vakLeraar] of theData.vakLeraars) {
      let tr = document.getElementById(createValidId(vakLeraarKey));
      for (let [colKey, colDef] of colDefs) {
        let td = tr.children[colDef.colIndex];
        let ctx = { td, colKey, colDef, vakLeraar, tr, colDefs, data: theData, yearKey };
        calculateAndSumCell(colDef, ctx, true);
      }
    }
    let trTotal = document.getElementById("__totals__");
    for (let [_colKey, colDef] of colDefs) {
      let td = trTotal.children[colDef.colIndex];
      if (colDef.totals) {
        td.innerText = trimNumber(colDef.total);
      }
    }
    cellChanged = false;
    isUpdatePaused = false;
    observeTable(true);
  }
  function buildTable(data, tableDef) {
    isUpdatePaused = true;
    theData = data;
    let table = document.createElement("table");
    tableDef.tableRef.getOrgTable().insertAdjacentElement("afterend", table);
    table.id = COUNT_TABLE_ID;
    table.classList.add("canSort");
    updateColDefs(data.year);
    fillTableHeader(table, data.vakLeraars);
    let tbody = document.createElement("tbody");
    table.appendChild(tbody);
    mapCloudData(data.fromCloud);
    let lastVak = "";
    let rowClass = void 0;
    clearTotals();
    let yearKey = getYearKeys(theData.year).keyNext;
    for (let [vakLeraarKey, vakLeraar] of data.vakLeraars) {
      let tr = document.createElement("tr");
      tbody.appendChild(tr);
      tr.dataset["vak_leraar"] = vakLeraarKey;
      tr.id = createValidId(vakLeraarKey);
      if (vakLeraar.vak !== lastVak) {
        rowClass = rowClass === "" ? "darkRow" : "";
      }
      if (rowClass !== "")
        tr.classList.add(rowClass);
      lastVak = vakLeraar.vak;
      for (let [colKey, colDef] of colDefs) {
        let td = document.createElement("td");
        tr.appendChild(td);
        td.classList.add(...colDef.classList);
        let ctx = { td, colKey, colDef, vakLeraar, tr, colDefs, data, yearKey };
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
      if (colDef.totals) {
        td.innerText = trimNumber(colDef.total);
      }
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
    if (isNaN(num))
      return "";
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
    if (graadJaar.count === 0)
      return graadJaar.count;
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

  // typescript/werklijst/scrapeUren.ts
  function scrapeStudent(tableDef, tr, collection) {
    let student = new StudentInfo();
    student.naam = tableDef.pageHandler.getColumnText(tr, "naam");
    student.voornaam = tableDef.pageHandler.getColumnText(tr, "voornaam");
    student.id = parseInt(tr.attributes["onclick"].value.replace("showView('leerlingen-leerling', '', 'id=", ""));
    let leraar = tableDef.pageHandler.getColumnText(tr, "klasleerkracht");
    let vak = tableDef.pageHandler.getColumnText(tr, "vak");
    let graadLeerjaar = tableDef.pageHandler.getColumnText(tr, "graad + leerjaar");
    if (leraar === "") leraar = "{nieuw}";
    if (!isInstrument(vak)) {
      console.error("vak is geen instrument!!!");
      return false;
    }
    let vakLeraarKey = translateVak(vak) + "_" + leraar;
    if (!collection.has(vakLeraarKey)) {
      let countMap = /* @__PURE__ */ new Map();
      countMap.set("2.1", { count: 0, students: [] });
      countMap.set("2.2", { count: 0, students: [] });
      countMap.set("2.3", { count: 0, students: [] });
      countMap.set("2.4", { count: 0, students: [] });
      countMap.set("3.1", { count: 0, students: [] });
      countMap.set("3.2", { count: 0, students: [] });
      countMap.set("3.3", { count: 0, students: [] });
      countMap.set("4.1", { count: 0, students: [] });
      countMap.set("4.2", { count: 0, students: [] });
      countMap.set("4.3", { count: 0, students: [] });
      countMap.set("S.1", { count: 0, students: [] });
      countMap.set("S.2", { count: 0, students: [] });
      let vakLeraarObject = {
        vak: translateVak(vak),
        leraar,
        id: createValidId(vakLeraarKey),
        countMap
      };
      collection.set(vakLeraarKey, vakLeraarObject);
    }
    let vakLeraar = collection.get(vakLeraarKey);
    if (!vakLeraar.countMap.has(graadLeerjaar)) {
      vakLeraar.countMap.set(graadLeerjaar, { count: 0, students: [] });
    }
    let graadLeraarObject = collection.get(vakLeraarKey).countMap.get(graadLeerjaar);
    graadLeraarObject.count += 1;
    graadLeraarObject.students.push(student);
    return true;
  }
  function isInstrument(vak) {
    switch (vak) {
      case "Muziekatelier":
      case "Groepsmusiceren (jazz pop rock)":
      case "Groepsmusiceren (klassiek)":
      case "Harmonielab":
      case "Instrumentinitiatie - elke trimester een ander instrument":
      case "instrumentinitiatie \u2013 piano het hele jaar":
      case "Klanklab elektronische muziek":
      case "Muziektheorie":
      case "Koor (jazz pop rock)":
      case "Koor (musical)":
      case "Arrangeren":
      case "Groepsmusiceren (opera)":
        return false;
    }
    return true;
  }
  function translateVak(vak) {
    function renameInstrument(instrument) {
      return instrument.replace("Basklarinet", "Klarinet").replace("Altfluit", "Dwarsfluit").replace("Piccolo", "Dwarsfluit").replace("Trompet", "Koper").replace("Koper (jazz pop rock)", "Trompet (jazz pop rock)").replace("Hoorn", "Koper").replace("Trombone", "Koper").replace("Bugel", "Koper").replace("Eufonium", "Koper").replace("Altsaxofoon", "Saxofoon").replace("Sopraansaxofoon", "Saxofoon").replace("Tenorsaxofoon", "Saxofoon");
    }
    if (vak.includes("(jazz pop rock)")) {
      return "JPR " + renameInstrument(vak).replace("(jazz pop rock)", "");
    }
    if (vak.includes("musical")) {
      return "M " + renameInstrument(vak).replace("(musical)", "");
    }
    if (vak.includes("wereldmuziek")) {
      return "WM " + renameInstrument(vak).replace("(wereldmuziek)", "");
    }
    return "K " + renameInstrument(vak);
  }

  // typescript/table/tableNavigation.ts
  var TableNavigation = class {
    constructor(step, maxCount, div) {
      this.step = step;
      this.maxCount = maxCount;
      this.div = div;
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
    if (!buttonPagination)
      return void 0;
    let buttonContainer = buttonPagination.closest("div");
    if (!buttonContainer) {
      return void 0;
    }
    let rx = /(\d*) tot (\d*) van (\d*)/;
    let matches = buttonPagination.innerText.match(rx);
    let buttons = buttonContainer.querySelectorAll("button.btn-secondary");
    let offsets = Array.from(buttons).filter((btn) => btn.attributes["onclick"]?.value.includes("goto(")).filter((btn) => !btn.querySelector("i.fa-fast-backward")).map((btn) => getGotoNumber(btn.attributes["onclick"].value));
    let numbers = matches.slice(1).map((txt) => parseInt(txt));
    numbers[0] = numbers[0] - 1;
    numbers = numbers.concat(offsets);
    numbers.sort((a, b) => a - b);
    numbers = [...new Set(numbers)];
    return new TableNavigation(numbers[1] - numbers[0], numbers.pop(), buttonContainer);
  }
  function getGotoNumber(functionCall) {
    return parseInt(functionCall.substring(functionCall.indexOf("goto(") + 5));
  }

  // typescript/progressBar.ts
  var ProgressBar = class {
    constructor(containerElement, barElement, maxCount) {
      this.barElement = barElement;
      this.containerElement = containerElement;
      this.maxCount = maxCount;
      this.count = 0;
      for (let i = 0; i < maxCount; i++) {
        let block = document.createElement("div");
        barElement.appendChild(block);
        block.classList.add("progressBlock");
      }
    }
    start() {
      this.containerElement.style.visibility = "visible";
      this.next();
    }
    stop() {
      this.containerElement.style.visibility = "hidden";
    }
    next() {
      if (this.count >= this.maxCount)
        return false;
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
  function insertProgressBar(container, steps, text = "") {
    let divProgressLine = document.getElementById(PROGRESS_BAR_ID);
    if (divProgressLine) {
      divProgressLine.innerText = "";
    } else {
      divProgressLine = document.createElement("div");
      container.append(divProgressLine);
      divProgressLine.classList.add("infoLine");
      divProgressLine.id = PROGRESS_BAR_ID;
    }
    let divProgressText = document.createElement("div");
    divProgressLine.appendChild(divProgressText);
    divProgressText.classList.add("progressText");
    divProgressText.innerText = text;
    let divProgressBar = document.createElement("div");
    divProgressLine.appendChild(divProgressBar);
    divProgressBar.classList.add("progressBar");
    return new ProgressBar(divProgressLine, divProgressBar, steps);
  }

  // typescript/table/tableDef.ts
  var TableRef = class {
    constructor(htmlTableId, navigationData, buildFetchUrl) {
      this.htmlTableId = htmlTableId;
      this.buildFetchUrl = buildFetchUrl;
      this.navigationData = navigationData;
    }
    getOrgTable() {
      return document.getElementById(this.htmlTableId);
    }
    createElementAboveTable(element) {
      let el = document.createElement(element);
      this.getOrgTable().insertAdjacentElement("beforebegin", el);
      return el;
    }
  };
  function findTableRefInCode() {
    let foundTableRef = findTable();
    if (!foundTableRef)
      return void 0;
    let buildFetchUrl = (offset) => `/views/ui/datatable.php?id=${foundTableRef.viewId}&start=${offset}&aantal=0`;
    let navigation = findFirstNavigation();
    if (!navigation)
      return void 0;
    return new TableRef(foundTableRef.tableId, navigation, buildFetchUrl);
  }
  function findTable() {
    let table = document.querySelector("div.table-responsive > table");
    let tableId2 = table.id.replace("table_", "").replace("_table", "");
    let parentDiv = document.querySelector("div#table_" + tableId2);
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
  var TableDef = class {
    constructor(tableRef, pageHandler, calculateTableCheckSum) {
      this.parallelData = void 0;
      this.isUsingCached = false;
      this.tempMessage = "";
      this.tableRef = tableRef;
      this.pageHandler = pageHandler;
      if (!calculateTableCheckSum)
        throw "Tablechecksum required.";
      this.calculateTableCheckSum = calculateTableCheckSum;
    }
    clearCache() {
      db3(`Clear cache for ${this.tableRef.htmlTableId}.`);
      window.sessionStorage.removeItem(this.getCacheId());
      window.sessionStorage.removeItem(this.getCacheId() + CACHE_DATE_SUFFIX);
    }
    loadFromCache() {
      if (this.tableRef.navigationData.isOnePage())
        return null;
      db3(`Loading from cache: ${this.getCacheId()}.`);
      let text = window.sessionStorage.getItem(this.getCacheId());
      let dateString = window.sessionStorage.getItem(this.getCacheId() + CACHE_DATE_SUFFIX);
      if (!text)
        return void 0;
      return {
        text,
        date: new Date(dateString)
      };
    }
    getCacheId() {
      let checksum = "";
      if (this.calculateTableCheckSum)
        checksum = "__" + this.calculateTableCheckSum(this);
      let id = this.tableRef.htmlTableId + checksum;
      return id.replaceAll(/\s/g, "");
    }
    setupInfoBar() {
      if (!this.divInfoContainer) {
        this.divInfoContainer = this.tableRef.createElementAboveTable("div");
      }
      this.divInfoContainer.classList.add("infoLine");
    }
    clearInfoBar() {
      this.divInfoContainer.innerHTML = "";
    }
    updateInfoBar() {
      this.updateCacheInfo();
      this.#updateTempMessage();
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
      let p = document.getElementById(TEMP_MSG_ID);
      if (this.tempMessage === "") {
        if (p) p.remove();
        return;
      }
      if (!p) {
        p = document.createElement("p");
        this.divInfoContainer.appendChild(p);
        p.classList.add("tempMessage");
        p.id = TEMP_MSG_ID;
      }
      p.innerHTML = this.tempMessage;
    }
    clearCacheInfo() {
      document.getElementById(CACHE_INFO_ID)?.remove();
    }
    updateCacheInfo() {
      let p = document.getElementById(CACHE_INFO_ID);
      if (!this.isUsingCached) {
        if (p) p.remove();
        return;
      }
      if (!p) {
        p = document.createElement("p");
        this.divInfoContainer.appendChild(p);
        p.classList.add("cacheInfo");
        p.id = CACHE_INFO_ID;
      }
      p.innerHTML = `Gegevens uit cache, ${millisToString((/* @__PURE__ */ new Date()).getTime() - this.shadowTableDate.getTime())} oud. `;
      let a = document.createElement("a");
      p.appendChild(a);
      a.innerHTML = "refresh";
      a.href = "#";
      a.onclick = (e) => {
        e.preventDefault();
        this.clearCache();
        this.getTableData();
        return true;
      };
    }
    async getTableData(parallelAsyncFunction) {
      this.setupInfoBar();
      this.clearCacheInfo();
      let cachedData = this.loadFromCache();
      let fetchedTable = new FetchedTable(this);
      if (cachedData) {
        if (parallelAsyncFunction) {
          this.parallelData = await parallelAsyncFunction();
        }
        fetchedTable.addPage(cachedData.text);
        this.shadowTableDate = cachedData.date;
        this.isUsingCached = true;
        db3(`${this.tableRef.htmlTableId}: using cached data.`);
        let rows = fetchedTable.getRows();
        this.pageHandler.onPage?.(this, cachedData.text, fetchedTable);
        this.pageHandler.onLoaded?.(fetchedTable);
      } else {
        this.isUsingCached = false;
        let success = await this.#fetchPages(fetchedTable, parallelAsyncFunction);
        if (!success)
          return fetchedTable;
        fetchedTable.saveToCache();
        this.pageHandler.onLoaded?.(fetchedTable);
      }
      this.updateInfoBar();
      return fetchedTable;
    }
    async #fetchPages(fetchedTable, parallelAsyncFunction) {
      if (this.pageHandler.onBeforeLoading) {
        if (!this.pageHandler.onBeforeLoading(this))
          return false;
      }
      let progressBar = insertProgressBar(this.divInfoContainer, this.tableRef.navigationData.steps(), "loading pages... ");
      progressBar.start();
      if (parallelAsyncFunction) {
        let doubleResults = await Promise.all([
          this.#doFetchAllPages(fetchedTable, progressBar),
          parallelAsyncFunction()
        ]);
        this.parallelData = doubleResults[1];
      } else {
        await this.#doFetchAllPages(fetchedTable, progressBar);
      }
      return true;
    }
    async #doFetchAllPages(fetchedTable, progressBar) {
      try {
        while (true) {
          console.log("fetching page " + fetchedTable.getNextPageNumber());
          let response = await fetch(this.tableRef.buildFetchUrl(fetchedTable.getNextOffset()));
          let text = await response.text();
          fetchedTable.addPage(text);
          this.pageHandler.onPage?.(this, text, fetchedTable);
          if (!progressBar.next())
            break;
        }
      } finally {
        progressBar.stop();
      }
    }
  };
  var FetchedTable = class {
    constructor(tableDef) {
      this.getRowsAsArray = () => Array.from(this.getRows());
      this.getLastPageRows = () => this.getRowsAsArray().slice(this.lastPageStartRow);
      this.getLastPageNumber = () => this.lastPageNumber;
      this.getNextPageNumber = () => this.lastPageNumber + 1;
      this.getNextOffset = () => this.getNextPageNumber() * this.tableDef.tableRef.navigationData.step;
      this.getTemplate = () => this.shadowTableTemplate;
      this.tableDef = tableDef;
      this.lastPageNumber = -1;
      this.lastPageStartRow = 0;
      this.shadowTableTemplate = document.createElement("template");
    }
    getRows() {
      let template = this.shadowTableTemplate;
      return template.content.querySelectorAll("tbody tr:not(:has(i.fa-meh))");
    }
    saveToCache() {
      db3(`Caching ${this.tableDef.getCacheId()}.`);
      window.sessionStorage.setItem(this.tableDef.getCacheId(), this.shadowTableTemplate.innerHTML);
      window.sessionStorage.setItem(this.tableDef.getCacheId() + CACHE_DATE_SUFFIX, (/* @__PURE__ */ new Date()).toJSON());
    }
    addPage(text) {
      let pageTemplate;
      pageTemplate = document.createElement("template");
      pageTemplate.innerHTML = text;
      let rows = pageTemplate.content.querySelectorAll("tbody > tr");
      this.lastPageStartRow = this.getRows().length;
      if (this.lastPageNumber === -1)
        this.shadowTableTemplate.innerHTML = text;
      else
        this.shadowTableTemplate.content.querySelector("tbody").append(...rows);
      this.lastPageNumber++;
    }
  };

  // typescript/werklijst/criteria.ts
  async function fetchVakken(clear, schooljaar) {
    if (clear) {
      await sendClearWerklijst();
    }
    await sendAddCriterium(schooljaar, "Vak");
    let text = await fetchCritera(schooljaar);
    const template = document.createElement("template");
    template.innerHTML = text;
    let vakken = template.content.querySelectorAll("#form_field_leerling_werklijst_criterium_vak option");
    return Array.from(vakken).map((vak) => [vak.label, vak.value]);
  }
  async function fetchCritera(schoolYear) {
    return (await fetch("https://administratie.dko3.cloud/views/leerlingen/werklijst/index.criteria.php?schooljaar=" + schoolYear, {
      method: "GET"
    })).text();
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
    await fetch("views/leerlingen/werklijst/index.velden.php", {
      method: "GET"
    });
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

  // typescript/pageState.ts
  function savePageState(state) {
    sessionStorage.setItem(STORAGE_PAGE_STATE_KEY, JSON.stringify(state));
  }
  function defaultPageState(pageName) {
    if (pageName === "Werklijst" /* Werklijst */) {
      let werklijstPageState = {
        goto: "" /* None */,
        pageName: "Werklijst" /* Werklijst */,
        werklijstTableName: ""
      };
      return werklijstPageState;
    }
    return void 0;
  }
  function getPageStateOrDefault(pageName) {
    let pageState = JSON.parse(sessionStorage.getItem(STORAGE_PAGE_STATE_KEY));
    if (pageState?.pageName === pageName)
      return pageState;
    else
      return defaultPageState(pageName);
  }

  // typescript/werklijst/prefillInstruments.ts
  var instrumentSet = /* @__PURE__ */ new Set([
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
  async function prefillInstruments(schooljaar) {
    await sendClearWerklijst();
    let vakken = await fetchVakken(false, schooljaar);
    let instruments = vakken.filter((vak) => isInstrument2(vak[0]));
    let values = instruments.map((vak) => parseInt(vak[1]));
    let valueString = values.join();
    let criteria = [
      { "criteria": "Schooljaar", "operator": "=", "values": schooljaar },
      { "criteria": "Status", "operator": "=", "values": "12" },
      { "criteria": "Uitschrijvingen", "operator": "=", "values": "0" },
      { "criteria": "Domein", "operator": "=", "values": "3" },
      {
        "criteria": "Vak",
        "operator": "=",
        "values": valueString
      }
    ];
    await sendCriteria(criteria);
    await sendFields(
      [
        { value: "vak_naam", text: "vak" },
        { value: "graad_leerjaar", text: "graad + leerjaar" },
        { value: "klasleerkracht", text: "klasleerkracht" }
      ]
    );
    await sendGrouping("vak_id");
    let pageState = getPageStateOrDefault("Werklijst" /* Werklijst */);
    pageState.werklijstTableName = UREN_TABLE_STATE_NAME;
    savePageState(pageState);
    document.querySelector("#btn_werklijst_maken").click();
  }
  function isInstrument2(text) {
    return instrumentSet.has(text);
  }

  // typescript/pageHandlers.ts
  var SimpleTableHandler = class {
    constructor(onLoaded, onBeforeLoading) {
      this.onBeforeLoading = onBeforeLoading;
      this.onLoaded = onLoaded;
      this.onPage = void 0;
    }
  };
  var NamedCellTablePageHandler = class _NamedCellTablePageHandler {
    constructor(requiredHeaderLabels, onLoaded, onRequiredColumnsMissing) {
      this.onLoadedAndCheck = (fetchedTable) => {
        if (this.isValidPage)
          this.onLoadedExternal(fetchedTable);
        else
          console.log("NamedCellPageHandler: Not calling OnLoaded handler because page is not valid.");
      };
      this.onPage = (_tableDef, _text, fetchedTable) => {
        if (fetchedTable.getLastPageNumber() === 0) {
          if (!this.setTemplateAndCheck(fetchedTable.getTemplate())) {
            this.isValidPage = false;
            if (this.onColumnsMissing) {
              this.onColumnsMissing(_tableDef);
            } else {
              throw "Cannot build table object - required columns missing";
            }
          } else {
            this.isValidPage = true;
          }
        }
      };
      this.requiredHeaderLabels = requiredHeaderLabels;
      this.onLoaded = this.onLoadedAndCheck;
      this.onLoadedExternal = onLoaded;
      this.onColumnsMissing = onRequiredColumnsMissing;
      this.headerIndices = void 0;
      this.isValidPage = false;
      this.onBeforeLoading = this.onBeforeLoadingHandler;
    }
    onBeforeLoadingHandler() {
      this.headerIndices = _NamedCellTablePageHandler.getHeaderIndicesFromDocument(document.body);
      return this.hasAllHeadersAndAlert();
    }
    hasAllHeadersAndAlert() {
      if (!this.hasAllHeaders()) {
        let labelString = this.requiredHeaderLabels.map((label) => '"' + label.toUpperCase() + '"').join(", ");
        alert(`Voeg velden ${labelString} toe.`);
        return false;
      }
      return true;
    }
    setTemplateAndCheck(template) {
      this.headerIndices = _NamedCellTablePageHandler.getHeaderIndicesFromTemplate(template);
      return this.hasAllHeadersAndAlert();
    }
    static getHeaderIndicesFromTemplate(template) {
      let headers = template.content.querySelectorAll("thead th");
      return this.getHeaderIndicesFromHeaderCells(headers);
    }
    static getHeaderIndicesFromDocument(element) {
      let headers = element.querySelectorAll("thead th");
      return this.getHeaderIndicesFromHeaderCells(headers);
    }
    static getHeaderIndicesFromHeaderCells(headers) {
      let headerIndices = /* @__PURE__ */ new Map();
      Array.from(headers).forEach((header, index) => {
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
      return this.requiredHeaderLabels.every((label) => this.hasHeader(label));
    }
    hasHeader(label) {
      return this.headerIndices.has(label);
    }
    getColumnText(tr, label) {
      return tr.children[this.headerIndices.get(label)].textContent;
    }
  };

  // typescript/table/tableHeaders.ts
  function sortRows(cmpFunction, header, rows, index, wasAscending) {
    let cmpDirectionalFunction;
    if (wasAscending) {
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
    if (isNaN(res)) {
      throw new Error();
    }
    return res;
  }
  function sortTableByColumn(table, index) {
    let header = table.tHead.children[0].children[index];
    let rows = Array.from(table.tBodies[0].rows);
    let wasAscending = header.classList.contains("sortAscending");
    for (let thead of table.tHead.children[0].children) {
      thead.classList.remove("sortAscending", "sortDescending");
    }
    let cmpFunc = cmpAlpha;
    if (isColumnProbablyNumeric(table, index)) {
      cmpFunc = cmpNumber;
    } else if (isColumnProbablyDate(table, index)) {
      cmpFunc = cmpDate;
    }
    try {
      sortRows(cmpFunc, header, rows, index, wasAscending);
    } catch (e) {
      console.error(e);
      if (cmpFunc !== cmpAlpha)
        sortRows(cmpAlpha, header, rows, index, wasAscending);
    }
    rows.forEach((row) => table.tBodies[0].appendChild(row));
  }
  function isColumnProbablyDate(table, index) {
    let rows = Array.from(table.tBodies[0].rows);
    return stringToDate(rows[0].cells[index].textContent);
  }
  function stringToDate(text) {
    let reDate = /^(\d\d)[-\/](\d\d)[-\/](\d\d\d\d)/;
    let matches = text.match(reDate);
    if (!matches)
      return void 0;
    return /* @__PURE__ */ new Date(matches[3] + "-" + matches[2] + "/" + matches[1]);
  }
  function isColumnProbablyNumeric(table, index) {
    let rows = Array.from(table.tBodies[0].rows);
    const MAX_SAMPLES = 100;
    let samples = rangeGenerator(0, rows.length, rows.length > MAX_SAMPLES ? rows.length / MAX_SAMPLES : 1).map((float) => Math.floor(float));
    return !samples.map((rowIndex) => rows[rowIndex]).some((row) => {
      return isNaN(Number(row.children[index].innerText));
    });
  }
  function addTableHeaderClickEvents(table) {
    if (table.tHead.classList.contains("clickHandler"))
      return;
    table.tHead.classList.add("clickHandler");
    Array.from(table.tHead.children[0].children).forEach((header, index) => {
      header.onclick = (_ev) => {
        sortTableByColumn(table, index);
      };
    });
  }

  // typescript/table/observer.ts
  var observer_default5 = new BaseObserver(void 0, new AllPageFilter(), onMutation4);
  function onMutation4(_mutation) {
    let navigationBars = getBothToolbars();
    if (!navigationBars)
      return;
    if (!findTableRefInCode()?.navigationData.isOnePage()) {
      addTableNavigationButton(navigationBars, DOWNLOAD_TABLE_BTN_ID, "download full table", downloadTable, "fa-arrow-down");
    }
    if (document.querySelector("main div.table-responsive table thead")) {
      addTableHeaderClickEvents(document.querySelector("main div.table-responsive table"));
    }
    let customTable = document.querySelector("table.canSort");
    if (customTable) {
      addTableHeaderClickEvents(customTable);
    }
    return true;
  }
  var tableCriteriaBuilders = /* @__PURE__ */ new Map();
  function downloadTable() {
    let prebuildPageHandler = new SimpleTableHandler(onLoaded, void 0);
    function onLoaded(fetchedTable) {
      tableDef.tableRef.getOrgTable().querySelector("tbody").replaceChildren(...fetchedTable.getRows());
    }
    let tableRef = findTableRefInCode();
    let tableDef = new TableDef(
      tableRef,
      prebuildPageHandler,
      getChecksumHandler(tableRef.htmlTableId)
    );
    tableDef.getTableData().then(() => {
    });
  }
  function getChecksumHandler(tableId2) {
    let handler = tableCriteriaBuilders.get(tableId2);
    if (handler)
      return handler;
    return (tableDef) => "";
  }
  function registerChecksumHandler(tableId2, checksumHandler) {
    tableCriteriaBuilders.set(tableId2, checksumHandler);
  }

  // typescript/werklijst/observer.ts
  var tableId = "table_leerlingen_werklijst_table";
  registerChecksumHandler(
    tableId,
    (_tableDef) => {
      return document.querySelector("#view_contents > div.alert.alert-primary")?.textContent.replace("Criteria aanpassen", "")?.replace("Criteria:", "") ?? "";
    }
  );
  var observer_default6 = new HashObserver("#leerlingen-werklijst", onMutation5);
  function onMutation5(mutation) {
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
    let pageState = getPageStateOrDefault("Werklijst" /* Werklijst */);
    if (pageState.goto == "Werklijst_uren_prevYear" /* Werklijst_uren_prevYear */) {
      pageState.goto = "" /* None */;
      savePageState(pageState);
      prefillInstruments(createSchoolyearString(calculateSchooljaar())).then(() => {
      });
      return;
    }
    if (pageState.goto == "Werklijst_uren_nextYear" /* Werklijst_uren_nextYear */) {
      pageState.goto = "" /* None */;
      savePageState(pageState);
      prefillInstruments(createSchoolyearString(calculateSchooljaar() + 1)).then(() => {
      });
      return;
    }
    pageState.werklijstTableName = "";
    savePageState(pageState);
    let btnWerklijstMaken = document.querySelector("#btn_werklijst_maken");
    if (document.getElementById(UREN_PREV_BTN_ID))
      return;
    let year = parseInt(getHighestSchooljaarAvailable());
    let prevSchoolyear = createSchoolyearString(year - 1);
    let nextSchoolyear = createSchoolyearString(year);
    let prevSchoolyearShort = createShortSchoolyearString(year - 1);
    let nextSchoolyearShort = createShortSchoolyearString(year);
    addButton(btnWerklijstMaken, UREN_PREV_BTN_ID, "Toon lerarenuren voor " + prevSchoolyear, async () => {
      await prefillInstruments(prevSchoolyear);
    }, "", ["btn", "btn-outline-dark"], "Uren " + prevSchoolyearShort);
    addButton(btnWerklijstMaken, UREN_NEXT_BTN_ID, "Toon lerarenuren voor " + nextSchoolyear, async () => {
      await prefillInstruments(nextSchoolyear);
    }, "", ["btn", "btn-outline-dark"], "Uren " + nextSchoolyearShort);
    getSchoolIdString();
  }
  function onWerklijstChanged() {
    let werklijstPageState = getPageStateOrDefault("Werklijst" /* Werklijst */);
    if (werklijstPageState.werklijstTableName === UREN_TABLE_STATE_NAME) {
      tryUntil(onClickShowCounts);
    }
    addTableHeaderClickEvents(document.querySelector("table#table_leerlingen_werklijst_table"));
  }
  function onButtonBarChanged() {
    let targetButton = document.querySelector("#tablenav_leerlingen_werklijst_top > div > div.btn-group.btn-group-sm.datatable-buttons > button:nth-child(1)");
    addButton(targetButton, COUNT_BUTTON_ID, "Toon telling", onClickShowCounts, "fa-guitar", ["btn-outline-info"]);
    addButton(targetButton, MAIL_BTN_ID, "Email to clipboard", onClickCopyEmails, "fa-envelope", ["btn", "btn-outline-info"]);
  }
  function onClickCopyEmails() {
    let requiredHeaderLabels = ["e-mailadressen"];
    let pageHandler = new NamedCellTablePageHandler(requiredHeaderLabels, onEmailsLoaded, (tableDef1) => {
      navigator.clipboard.writeText("").then((value) => {
        console.log("Clipboard cleared.");
      });
    });
    let tableDef = new TableDef(
      findTableRefInCode(),
      pageHandler,
      getChecksumHandler(tableId)
    );
    function onEmailsLoaded(fetchedTable) {
      let allEmails = this.rows = fetchedTable.getRowsAsArray().map((tr) => tableDef.pageHandler.getColumnText(tr, "e-mailadressen"));
      let flattened = allEmails.map((emails) => emails.split(/[,;]/)).flat().filter((email) => !email.includes("@academiestudent.be")).filter((email) => email !== "");
      navigator.clipboard.writeText(flattened.join(";\n")).then(
        () => tableDef.setTempMessage("Alle emails zijn naar het clipboard gekopieerd. Je kan ze plakken in Outlook.")
      );
    }
    tableDef.getTableData(void 0).then((_results) => {
    });
  }
  function tryUntil(func) {
    if (!func())
      setTimeout(() => tryUntil(func), 100);
  }
  function onClickShowCounts() {
    if (!document.getElementById(COUNT_TABLE_ID)) {
      let onLoaded = function(fetchedTable) {
        let vakLeraars = /* @__PURE__ */ new Map();
        let rows = this.rows = fetchedTable.getRows();
        for (let tr of rows) {
          scrapeStudent(tableDef, tr, vakLeraars);
        }
        let fromCloud = tableDef.parallelData;
        fromCloud = upgradeCloudData(fromCloud);
        vakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        document.getElementById(COUNT_TABLE_ID)?.remove();
        let schoolYear = findSchooljaar();
        let year = parseInt(schoolYear);
        buildTable({ year, vakLeraars, fromCloud }, tableDef);
        document.getElementById(COUNT_TABLE_ID).style.display = "none";
        showOrHideNewTable();
      };
      let tableRef = findTableRefInCode();
      if (!tableRef)
        return false;
      let fileName = getUrenVakLeraarFileName();
      let requiredHeaderLabels = ["naam", "voornaam", "vak", "klasleerkracht", "graad + leerjaar"];
      let pageHandler = new NamedCellTablePageHandler(requiredHeaderLabels, onLoaded, () => {
      });
      let tableDef = new TableDef(
        tableRef,
        pageHandler,
        getChecksumHandler(tableRef.htmlTableId)
      );
      tableDef.getTableData(() => getUrenFromCloud(fileName)).then((_results) => {
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
      return createJsonCloudData();
    }
  }
  function showOrHideNewTable() {
    let showNewTable = document.getElementById(COUNT_TABLE_ID).style.display === "none";
    document.getElementById("table_leerlingen_werklijst_table").style.display = showNewTable ? "none" : "table";
    document.getElementById(COUNT_TABLE_ID).style.display = showNewTable ? "table" : "none";
    document.getElementById(COUNT_BUTTON_ID).title = showNewTable ? "Toon normaal" : "Toon telling";
    setButtonHighlighted(COUNT_BUTTON_ID, showNewTable);
    let pageState = getPageStateOrDefault("Werklijst" /* Werklijst */);
    pageState.werklijstTableName = showNewTable ? UREN_TABLE_STATE_NAME : "";
    savePageState(pageState);
  }
  function upgradeCloudData(fromCloud) {
    return fromCloud;
  }

  // typescript/vakgroep/observer.ts
  var observer_default7 = new HashObserver("#extra-inschrijvingen-vakgroepen-vakgroep", onMutation6);
  function onMutation6(mutation) {
    let divVakken = document.getElementById("div_table_vakgroepen_vakken");
    if (mutation.target !== divVakken) {
      return false;
    }
    onVakgroepChanged(divVakken);
    return true;
  }
  var TXT_FILTER_ID2 = "txtFilter";
  var savedSearch2 = "";
  function onVakgroepChanged(divVakken) {
    let table = divVakken.querySelector("table");
    if (!document.getElementById(TXT_FILTER_ID2))
      table.parentElement.insertBefore(createScearchField(TXT_FILTER_ID2, onSearchInput2, savedSearch2), table);
    onSearchInput2();
  }
  function onSearchInput2() {
    savedSearch2 = document.getElementById(TXT_FILTER_ID2).value;
    function getRowText(tr) {
      let instrumentName = tr.cells[0].querySelector("label").textContent.trim();
      let strong = tr.cells[0].querySelector("strong")?.textContent.trim();
      return instrumentName + " " + strong;
    }
    let rowFilter = createTextRowFilter(savedSearch2, getRowText);
    filterTable(document.querySelector("#div_table_vakgroepen_vakken table"), rowFilter);
  }

  // typescript/verwittigen/observer.ts
  var observer_default8 = new HashObserver("#leerlingen-verwittigen", onMutation7);
  var CHAR_COUNTER = "charCounterClass";
  var COUNTER_ID = "charCounter";
  function onMutation7(mutation) {
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
  function onSmsChanged(event) {
    let txtSms = document.getElementById("leerlingen_verwittigen_bericht_sjabloon");
    let spanCounter = document.getElementById(COUNTER_ID);
    spanCounter.textContent = txtSms.value.length.toString();
  }

  // typescript/table/loadAnyTable.ts
  async function getTableFromHash(hash, divInfoContainer, clearCache) {
    let page = await fetch("https://administratie.dko3.cloud/#" + hash).then((res) => res.text());
    let view = await fetch("view.php?args=" + hash).then((res) => res.text());
    let index_viewUrl = getDocReadyLoadUrl(view);
    let index_view = await fetch(index_viewUrl).then((res) => res.text());
    let scanner = new TokenScanner(index_view);
    let htmlTableId = getDocReadyLoadScript(index_view).find("$", "(", "'#").clipTo("'").result();
    if (!htmlTableId) {
      htmlTableId = getDocReadyLoadScript(index_view).find("$", "(", '"#').clipTo('"').result();
    }
    let someUrl = getDocReadyLoadUrl(index_view);
    if (!someUrl.includes("ui/datatable.php")) {
      let someCode = await fetch(someUrl).then((res) => res.text());
      someUrl = getDocReadyLoadUrl(someCode);
    }
    let datatableUrl = someUrl;
    let datatable = await fetch(datatableUrl).then((result) => result.text());
    scanner = new TokenScanner(datatable);
    let datatable_id = "";
    let tableNavUrl = "";
    scanner.find("var", "datatable_id", "=").getString((res) => {
      datatable_id = res;
    }).clipTo("<\/script>").find(".", "load", "(").getString((res) => tableNavUrl = res).result();
    tableNavUrl += datatable_id + "&pos=top";
    let tableNavText = await fetch(tableNavUrl).then((res) => res.text().then());
    let div = document.createElement("div");
    div.innerHTML = tableNavText;
    let tableNav = findFirstNavigation(div);
    console.log(tableNav);
    let buildFetchUrl = (offset) => `/views/ui/datatable.php?id=${datatable_id}&start=${offset}&aantal=0`;
    let tableRef = new TableRef(htmlTableId, tableNav, buildFetchUrl);
    console.log(tableRef);
    let prebuildPageHandler = new SimpleTableHandler(void 0, void 0);
    let tableDef = new TableDef(
      tableRef,
      prebuildPageHandler,
      getChecksumHandler(tableRef.htmlTableId)
    );
    tableDef.divInfoContainer = divInfoContainer;
    if (clearCache)
      tableDef.clearCache();
    let fetchedTable = await tableDef.getTableData();
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
      if (!docReady.valid)
        return void 0;
      let url = docReady.clone().clipTo("<\/script>").find(".", "load", "(").clipString().result();
      if (url)
        return url;
      scanner = docReady;
    }
  }
  function getDocReadyLoadScript(text) {
    let scanner = new TokenScanner(text);
    while (true) {
      let docReady = findDocReady(scanner);
      if (!docReady.valid)
        return void 0;
      let script = docReady.clone().clipTo("<\/script>");
      let load = script.clone().find(".", "load", "(");
      if (load.valid)
        return script;
      scanner = docReady;
    }
  }
  function escapeRegexChars(text) {
    return text.replaceAll("\\", "\\\\").replaceAll("^", "\\^").replaceAll("$", "\\$").replaceAll(".", "\\.").replaceAll("|", "\\|").replaceAll("?", "\\?").replaceAll("*", "\\*").replaceAll("+", "\\+").replaceAll("(", "\\(").replaceAll(")", "\\)").replaceAll("[", "\\[").replaceAll("]", "\\]").replaceAll("{", "\\{").replaceAll("}", "\\}");
  }
  var ScannerElse = class {
    constructor(scannerIf) {
      this.scannerIf = scannerIf;
    }
    not(callback) {
      if (!this.scannerIf.yes) {
        callback?.(this.scannerIf.scanner);
      }
      return this.scannerIf.scanner;
    }
  };
  var ScannerIf = class {
    constructor(yes, scanner) {
      this.yes = yes;
      this.scanner = scanner;
    }
    then(callback) {
      if (this.yes) {
        callback(this.scanner);
      }
      return new ScannerElse(this);
    }
  };
  var TokenScanner = class _TokenScanner {
    constructor(text) {
      this.valid = true;
      this.source = text;
      this.cursor = text;
    }
    result() {
      if (this.valid)
        return this.cursor;
      return void 0;
    }
    find(...tokens) {
      return this.#find("", tokens);
    }
    match(...tokens) {
      return this.#find("^\\s*", tokens);
    }
    #find(prefix, tokens) {
      if (!this.valid)
        return this;
      let rxString = prefix + tokens.map((token) => escapeRegexChars(token) + "\\s*").join("");
      let match2 = RegExp(rxString).exec(this.cursor);
      if (match2) {
        this.cursor = this.cursor.substring(match2.index + match2[0].length);
        return this;
      }
      this.valid = false;
      return this;
    }
    ifMatch(...tokens) {
      if (!this.valid)
        return new ScannerIf(true, this);
      this.match(...tokens);
      if (this.valid) {
        return new ScannerIf(true, this);
      } else {
        this.valid = true;
        return new ScannerIf(false, this);
      }
    }
    clip(len) {
      if (!this.valid)
        return this;
      this.cursor = this.cursor.substring(0, len);
      return this;
    }
    clipTo(end) {
      if (!this.valid)
        return this;
      let found = this.cursor.indexOf(end);
      if (found < 0) {
        this.valid = false;
        return this;
      }
      this.cursor = this.cursor.substring(0, found);
      return this;
    }
    clone() {
      let newScanner = new _TokenScanner(this.cursor);
      newScanner.valid = this.valid;
      return newScanner;
    }
    clipString() {
      let isString = false;
      this.ifMatch("'").then((result) => {
        isString = true;
        return result.clipTo("'");
      }).not().ifMatch('"').then((result) => {
        isString = true;
        return result.clipTo('"');
      }).not();
      this.valid = this.valid && isString;
      return this;
    }
    getString(callback) {
      let subScanner = this.clone();
      let result = subScanner.clipString().result();
      if (result) {
        callback(result);
        this.ifMatch("'").then((result2) => result2.find("'")).not().ifMatch('"').then((result2) => result2.find('"')).not();
      }
      return this;
    }
  };

  // typescript/aanwezigheden/observer.ts
  var observer_default9 = new HashObserver("#leerlingen-lijsten-awi-percentages_leerling_vak", onMutationAanwezgheden);
  function onMutationAanwezgheden(mutation) {
    let tableId2 = document.getElementById("table_lijst_awi_percentages_leerling_vak_table");
    if (!tableId2) {
      return false;
    }
    let navigationBars = getBothToolbars();
    if (!navigationBars)
      return;
    addTableNavigationButton(navigationBars, COPY_TABLE_BTN_ID, "copy table to clipboard", copyTable, "fa-clipboard");
    return true;
  }
  function showInfoMessage(message, click_element_id, callback) {
    let div = document.querySelector("#" + INFO_MSG_ID);
    if (!div)
      return;
    div.innerHTML = message;
    if (click_element_id) {
      document.getElementById(click_element_id).onclick = callback;
    }
  }
  async function copyTable() {
    let prebuildPageHandler = new SimpleTableHandler(void 0, void 0);
    let tableRef = findTableRefInCode();
    let tableDef = new TableDef(
      tableRef,
      prebuildPageHandler,
      getChecksumHandler(tableRef.htmlTableId)
    );
    let div = tableRef.createElementAboveTable("div");
    let msgDiv = div.appendChild(document.createElement("div"));
    msgDiv.classList.add("infoMessage");
    msgDiv.id = INFO_MSG_ID;
    tableDef.divInfoContainer = div.appendChild(document.createElement("div"));
    showInfoMessage("Fetching 3-weken data...");
    let wekenLijst = await getTableFromHash("leerlingen-lijsten-awi-3weken", tableDef.divInfoContainer, true).then((bckTableDef) => {
      ``;
      let rowsArray = bckTableDef.getRowsAsArray();
      return rowsArray.map((row) => {
        let namen = row.cells[0].textContent.split(", ");
        return { naam: namen[0], voornaam: namen[1], weken: parseInt(row.cells[2].textContent) };
      });
    });
    console.log(wekenLijst);
    showInfoMessage("Fetching attesten...");
    let attestenLijst = await getTableFromHash("leerlingen-lijsten-awi-ontbrekende_attesten", tableDef.divInfoContainer, true).then((bckTableDef) => {
      return bckTableDef.getRowsAsArray().map(
        (tr) => {
          return {
            datum: tr.cells[0].textContent,
            leerling: tr.cells[1].textContent,
            vak: tr.cells[2].textContent,
            leraar: tr.cells[3].textContent,
            reden: tr.cells[4].textContent
          };
        }
      );
    });
    console.log(attestenLijst);
    showInfoMessage("Fetching afwezigheidscodes...");
    let pList = await getTableFromHash("leerlingen-lijsten-awi-afwezigheidsregistraties", tableDef.divInfoContainer, true).then((bckTableDef) => {
      let rowsArray = bckTableDef.getRowsAsArray();
      return rowsArray.map((row) => {
        let namen = row.cells[1].querySelector("strong").textContent.split(", ");
        let vakTxt = Array.from(row.cells[1].childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join("");
        let vak = reduceVaknaam(vakTxt.substring(3));
        let leraar = row.cells[1].querySelector("small").textContent.substring(16);
        return { naam: namen[0], voornaam: namen[1], code: row.cells[2].textContent[0], vak, leraar };
      });
    });
    console.log(pList);
    tableDef.clearCache();
    tableDef.getTableData().then((fetchedTable) => {
      let wekenMap = /* @__PURE__ */ new Map();
      for (let week of wekenLijst) {
        wekenMap.set(week.naam + "," + week.voornaam, week);
      }
      let rowsArray = fetchedTable.getRowsAsArray();
      let nu = /* @__PURE__ */ new Date();
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
        if (week) {
          if (aanw.weken) {
            aanw.weken += " + " + week.weken;
          } else {
            aanw.weken = week.weken.toString();
          }
        }
        return aanw;
      });
      let studentVakPees = /* @__PURE__ */ new Map();
      let leraarPees = /* @__PURE__ */ new Map();
      pList.filter((line) => line.code === "P").forEach((p) => {
        studentVakPees.set(p.naam + "," + p.voornaam + "," + p.vak, (studentVakPees.get(p.naam + "," + p.voornaam + "," + p.vak) ?? 0) + 1);
        leraarPees.set(p.leraar, (leraarPees.get(p.leraar) ?? 0) + 1);
      });
      console.log(studentVakPees);
      console.log(leraarPees);
      aanwList.forEach((aanw) => {
        let newP = studentVakPees.get(aanw.naam + "," + aanw.voornaam + "," + aanw.vakReduced) ?? 0;
        if (newP > aanw.codeP)
          aanw.codeP = newP;
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
      aanwezighedenToClipboard();
      tableDef.tableRef.getOrgTable().querySelector("tbody").replaceChildren(...fetchedTable.getRows());
    });
  }
  function aanwezighedenToClipboard() {
    let text = window.sessionStorage.getItem(AANW_LIST);
    navigator.clipboard.writeText(text).then((r) => {
      showInfoMessage("Data copied to clipboard. <a id=" + COPY_AGAIN + " href='javascript:void(0);'>Copy again</a>", COPY_AGAIN, () => {
        aanwezighedenToClipboard();
      });
    }).catch((reason) => {
      showInfoMessage("Could not copy to clipboard!!! <a id=" + COPY_AGAIN + " href='javascript:void(0);'>Copy again</a>", COPY_AGAIN, () => {
        aanwezighedenToClipboard();
      });
    });
  }
  function reduceVaknaam(vaknaam) {
    let vak = reduceVaknaamStep1(vaknaam);
    return vak.replace("orkestslagwerk", "slagwerk").replace("jazz pop rock)", "JPR").replace("koor", "GM").replace(": musical", "").replace(" (musical)", "");
  }
  function reduceVaknaamStep1(vaknaam) {
    vaknaam = vaknaam.toLowerCase();
    if (vaknaam.includes("culturele vorming")) {
      if (vaknaam.includes("3."))
        return "ML";
      else
        return "MA";
    }
    if (vaknaam.includes("uziekatelier")) {
      return "MA";
    }
    if (vaknaam.includes("uzieklab")) {
      return "ML";
    }
    if (vaknaam.includes("roepsmusiceren")) {
      return "GM";
    }
    if (vaknaam.includes("theorie")) {
      return "MT";
    }
    if (vaknaam.includes("geleidingspraktijk")) {
      return "BP";
    }
    if (vaknaam.includes("oordatelier")) {
      return "WA";
    }
    if (vaknaam.includes("oordlab")) {
      return "WL";
    }
    if (vaknaam.includes("mprovisatie")) {
      return "impro";
    }
    if (vaknaam.includes("omeinoverschrijdende")) {
      return "KB";
    }
    if (vaknaam.includes("unstenbad")) {
      return "KB";
    }
    if (vaknaam.includes("ramalab")) {
      return "DL";
    }
    if (vaknaam.includes("oordstudio")) {
      return "WS";
    }
    if (vaknaam.includes("ramastudio")) {
      return "DS";
    }
    if (vaknaam.includes("ompositie")) {
      return "compositie";
    }
    if (vaknaam.includes(" saz")) {
      return "saz";
    }
    if (vaknaam.includes("instrument: klassiek: ")) {
      let rx = /instrument: klassiek: (\S*)/;
      let matches2 = vaknaam.match(rx);
      if (matches2.length > 1)
        return matches2[1];
      else
        return vaknaam;
    }
    if (vaknaam.includes("instrument: jazz-pop-rock: ")) {
      let rx = /instrument: jazz-pop-rock: (\S*)/;
      let matches2 = vaknaam.match(rx);
      if (matches2.length > 1) {
        if (matches2[1].includes("elektrische"))
          return "gitaar JPR";
        else
          return matches2[1] + " JPR";
      } else
        return vaknaam;
    }
    if (vaknaam.includes("rrangeren") || vaknaam.includes("opname") || vaknaam.includes("electronics")) {
      return "elektronische muziek";
    }
    let rx2 = /(.*).•./;
    let matches = vaknaam.match(rx2);
    if (matches.length > 1)
      return matches[1];
    return "??";
  }

  // typescript/afwezigheden/observer.ts
  var observer_default10 = new ExactHashObserver("#extra-tickets?h=afwezigheden", onMutation8, true);
  function onMutation8(mutation) {
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
      matchingLeerlingen.sort((a, b) => a.weight - b.weight);
      for (let lln of matchingLeerlingen) {
        let anchor = document.createElement("a");
        anchor.href = "#";
        anchor.text = lln.name;
        anchor.onclick = () => fillAndClick(lln.name);
        if (lln.winner)
          anchor.classList.add("bold");
        leerlingLabel.insertAdjacentElement("afterend", anchor);
        leerlingLabel.parentElement.insertBefore(document.createTextNode(" "), anchor);
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
  var matchingLeerlingen = [];
  var currentEmailHtml = "";
  async function onTicket() {
    let card_bodyDiv = document.querySelector(".card-body");
    if (!card_bodyDiv)
      return;
    let emailText = card_bodyDiv.textContent;
    currentEmailHtml = card_bodyDiv.innerHTML;
    let matches = [...emailText.matchAll(rxEmail)];
    let uniqueEmails = [...new Set(matches.map((match2) => match2[0]))];
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
      return { id, name, weight: 0, winner: false };
    });
    findUniqueMatch(emailText, matchingLeerlingen);
  }
  function findUniqueMatch(emailText, matchingLeerlingen2) {
    if (matchingLeerlingen2.length === 1)
      return matchingLeerlingen2[0];
    let mailLowerCase = emailText.toLowerCase();
    for (let lln of matchingLeerlingen2) {
      let nameParts = lln.name.split(" ");
      for (let namePart of nameParts) {
        if (emailText.includes(" " + namePart + " ")) {
          lln.weight++;
        }
        if (mailLowerCase.includes(" " + namePart.toLowerCase() + " ")) {
          lln.weight++;
        }
      }
    }
    matchingLeerlingen2.sort((a, b) => b.weight - a.weight);
    if (matchingLeerlingen2[0].weight > matchingLeerlingen2[1].weight)
      matchingLeerlingen2[0].winner = true;
  }

  // typescript/setupPowerQuery.ts
  var powerQueryItems = [];
  var popoverVisible = false;
  var selectedItem = 0;
  function saveQueryItems(page, queryItems) {
    let savedPowerQueryString = localStorage.getItem(POWER_QUERY_ID);
    if (!savedPowerQueryString) {
      savedPowerQueryString = "{}";
    }
    let savedPowerQuery = JSON.parse(savedPowerQueryString);
    savedPowerQuery[page] = queryItems;
    localStorage.setItem(POWER_QUERY_ID, JSON.stringify(savedPowerQuery));
  }
  function getSavedQueryItems() {
    let savedPowerQueryString = localStorage.getItem(POWER_QUERY_ID);
    if (!savedPowerQueryString) {
      return [];
    }
    let allItems = [];
    let savedPowerQuery = JSON.parse(savedPowerQueryString);
    for (let page in savedPowerQuery) {
      allItems.push(...savedPowerQuery[page]);
    }
    return allItems;
  }
  function screpeDropDownMenu(headerMenu) {
    let headerLabel = headerMenu.querySelector("a").textContent.trim();
    let newItems = Array.from(headerMenu.querySelectorAll("div.dropdown-menu > a")).map((item) => {
      let queryItem = {
        func: void 0,
        headerLabel,
        label: item.textContent.trim(),
        href: item.href,
        weight: 0,
        longLabel: "",
        lowerCase: ""
      };
      queryItem.longLabel = queryItem.headerLabel + " > " + queryItem.label;
      queryItem.lowerCase = queryItem.longLabel.toLowerCase();
      return queryItem;
    }).filter((item) => item.label != "" && item.href != "" && item.href != "https://administratie.dko3.cloud/#");
    powerQueryItems.push(...newItems);
  }
  function scrapeMainMenu() {
    powerQueryItems = [];
    let menu = document.getElementById("dko3_navbar");
    let headerMenus = menu.querySelectorAll("#dko3_navbar > ul.navbar-nav > li.nav-item.dropdown");
    for (let headerMenu of headerMenus.values()) {
      screpeDropDownMenu(headerMenu);
    }
  }
  function setupPowerQuery() {
  }
  function gotoWerklijstUrenNextYear(_queryItem) {
    let pageState = getPageStateOrDefault("Werklijst" /* Werklijst */);
    pageState.goto = "Werklijst_uren_nextYear" /* Werklijst_uren_nextYear */;
    savePageState(pageState);
    location.href = "/#leerlingen-werklijst";
  }
  function gotoWerklijstUrenPrevYear(_queryItem) {
    let pageState = getPageStateOrDefault("Werklijst" /* Werklijst */);
    pageState.goto = "Werklijst_uren_prevYear" /* Werklijst_uren_prevYear */;
    savePageState(pageState);
    location.href = "/#leerlingen-werklijst";
  }
  function getHardCodedQueryItems() {
    let items = [];
    let item = {
      headerLabel: "Werklijst",
      href: "",
      label: "Lerarenuren " + createShortSchoolyearString(calculateSchooljaar()),
      longLabel: "",
      lowerCase: "",
      weight: 0
    };
    item.longLabel = item.headerLabel + " > " + item.label;
    item.lowerCase = item.longLabel.toLowerCase();
    item.func = gotoWerklijstUrenPrevYear;
    items.push(item);
    item = {
      headerLabel: "Werklijst",
      href: "",
      label: "Lerarenuren " + createShortSchoolyearString(calculateSchooljaar() + 1),
      longLabel: "",
      lowerCase: "",
      weight: 0
    };
    item.longLabel = item.headerLabel + " > " + item.label;
    item.lowerCase = item.longLabel.toLowerCase();
    item.func = gotoWerklijstUrenNextYear;
    items.push(item);
    return items;
  }
  document.body.addEventListener("keydown", showPowerQuery);
  function showPowerQuery(ev) {
    if (ev.key === "q" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
      scrapeMainMenu();
      powerQueryItems.push(...getSavedQueryItems());
      powerQueryItems.push(...getHardCodedQueryItems());
      popover.showPopover();
    } else {
      if (popoverVisible === false)
        return;
      if (isAlphaNumeric(ev.key) || ev.key === " ") {
        searchField.textContent += ev.key;
        selectedItem = 0;
      } else if (ev.key == "Escape") {
        if (searchField.textContent !== "") {
          searchField.textContent = "";
          selectedItem = 0;
          ev.preventDefault();
        }
      } else if (ev.key == "Backspace") {
        searchField.textContent = searchField.textContent.slice(0, -1);
      } else if (ev.key == "ArrowDown") {
        selectedItem++;
        ev.preventDefault();
      } else if (ev.key == "ArrowUp") {
        selectedItem--;
        ev.preventDefault();
      } else if (ev.key == "Enter") {
        let item = powerQueryItems.find((item2) => item2.longLabel === list.children[selectedItem].dataset.longLabel);
        popover.hidePopover();
        if (item.func) {
          item.func(item);
        } else {
          location.href = item.href;
        }
        ev.preventDefault();
      }
    }
    filterItems(searchField.textContent);
  }
  var popover = document.createElement("div");
  document.querySelector("main").appendChild(popover);
  popover.setAttribute("popover", "auto");
  popover.id = "powerQuery";
  popover.addEventListener("toggle", (ev) => {
    popoverVisible = ev.newState === "open";
  });
  var searchField = document.createElement("label");
  popover.appendChild(searchField);
  var list = document.createElement("div");
  popover.appendChild(list);
  list.classList.add("list");
  function filterItems(needle) {
    for (const item of powerQueryItems) {
      item.weight = 0;
      if (item.lowerCase.includes(needle))
        item.weight += 1e3;
      let needleWordsWithSeparator = needle.split(/(?= )/g);
      if (needleWordsWithSeparator.every((word) => item.lowerCase.includes(word)))
        item.weight += 500;
      let indices = needle.split("").map((char) => item.lowerCase.indexOf(char));
      if (indices.every((num) => num !== -1) && isSorted(indices))
        item.weight += 50;
      if (needle.split("").every((char) => item.lowerCase.includes(char)))
        item.weight += 20;
    }
    const MAX_VISIBLE_QUERY_ITEMS = 30;
    list.innerHTML = powerQueryItems.filter((item) => item.weight != 0).sort((a, b) => b.weight - a.weight).map((item) => `<div data-long-label="${item.longLabel}">${item.longLabel}</div>`).slice(0, MAX_VISIBLE_QUERY_ITEMS).join("\n");
    selectedItem = clamp(selectedItem, 0, list.children.length - 1);
    list.children[selectedItem]?.classList.add("selected");
  }
  function isSorted(arr) {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] > arr[i + 1]) {
        return false;
      }
    }
    return true;
  }

  // typescript/pages/observer.ts
  var extraInschrijvingenObserver = new ExactHashObserver("#extra-inschrijvingen", onMutationExtraInschrijvingen);
  var allLijstenObserver = new ExactHashObserver("#leerlingen-lijsten", onMutationAlleLijsten);
  var financialObserver = new ExactHashObserver("#extra-financieel", onMutationFinancial);
  var assetsObserver = new ExactHashObserver("#extra-assets", onMutationAssets);
  var evaluatieObserver = new ExactHashObserver("#extra-evaluatie", onMutationEvaluatie);
  var academieMenuObserver = new ExactHashObserver("#extra-academie", onMutationAcademie);
  function onMutationAcademie(_mutation) {
    saveQueryItems("Academie", scrapeMenuPage("Academie > ", defaultLinkToQueryItem));
    return true;
  }
  function onMutationAssets(_mutation) {
    saveQueryItems("Assets", scrapeMenuPage("Assets > ", defaultLinkToQueryItem));
    return true;
  }
  function onMutationEvaluatie(_mutation) {
    saveQueryItems("Evaluatie", scrapeMenuPage("Evaluatie > ", defaultLinkToQueryItem));
    return true;
  }
  function onMutationFinancial(_mutation) {
    saveQueryItems("Financieel", scrapeMenuPage("Financieel > ", defaultLinkToQueryItem));
    return true;
  }
  function onMutationAlleLijsten(_mutation) {
    saveQueryItems("Lijsten", scrapeMenuPage("Lijsten > ", defaultLinkToQueryItem));
    return true;
  }
  function onMutationExtraInschrijvingen(_mutation) {
    saveQueryItems("ExtraInschrijvingen", scrapeMenuPage("Inschrijvingen > ", inschrijvingeLinkToQueryItem));
    return true;
  }
  function inschrijvingeLinkToQueryItem(headerLabel, link, longLabelPrefix) {
    let item = {
      headerLabel,
      href: link.href,
      label: link.textContent.trim(),
      longLabel: "",
      lowerCase: "",
      weight: 0
    };
    if (item.label.toLowerCase().includes("inschrijving")) {
      item.longLabel = item.headerLabel + " > " + item.label;
    } else {
      item.longLabel = longLabelPrefix + item.headerLabel + " > " + item.label;
    }
    item.lowerCase = item.longLabel.toLowerCase();
    return item;
  }
  function defaultLinkToQueryItem(headerLabel, link, longLabelPrefix) {
    let item = {
      headerLabel,
      href: link.href,
      label: link.textContent.trim(),
      longLabel: "",
      lowerCase: "",
      weight: 0
    };
    item.longLabel = longLabelPrefix + item.label;
    item.lowerCase = item.longLabel.toLowerCase();
    return item;
  }
  function scrapeMenuPage(longLabelPrefix, linkConverter) {
    let queryItems = [];
    let blocks = document.querySelectorAll("div.card-body");
    for (let block of blocks) {
      let header = block.querySelector("h5");
      if (!header) {
        continue;
      }
      let headerLabel = header.textContent.trim();
      let links = block.querySelectorAll("a");
      for (let link of links) {
        if (!link.href)
          continue;
        let item = linkConverter(headerLabel, link, longLabelPrefix);
        queryItems.push(item);
      }
    }
    return queryItems;
  }

  // typescript/main.ts
  init();
  function init() {
    getOptions().then(() => {
      chrome.storage.onChanged.addListener((_changes, area) => {
        if (area === "sync") {
          getOptions().then((r) => {
            onSettingsChanged();
          });
        }
      });
      window.navigation.addEventListener("navigatesuccess", () => {
        checkGlobalSettings();
        onPageChanged();
      });
      window.addEventListener("load", () => {
        onPageChanged();
      });
      registerObserver(observer_default);
      registerObserver(observer_default2);
      registerObserver(observer_default3);
      registerObserver(observer_default4);
      registerObserver(observer_default6);
      registerObserver(observer_default5);
      registerObserver(extraInschrijvingenObserver);
      registerObserver(allLijstenObserver);
      registerObserver(financialObserver);
      registerObserver(assetsObserver);
      registerObserver(evaluatieObserver);
      registerObserver(observer_default7);
      registerObserver(observer_default8);
      registerObserver(academieMenuObserver);
      registerObserver(observer_default9);
      registerObserver(observer_default10);
      onPageChanged();
      setupPowerQuery();
    });
  }
  var lastCheckTime = Date.now();
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
    for (let observer of settingsObservers) {
      observer();
    }
  }
  function onPageChanged() {
    if (getGlobalSettings().globalHide) {
      return;
    }
    for (let observer of observers) {
      observer.onPageChanged();
    }
  }
  async function getOptions() {
    let items = await chrome.storage.sync.get(null);
    Object.assign(options, items);
    setGlobalSetting(await fetchGlobalSettings(getGlobalSettings()));
  }
})();
//# sourceMappingURL=bundle.js.map
