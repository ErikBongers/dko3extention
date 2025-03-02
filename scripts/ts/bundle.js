(() => {
  // typescript/globals.ts
  var options = {
    showDebug: false,
    myAcademies: "",
    showNotAssignedClasses: true
  };
  var observers = [];
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
      buttonContent.classList.add("fas", imageId);
      targetElement.insertAdjacentElement(where, button2);
    }
  }
  function getSchooljaarSelectElement() {
    let selects = document.querySelectorAll("select");
    return Array.from(selects).filter((element) => element.id.includes("schooljaar")).pop();
  }
  function getSchooljaar() {
    let el = getSchooljaarSelectElement();
    if (el)
      return el.value;
    el = document.querySelector("div.alert-primary");
    return el.textContent.match(/schooljaar *= (\d{4}-\d{4})*/)[1];
  }
  function getUserAndSchoolName() {
    let footer = document.querySelector("body > main > div.row > div.col-auto.mr-auto > small");
    const reInstrument = /.*Je bent aangemeld als (.*)\s@\s(.*)\./;
    const match = footer.textContent.match(reInstrument);
    if (match?.length !== 3) {
      throw new Error(`Could not process footer text "${footer.textContent}"`);
    }
    let userName = match[1];
    let schoolName = match[2];
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
  function filterTable(table, searchFieldId, getRowSearchText) {
    let searchText = document.getElementById(searchFieldId).value;
    let search_OR_list = searchText.split(",").map((txt) => txt.trim());
    for (let tr of table.tBodies[0].rows) {
      let match = false;
      for (let search of search_OR_list) {
        let rowText = getRowSearchText(tr);
        if (match_AND_expression(search, rowText))
          match = true;
      }
      tr.style.visibility = match ? "visible" : "collapse";
    }
    return searchText;
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
    constructor(onPageChangedCallback, pageFilter, onMutationCallback) {
      this.onPageChangedCallback = onPageChangedCallback;
      this.pageFilter = pageFilter;
      this.onMutation = onMutationCallback;
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
    constructor(urlHash, onMutationCallback) {
      this.baseObserver = new BaseObserver(void 0, new HashPageFilter(urlHash), onMutationCallback);
    }
    onPageChanged() {
      this.baseObserver.onPageChanged();
    }
  };
  var ExactHashObserver = class {
    constructor(urlHash, onMutationCallback) {
      this.baseObserver = new BaseObserver(void 0, new ExactHashPageFilter(urlHash), onMutationCallback);
    }
    onPageChanged() {
      this.baseObserver.onPageChanged();
    }
  };
  var PageObserver = class {
    constructor(onPageChangedCallback) {
      this.baseObserver = new BaseObserver(onPageChangedCallback, new AllPageFilter(), void 0);
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
    let modules = lessen.filter((les) => les.isModule);
    let trimesterModules = [];
    for (let module of modules) {
      module.students = scrapeStudents(module.studentsTable);
      const reInstrument = /.*\Snitiatie\s*(\S+).*(\d).*/;
      const match = module.naam.match(reInstrument);
      if (match?.length !== 3) {
        console.error(`Could not process module "${module.naam}" (${module.id}).`);
        continue;
      }
      module.instrumentName = match[1];
      module.trimesterNo = parseInt(match[2]);
      trimesterModules.push(module);
    }
    db3(trimesterModules);
    return trimesterModules;
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
    les.isModule = Array.from(badges).some((el) => el.textContent === "module");
    les.alc = Array.from(badges).some((el) => el.textContent === "ALC");
    les.visible = lesInfo.getElementsByClassName("fa-eye-slash").length === 0;
    let mutedSpans = lesInfo.querySelectorAll("span.text-muted");
    if (mutedSpans.length > 1) {
      les.naam = mutedSpans.item(0).textContent;
    } else {
      les.naam = lesInfo.children[1].textContent;
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

  // typescript/lessen/convert.ts
  var RowInfo = class {
  };
  function buildTrimesters(modules) {
    let mergedInstrument = [void 0, void 0, void 0];
    for (let module of modules) {
      mergedInstrument[module.trimesterNo - 1] = module;
    }
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
  function buildTableData(inputModules) {
    let tableData = {
      students: /* @__PURE__ */ new Map(),
      rows: []
    };
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
    let instrumentNames = inputModules.map((module) => module.instrumentName);
    instrumentNames = [...new Set(instrumentNames)];
    for (let instrumentName of instrumentNames) {
      let instrumentModules = inputModules.filter((module) => module.instrumentName === instrumentName);
      let teachers = instrumentModules.map((module) => module.teacher);
      teachers = [...new Set(teachers)];
      for (let teacher of teachers) {
        let instrumentTeacherModules = instrumentModules.filter((module) => module.teacher === teacher);
        let lesmomenten = getLesmomenten(instrumentTeacherModules);
        lesmomenten = [...new Set(lesmomenten)];
        for (let lesmoment of lesmomenten) {
          let instrumentTeacherMomentModules = instrumentTeacherModules.filter((module) => module.formattedLesmoment === lesmoment);
          let rowInfo = new RowInfo();
          rowInfo.instrumentName = instrumentName;
          rowInfo.teacher = teacher;
          rowInfo.lesmoment = lesmoment;
          rowInfo.maxAantal = getMaxAantal(instrumentTeacherMomentModules);
          rowInfo.vestiging = getVestigingen(instrumentTeacherMomentModules);
          rowInfo.trimesters = buildTrimesters(instrumentTeacherMomentModules);
          tableData.rows.push(rowInfo);
          for (let trim of rowInfo.trimesters) {
            addTrimesterStudentsToMapAndCount(tableData.students, trim);
          }
        }
      }
    }
    for (let student of tableData.students.values()) {
      let instruments = student.instruments.flat();
      if (instruments.length < 3) {
        student.allYearSame = false;
        continue;
      }
      student.allYearSame = instruments.every((instr) => instr.instrumentName === (student?.instruments[0][0]?.instrumentName ?? "---"));
    }
    for (let instrument of tableData.rows) {
      for (let trim of instrument.trimesters) {
        sortTrimesterStudents(trim);
      }
    }
    for (let student of tableData.students.values()) {
      student.info = "";
      for (let instrs of student.instruments) {
        if (instrs.length) {
          student.info += instrs[0].trimesterNo + ". " + instrs.map((instr) => instr.instrumentName) + "\n";
        } else {
          student.info += "?. ---\n";
        }
      }
    }
    return tableData;
  }
  function addTrimesterStudentsToMapAndCount(students, trim) {
    if (!trim) return;
    for (let student of trim.students) {
      if (!students.has(student.name)) {
        student.instruments = [[], [], []];
        students.set(student.name, student);
      }
      let stud = students.get(student.name);
      stud.instruments[trim.trimesterNo - 1].push(trim);
    }
    trim.students = trim.students.map((student) => students.get(student.name));
  }
  function sortTrimesterStudents(trim) {
    if (!trim) return;
    let comparator = new Intl.Collator();
    trim.students.sort((a, b) => {
      if (a.allYearSame && !b.allYearSame) {
        return -1;
      } else if (!a.allYearSame && b.allYearSame) {
        return 1;
      } else {
        return comparator.compare(a.name, b.name);
      }
    });
  }

  // typescript/def.ts
  var COPY_AGAIN = "copy_again";
  var PROGRESS_BAR_ID = "progressBarFetch";
  var PREFILL_INSTR_BTN_ID = "prefillInstrButton";
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
  function isButtonHighlighted(buttonId) {
    return document.getElementById(buttonId)?.classList.contains("toggled");
  }
  var CACHE_DATE_SUFFIX = "__date";
  var POWER_QUERY_ID = "savedPowerQuery";
  var STORAGE_PAGE_STATE_KEY = "pageState";
  var UREN_TABLE_STATE_NAME = "__uren__";

  // typescript/lessen/build.ts
  var NBSP = 160;
  function buildTrimesterTable(instruments) {
    instruments.sort((instr1, instr2) => instr1.instrumentName.localeCompare(instr2.instrumentName));
    let trimDiv = document.getElementById(TRIM_DIV_ID);
    let newTable = document.createElement("table");
    newTable.id = "trimesterTable";
    newTable.style.width = "100%";
    let col = document.createElement("col");
    col.setAttribute("width", "100");
    newTable.appendChild(col);
    col = document.createElement("col");
    col.setAttribute("width", "100");
    newTable.appendChild(col);
    col = document.createElement("col");
    col.setAttribute("width", "100");
    newTable.appendChild(col);
    const newTableBody = document.createElement("tbody");
    let totTrim1 = 0;
    let totTrim2 = 0;
    let totTrim3 = 0;
    for (let instrument of instruments) {
      totTrim1 += instrument.trimesters[0]?.students?.length ?? 0;
      totTrim2 += instrument.trimesters[1]?.students?.length ?? 0;
      totTrim3 += instrument.trimesters[2]?.students?.length ?? 0;
    }
    const tHead = document.createElement("thead");
    newTable.appendChild(tHead);
    tHead.classList.add("table-secondary");
    const trHeader = document.createElement("tr");
    tHead.appendChild(trHeader);
    const th1 = document.createElement("th");
    trHeader.appendChild(th1);
    let div1 = document.createElement("div");
    th1.appendChild(div1);
    let span1 = document.createElement("span");
    div1.appendChild(span1);
    span1.classList.add("bold");
    span1.innerHTML = `Trimester 1`;
    let spanTot1 = document.createElement("span");
    div1.appendChild(spanTot1);
    spanTot1.classList.add("plain");
    spanTot1.innerHTML = ` (${totTrim1} lln) `;
    const th2 = document.createElement("th");
    trHeader.appendChild(th2);
    let div2 = document.createElement("div");
    th2.appendChild(div2);
    let span2 = document.createElement("span");
    div2.appendChild(span2);
    span2.classList.add("bold");
    span2.innerHTML = `Trimester 2`;
    let spanTot2 = document.createElement("span");
    div2.appendChild(spanTot2);
    spanTot2.classList.add("plain");
    spanTot2.innerHTML = ` (${totTrim2} lln) `;
    const th3 = document.createElement("th");
    trHeader.appendChild(th3);
    let div3 = document.createElement("div");
    th3.appendChild(div3);
    let span3 = document.createElement("span");
    div3.appendChild(span3);
    span3.classList.add("bold");
    span3.innerHTML = `Trimester 3`;
    let spanTot3 = document.createElement("span");
    div3.appendChild(spanTot3);
    spanTot3.classList.add("plain");
    spanTot3.innerHTML = ` (${totTrim3} lln) `;
    for (let instrument of instruments) {
      buildInstrument(newTableBody, instrument);
    }
    newTable.appendChild(newTableBody);
    document.body.appendChild(newTable);
    newTable.setAttribute("border", "2");
    trimDiv.dataset.showFullClass = isButtonHighlighted(FULL_CLASS_BUTTON_ID) ? "true" : "false";
    trimDiv.appendChild(newTable);
  }
  function buildInstrument(newTableBody, instrument) {
    let headerRows = buildInstrumentHeader(newTableBody, instrument);
    let studentTopRowNo = newTableBody.children.length;
    let rowCount = Math.max(...instrument.trimesters.map((trim) => {
      if (!trim) return 0;
      let cnt = trim.maxAantal > 100 ? 4 : trim.maxAantal;
      return cnt > trim.students.length ? cnt : trim.students.length;
    }));
    let hasWachtlijst = instrument.trimesters.find((trim) => (trim?.wachtlijst ?? 0) > 0);
    if (hasWachtlijst) {
      rowCount++;
    }
    headerRows.trName.dataset.hasFullClass = "false";
    headerRows.trModuleLinks.dataset.hasFullClass = "false";
    let hasFullClass = false;
    for (let rowNo = 0; rowNo < rowCount; rowNo++) {
      let row = document.createElement("tr");
      newTableBody.appendChild(row);
      row.classList.add("trimesterRow");
      row.dataset.hasFullClass = "false";
      for (let trimNo = 0; trimNo < 3; trimNo++) {
        let trimester = instrument.trimesters[trimNo];
        let student = void 0;
        if (trimester) {
          student = trimester.students[rowNo];
          if (trimester.aantal >= trimester.maxAantal) {
            row.dataset.hasFullClass = "true";
            hasFullClass = true;
          }
        }
        let cell = buildStudentCell(student);
        row.appendChild(cell);
        if (trimester?.maxAantal <= rowNo) {
          cell.classList.add("gray");
        }
        if (student?.instruments[trimNo].length > 1) {
          cell.classList.add("yellowMarker");
        }
      }
    }
    if (hasFullClass) {
      headerRows.trName.dataset.hasFullClass = "true";
      headerRows.trModuleLinks.dataset.hasFullClass = "true";
    }
    if (!hasWachtlijst) {
      return;
    }
    for (let trimNo = 0; trimNo < 3; trimNo++) {
      let colNo = trimNo;
      let rowNo = newTableBody.children.length - 1;
      newTableBody.children[rowNo].classList.add("wachtlijst");
      let cell = newTableBody.children[rowNo].children[colNo];
      cell.classList.add("wachtlijst");
      let trimester = instrument.trimesters[trimNo];
      if ((trimester?.wachtlijst ?? 0) === 0) {
        continue;
      }
      const small = document.createElement("small");
      cell.appendChild(small);
      small.appendChild(document.createTextNode(`(${trimester.wachtlijst} op wachtlijst)`));
      small.classList.add("text-danger");
      if (trimester.wachtlijst > 0 && trimester.aantal < trimester.maxAantal) {
        cell.querySelector("small").classList.add("yellowMarker");
        newTableBody.children[studentTopRowNo + trimester.aantal].children[colNo].classList.add("yellowMarker");
      }
    }
  }
  function buildInstrumentHeader(newTableBody, instrument) {
    const trName = document.createElement("tr");
    newTableBody.appendChild(trName);
    trName.classList.add("instrumentRow");
    const tdInstrumentName = document.createElement("td");
    trName.appendChild(tdInstrumentName);
    tdInstrumentName.classList.add("instrumentName", "instrumentCell");
    tdInstrumentName.setAttribute("colspan", "3");
    let nameDiv = document.createElement("div");
    tdInstrumentName.appendChild(nameDiv);
    nameDiv.classList.add("moduleName");
    nameDiv.appendChild(document.createTextNode(instrument.instrumentName));
    let div = document.createElement("div");
    tdInstrumentName.appendChild(div);
    div.classList.add("text-muted");
    div.appendChild(document.createTextNode(instrument.lesmoment));
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createTextNode(instrument.teacher));
    div.appendChild(document.createElement("br"));
    div.appendChild(document.createTextNode(instrument.vestiging));
    const trModuleLinks = document.createElement("tr");
    newTableBody.appendChild(trModuleLinks);
    trModuleLinks.classList.add("instrumentRow");
    const tdLink1 = document.createElement("td");
    trModuleLinks.appendChild(tdLink1);
    trModuleLinks.classList.add("instrumentCell");
    if (instrument.trimesters[0]) {
      tdLink1.appendChild(buildModuleButton("1", instrument.trimesters[0].id));
    }
    const tdLink2 = document.createElement("td");
    trModuleLinks.appendChild(tdLink2);
    trModuleLinks.classList.add("instrumentCell");
    if (instrument.trimesters[1]) {
      tdLink2.appendChild(buildModuleButton("2", instrument.trimesters[1].id));
    }
    const tdLink3 = document.createElement("td");
    trModuleLinks.appendChild(tdLink3);
    trModuleLinks.classList.add("instrumentCell");
    if (instrument.trimesters[2]) {
      tdLink3.appendChild(buildModuleButton("3", instrument.trimesters[2].id));
    }
    return {
      "trName": trName,
      "trModuleLinks": trModuleLinks
    };
  }
  function buildModuleButton(buttonText, id) {
    const button = document.createElement("a");
    button.href = "#";
    button.setAttribute("onclick", `showView('lessen-les','','id=${id}'); return false;`);
    button.classList.add("float-right", "trimesterButton");
    button.innerText = buttonText;
    return button;
  }
  function buildStudentCell(student) {
    const cell = document.createElement("td");
    let studentSpan = document.createElement("span");
    studentSpan.appendChild(document.createTextNode(student?.name ?? String.fromCharCode(NBSP)));
    cell.appendChild(studentSpan);
    if (student?.allYearSame) {
      studentSpan.classList.add("allYear");
    }
    if (!student) {
      return cell;
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
  function addFilterField() {
    let divButtonNieuweLes = document.querySelector("#lessen_overzicht > div > button");
    if (!document.getElementById(TXT_FILTER_ID))
      divButtonNieuweLes.insertAdjacentElement("afterend", createScearchField(TXT_FILTER_ID, onSearchInput, savedSearch));
    onSearchInput();
  }
  function onSearchInput() {
    savedSearch = filterTable(
      document.getElementById("table_lessen_resultaat_tabel"),
      TXT_FILTER_ID,
      (tr) => tr.cells[0].textContent
    );
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
    showTrimesterTable(document.getElementById("table_lessen_resultaat_tabel").style.display !== "none");
  }
  function showTrimesterTable(show) {
    if (!document.getElementById(TRIM_TABLE_ID)) {
      let inputModules = scrapeModules();
      let tableData = buildTableData(inputModules);
      buildTrimesterTable(tableData.rows);
    }
    document.getElementById("table_lessen_resultaat_tabel").style.display = show ? "none" : "table";
    document.getElementById(TRIM_TABLE_ID).style.display = show ? "table" : "none";
    document.getElementById(TRIM_BUTTON_ID).title = show ? "Toon normaal" : "Toon trimesters";
    setButtonHighlighted(TRIM_BUTTON_ID, show);
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
  function setSchoolBackground() {
    let { userName, schoolName } = getUserAndSchoolName();
    let isMyAcademy = options.myAcademies.split("\n").filter((needle) => needle !== "").find((needle) => schoolName.includes(needle)) != void 0;
    if (options.myAcademies === "") {
      isMyAcademy = true;
    }
    if (isMyAcademy) {
      document.body.classList.remove("otherSchool");
    } else {
      document.body.classList.add("otherSchool");
    }
  }

  // typescript/cloud.ts
  async function fetchFromCloud(fileName) {
    return fetch(JSON_URL + "?fileName=" + fileName, { method: "GET" }).then((res) => res.json());
  }
  function uploadData(fileName, data) {
    fetch(JSON_URL + "?fileName=" + fileName, {
      method: "POST",
      body: JSON.stringify(data)
    }).then((res) => res.text().then((text) => {
      console.log(text);
    }));
  }

  // typescript/werklijst/buildUren.ts
  var isUpdatePaused = true;
  var cellChanged = false;
  var popoverIndex = 1;
  var theData;
  var editableObserver = new MutationObserver((mutationList, observer) => editableObserverCallback(mutationList, observer));
  setInterval(checkAndUpdate, 5e3);
  var colDefsArray = [
    { key: "uren_23_24", def: { label: "Uren\n23-24", classList: ["editable_number"], factor: 1, getValue: (ctx) => parseInt(ctx.data.fromCloud.columnMap.get("uren_23_24")?.get(ctx.vakLeraar.id)), totals: true } },
    { key: "uren_24_25", def: { label: "Uren\n24-25", classList: ["editable_number"], factor: 1, getValue: (ctx) => parseInt(ctx.data.fromCloud.columnMap.get("uren_24_25")?.get(ctx.vakLeraar.id)), totals: true } },
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
  colDefsArray.forEach((colDef, index) => {
    colDef.def.colIndex = index;
    colDef.def.total = 0;
  });
  var colDefs = new Map(colDefsArray.map((def) => [def.key, def.def]));
  function calcOver(ctx) {
    let totUren = getColValue(ctx, "tot_uren");
    if (isNaN(totUren)) {
      totUren = 0;
    }
    let urenJaar = getColValue(ctx, "uren_24_25");
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
    return getSchoolIdString() + "_uren_vak_lk_" + getSchooljaar().replace("-", "_") + ".json";
  }
  function buildJsonData() {
    let data = {
      version: "1.0",
      columns: []
    };
    let col1 = columnToJson(data, "uren_23_24");
    let col2 = columnToJson(data, "uren_24_25");
    data.columns.push({ key: "uren_23_24", rows: col1 });
    data.columns.push({ key: "uren_24_25", rows: col2 });
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
    updateColumnData("uren_23_24");
    updateColumnData("uren_24_25");
    let data = buildJsonData();
    uploadData(fileName, data);
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
    for (let [vakLeraarKey, vakLeraar] of theData.vakLeraars) {
      let tr = document.getElementById(createValidId(vakLeraarKey));
      for (let [colKey, colDef] of colDefs) {
        let td = tr.children[colDef.colIndex];
        let ctx = { td, colKey, colDef, vakLeraar, tr, colDefs, data: theData };
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
    fillTableHeader(table, data.vakLeraars);
    let tbody = document.createElement("tbody");
    table.appendChild(tbody);
    mapCloudData(data.fromCloud);
    let lastVak = "";
    let rowClass = void 0;
    clearTotals();
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
        let ctx = { td, colKey, colDef, vakLeraar, tr, colDefs, data };
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
    let numbers = Array.from(buttons).filter((btn) => btn.attributes["onclick"]?.value.includes("goto(")).map((btn) => btn.attributes["onclick"].value).map((txt) => getGotoNumber(txt));
    matches.slice(1).forEach((txt) => numbers.push(parseInt(txt)));
    numbers.sort((a, b) => a - b);
    if (numbers[0] === 1) {
      return new TableNavigation(numbers[1], numbers.pop(), buttonContainer);
    } else {
      return new TableNavigation(numbers[2] - numbers[1] - 1, numbers.pop(), buttonContainer);
    }
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
    saveToCache() {
      db3(`Caching ${this.getCacheId()}.`);
      window.sessionStorage.setItem(this.getCacheId(), this.shadowTableTemplate.innerHTML);
      window.sessionStorage.setItem(this.getCacheId() + CACHE_DATE_SUFFIX, (/* @__PURE__ */ new Date()).toJSON());
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
    async getTableData(rawData, parallelAsyncFunction) {
      this.setupInfoBar();
      this.clearCacheInfo();
      let cachedData = this.loadFromCache();
      if (cachedData) {
        if (parallelAsyncFunction) {
          this.parallelData = await parallelAsyncFunction();
        }
        this.shadowTableTemplate = document.createElement("template");
        this.shadowTableTemplate.innerHTML = cachedData.text;
        this.shadowTableDate = cachedData.date;
        this.isUsingCached = true;
        db3(`${this.tableRef.htmlTableId}: using cached data.`);
        let rows = this.shadowTableTemplate.content.querySelectorAll("tbody > tr");
        if (this.pageHandler.onPage)
          this.pageHandler.onPage(this, this.shadowTableTemplate.innerHTML, void 0, 0, this.shadowTableTemplate, rows);
        if (this.pageHandler.onLoaded)
          this.pageHandler.onLoaded(this);
      } else {
        this.isUsingCached = false;
        let success = await this.#fetchPages(parallelAsyncFunction, rawData);
        if (!success)
          return;
        this.saveToCache();
        if (this.pageHandler.onLoaded)
          this.pageHandler.onLoaded(this);
      }
      this.updateInfoBar();
    }
    async #fetchPages(parallelAsyncFunction, collection) {
      if (this.pageHandler.onBeforeLoading) {
        if (!this.pageHandler.onBeforeLoading(this))
          return false;
      }
      let progressBar = insertProgressBar(this.divInfoContainer, this.tableRef.navigationData.steps(), "loading pages... ");
      progressBar.start();
      if (parallelAsyncFunction) {
        let doubleResults = await Promise.all([
          this.#doFetchAllPages(collection, progressBar),
          parallelAsyncFunction()
        ]);
        this.parallelData = doubleResults[1];
      } else {
        await this.#doFetchAllPages(collection, progressBar);
      }
      return true;
    }
    async #doFetchAllPages(results, progressBar) {
      let offset = 0;
      try {
        while (true) {
          console.log("fetching page " + offset);
          let response = await fetch(this.tableRef.buildFetchUrl(offset));
          let text = await response.text();
          let template;
          if (offset === 0) {
            this.shadowTableTemplate = document.createElement("template");
            this.shadowTableTemplate.innerHTML = text;
            template = this.shadowTableTemplate;
          } else {
            template = document.createElement("template");
            template.innerHTML = text;
          }
          let rows = template.content.querySelectorAll("tbody > tr");
          if (this.pageHandler.onPage)
            this.pageHandler.onPage(this, text, results, offset, template, rows);
          if (offset !== 0) {
            this.shadowTableTemplate.content.querySelector("tbody").append(...rows);
          }
          offset += this.tableRef.navigationData.step;
          if (!progressBar.next())
            break;
        }
      } finally {
        progressBar.stop();
      }
      return results;
    }
    getRows() {
      let template = this.shadowTableTemplate;
      let rows = template.content.querySelectorAll("tbody tr");
      return Array.from(rows);
    }
  };

  // typescript/werklijst/criteria.ts
  async function fetchVakken(clear) {
    if (clear) {
      await sendClearWerklijst();
    }
    await sendAddCriterium("2024-2025", "Vak");
    let text = await fetchCritera("2024-2025");
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
  async function prefillInstruments() {
    await sendClearWerklijst();
    let vakken = await fetchVakken(false);
    let instruments = vakken.filter((vak) => isInstrument2(vak[0]));
    let values = instruments.map((vak) => parseInt(vak[1]));
    let valueString = values.join();
    let criteria = [
      { "criteria": "Schooljaar", "operator": "=", "values": "2024-2025" },
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
      this.onLoadedAndCheck = (tableDef) => {
        if (this.isValidPage)
          this.onLoadedExternal(tableDef);
        else
          console.log("NamedCellPageHandler: Not calling OnLoaded handler because page is not valid.");
      };
      this.onPage = (_tableDef, _text, _collection, offset, template, _rows) => {
        if (offset === 0) {
          if (!this.setTemplateAndCheck(template)) {
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
    function onLoaded(tableDef2) {
      let template = tableDef2.shadowTableTemplate;
      tableDef2.tableRef.getOrgTable().querySelector("tbody").replaceChildren(...template.content.querySelectorAll("tbody tr"));
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
    if (pageState.goto == "Werklijst_uren" /* Werklijst_uren */) {
      pageState.goto = "" /* None */;
      savePageState(pageState);
      prefillInstruments().then(() => {
      });
      return;
    }
    pageState.werklijstTableName = "";
    savePageState(pageState);
    let btnWerklijstMaken = document.querySelector("#btn_werklijst_maken");
    if (document.getElementById(PREFILL_INSTR_BTN_ID))
      return;
    addButton(btnWerklijstMaken, PREFILL_INSTR_BTN_ID, "Prefill instrumenten", prefillInstruments, "fa-guitar", ["btn", "btn-outline-dark"], "Uren ");
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
    let pageHandler = new NamedCellTablePageHandler(requiredHeaderLabels, onEmailPageLoaded, (tableDef1) => {
      navigator.clipboard.writeText("").then((value) => {
        console.log("Clipboard cleared.");
      });
    });
    let tableDef = new TableDef(
      findTableRefInCode(),
      pageHandler,
      getChecksumHandler(tableId)
    );
    function onEmailPageLoaded(tableDef2) {
      let rows = this.rows = tableDef2.shadowTableTemplate.content.querySelectorAll("tbody > tr");
      let allEmails = Array.from(rows).map((tr) => tableDef2.pageHandler.getColumnText(tr, "e-mailadressen"));
      let flattened = allEmails.map((emails) => emails.split(/[,;]/)).flat().filter((email) => !email.includes("@academiestudent.be")).filter((email) => email !== "");
      navigator.clipboard.writeText(flattened.join(";\n")).then(
        () => tableDef2.setTempMessage("Alle emails zijn naar het clipboard gekopieerd. Je kan ze plakken in Outlook.")
      );
    }
    tableDef.getTableData([], void 0).then((_results) => {
    });
  }
  function tryUntil(func) {
    if (!func())
      setTimeout(() => tryUntil(func), 100);
  }
  function onClickShowCounts() {
    if (!document.getElementById(COUNT_TABLE_ID)) {
      let onLoaded = function(tableDef2) {
        let vakLeraars = /* @__PURE__ */ new Map();
        let rows = this.rows = tableDef2.shadowTableTemplate.content.querySelectorAll("tbody > tr");
        for (let tr of rows) {
          scrapeStudent(tableDef2, tr, vakLeraars);
        }
        let fromCloud = tableDef2.parallelData;
        fromCloud = upgradeCloudData(fromCloud);
        vakLeraars = new Map([...vakLeraars.entries()].sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
        document.getElementById(COUNT_TABLE_ID)?.remove();
        buildTable({ vakLeraars, fromCloud }, tableDef2);
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
      tableDef.getTableData(/* @__PURE__ */ new Map(), () => fetchFromCloud(fileName)).then((_results) => {
      });
      return true;
    }
    showOrHideNewTable();
    return true;
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
    savedSearch2 = filterTable(
      document.querySelector("#div_table_vakgroepen_vakken table"),
      TXT_FILTER_ID2,
      (tr) => {
        let instrumentName = tr.cells[0].querySelector("label").textContent.trim();
        let strong = tr.cells[0].querySelector("strong")?.textContent.trim();
        return instrumentName + " " + strong;
      }
    );
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
    let prebuildPageHandler = new SimpleTableHandler(onLoaded, void 0);
    function onLoaded(tableDef2) {
    }
    let tableDef = new TableDef(
      tableRef,
      prebuildPageHandler,
      getChecksumHandler(tableRef.htmlTableId)
    );
    tableDef.divInfoContainer = divInfoContainer;
    if (clearCache)
      tableDef.clearCache();
    await tableDef.getTableData();
    await setViewFromCurrentUrl();
    return tableDef;
  }
  async function setViewFromCurrentUrl() {
    let hash = window.location.hash.replace("#", "");
    let page = await fetch("https://administratie.dko3.cloud/#" + hash).then((res) => res.text());
    let view = await fetch("view.php?args=" + hash).then((res) => res.text());
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
      let match = RegExp(rxString).exec(this.cursor);
      if (match) {
        this.cursor = this.cursor.substring(match.index + match[0].length);
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
    let prebuildPageHandler = new SimpleTableHandler(onLoaded, void 0);
    function onLoaded(tableDef2) {
    }
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
      let template = bckTableDef.shadowTableTemplate;
      ``;
      let rows = template.content.querySelectorAll("tbody tr");
      let rowsArray = Array.from(rows);
      return rowsArray.map((row) => {
        let namen = row.cells[0].textContent.split(", ");
        return { naam: namen[0], voornaam: namen[1], weken: parseInt(row.cells[2].textContent) };
      });
    });
    console.log(wekenLijst);
    showInfoMessage("Fetching attesten...");
    let attestenLijst = await getTableFromHash("leerlingen-lijsten-awi-ontbrekende_attesten", tableDef.divInfoContainer, true).then((bckTableDef) => {
      return bckTableDef.getRows().map(
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
      let template = bckTableDef.shadowTableTemplate;
      let rows = template.content.querySelectorAll("tbody tr");
      let rowsArray = Array.from(rows);
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
    tableDef.getTableData().then(() => {
      let wekenMap = /* @__PURE__ */ new Map();
      for (let week of wekenLijst) {
        wekenMap.set(week.naam + "," + week.voornaam, week);
      }
      let template = tableDef.shadowTableTemplate;
      let rows = template.content.querySelectorAll("tbody tr");
      let rowsArray = Array.from(rows);
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
      tableDef.tableRef.getOrgTable().querySelector("tbody").replaceChildren(...template.content.querySelectorAll("tbody tr"));
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
  function gotoWerklijstUren(_queryItem) {
    let pageState = getPageStateOrDefault("Werklijst" /* Werklijst */);
    pageState.goto = "Werklijst_uren" /* Werklijst_uren */;
    savePageState(pageState);
    location.href = "/#leerlingen-werklijst";
  }
  function getHardCodedQueryItems() {
    let items = [];
    let item = {
      headerLabel: "Werklijst",
      href: "",
      label: "Uren per vak per leraar",
      longLabel: "",
      lowerCase: "",
      weight: 0
    };
    item.longLabel = item.headerLabel + " > " + item.label;
    item.lowerCase = item.longLabel.toLowerCase();
    item.func = gotoWerklijstUren;
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
    getOptions(() => {
      chrome.storage.onChanged.addListener((_changes, area) => {
        if (area === "sync") {
          getOptions();
        }
      });
      window.navigation.addEventListener("navigatesuccess", () => {
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
      onPageChanged();
      setupPowerQuery();
    });
  }
  function onPageChanged() {
    for (let observer of observers) {
      observer.onPageChanged();
    }
  }
  function getOptions(callback) {
    chrome.storage.sync.get(
      null,
      //get all
      (items) => {
        Object.assign(options, items);
        callback?.();
      }
    );
  }
})();
//# sourceMappingURL=bundle.js.map
