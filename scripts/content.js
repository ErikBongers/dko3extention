const NBSP = 160;
window.navigation.addEventListener("navigatesuccess", (event) => {
	db3("navigateSuccess");
	checkAndSetObserverForLessenOverzicht();
});

window.addEventListener("load", (event) => {
	db3("loaded");
	checkAndSetObserverForLessenOverzicht();
});

function checkAndSetObserverForLessenOverzicht() {
	if (window.location.hash === "#lessen-overzicht") {
		db3("In lessen overzicht!");
		setMainObserver();
	} else {
		db3("Niet in lessen overzicht.");
		bodyObserver.disconnect();
	}
}

function setMainObserver() {
	const attachmentPoint = document.querySelector("main");

	if (!attachmentPoint) {
		db3("MAIN ni gevonne");
		return;
	}

	const config = {
		attributes: false,
		childList: true,
		subtree: true
	};
	bodyObserver.observe(attachmentPoint, config);
}

const bodyObserverCallback = (mutationList, observer) => {
	for (const mutation of mutationList) {
		if (mutation.type === "childList") {
			let printButton = document.getElementById("btn_print_overzicht_lessen");
			if (printButton) {
				//check if badge with text "module" is present.
				let badges = document.getElementsByClassName("badge");
				if (!Array.from(badges).some((el) => el.textContent === "module")) {
					return;
				}
				let moduleButton = document.getElementById("moduleButton");
				if (moduleButton === null) {
					db3("adding button");
					const trimButton = document.createElement("button", );
					trimButton.classList.add("btn", "btn-sm", "btn-outline-secondary", "w-100");
					trimButton.id = "moduleButton";
					trimButton.textContent = "Toon trimesters";
					trimButton.style.marginTop = "0";
					trimButton.onclick = showModules;
					printButton.insertAdjacentElement("beforebegin", trimButton);
				}
			}

		}
	}
};

const bodyObserver = new MutationObserver(bodyObserverCallback);

const debugDko3 = true;
function db3(message) {
	if (debugDko3) {
		console.log(message);
	}
}

function buildTrimesterTable(instruments) {
	let orininalTable = document.getElementById("table_lessen_resultaat_tabel");
	let newTable = document.createElement("table");
	newTable.id = "trimesterTable";
	newTable.style.width = "100%";
	const newTableBody = document.createElement("tbody");

	//header
	const tHead = document.createElement("thead");
	newTable.appendChild(tHead);
	tHead.classList.add("table-secondary")
	const trHeader = document.createElement("tr");
	tHead.appendChild(trHeader);
	const th1 = document.createElement("th");
	trHeader.appendChild(th1);
	th1.innerHTML = "Trimester 1";
	const th2 = document.createElement("th");
	trHeader.appendChild(th2);
	th2.innerHTML = "Trimester 2";
	const th3 = document.createElement("th");
	trHeader.appendChild(th3);
	th3.innerHTML = "Trimester 3";

	// creating all cells
	for (let instrument of instruments) {
		buildInstrument(newTableBody, instrument);
	}

	// put the <tbody> in the <table>
	newTable.appendChild(newTableBody);
	// appends <table> into <body>
	document.body.appendChild(newTable);
	// sets the border attribute of newTable to '2'
	newTable.setAttribute("border", "2");
	orininalTable.insertAdjacentElement("afterend", newTable);
}

function buildModuleButton(buttonText, id) {
	const button = document.createElement("a");
	button.href = "/?#lessen-les?id=" + id
	button.classList.add("float-right", "trimesterButton");
	button.innerText = buttonText;
	return button;
}

function buildInstrumentHeader(newTableBody, instrument) {
	const trName = document.createElement("tr");
	newTableBody.appendChild(trName);
	trName.classList.add("instrumentRow");

	const tdInstrumentName = document.createElement("td");
	trName.appendChild(tdInstrumentName);
	tdInstrumentName.classList.add("instrumentName", "instrumentCell");
	tdInstrumentName.appendChild(document.createTextNode(instrument.instrumentName));
	if (instrument.trimesters[0]) {
		tdInstrumentName.appendChild(buildModuleButton("1", instrument.trimesters[0].id));
	}

	const tdCell2 = document.createElement("td");
	trName.appendChild(tdCell2);
	tdCell2.classList.add("instrumentCell");
	tdCell2.appendChild(document.createTextNode(String.fromCharCode(NBSP)));
	if (instrument.trimesters[1]) {
		tdCell2.appendChild(buildModuleButton("2", instrument.trimesters[1].id));
	}
	const tdCell3 = document.createElement("td");
	trName.appendChild(tdCell3);
	tdCell3.classList.add("instrumentCell");
	tdCell3.appendChild(document.createTextNode(String.fromCharCode(NBSP)));
	if (instrument.trimesters[2]) {
		tdCell3.appendChild(buildModuleButton("3", instrument.trimesters[2].id));
	}
}

function buildInstrument(newTableBody, instrument) {
	// creates a table row
	buildInstrumentHeader(newTableBody, instrument);
	for (let rowNo = 0; rowNo < 4; rowNo++) {//TODO: use maxAantal, unless 999, in which case use effective max aantal.
		let row = document.createElement("tr");
		newTableBody.appendChild(row);
		for (let trimNo = 0; trimNo < 3; trimNo++) {
			let trimester = instrument.trimesters[trimNo];
			let studentName = undefined;
			if (trimester) {
				let student = trimester.students[rowNo];
				if (student) {
					studentName = student.name;
				}
			}
			row.appendChild(buildStudentCell(studentName));
		}
	}
}

function buildStudentCell(studentName) {
	const cell = document.createElement("td");
	cell.appendChild(document.createTextNode(studentName ??  String.fromCharCode(NBSP)));
	if (!studentName)
		return cell;

	const anchor = document.createElement("a");
	cell.appendChild(anchor);
	anchor.href = "#";
	anchor.classList.add("pl-2");
	anchor.onclick= function () { searchText(studentName); };
	const iTag = document.createElement("i");
	anchor.appendChild(iTag);
	iTag.classList.add('fas', "fa-user-alt");
	return cell;
}

function showModules() {
	showOriginalTable(document.getElementById("table_lessen_resultaat_tabel").style.display === "none");
}

function showOriginalTable(show) {
	//Build lazily and only once. Table will automatically be erased when filters are changed.
	if (!document.getElementById("trimesterTable")) {
		let inputModules = scrapeModules();
		let instruments = mergeTrimesters(inputModules);
		buildTrimesterTable(instruments);
	}

	document.getElementById("table_lessen_resultaat_tabel").style.display = show ? "table" : "none";
	document.getElementById("trimesterTable").style.display = show ? "none" : "table";
	document.getElementById("moduleButton").innerHTML = show ? "Toon trimesters": "Toon normaal";
}

function scrapeLesInfo(lesInfo) {
	let les = {};
	let vakStrong = lesInfo.firstChild;
	les.vakNaam = vakStrong.textContent;
	les.naam = lesInfo.children[1].textContent;
	let badges = lesInfo.getElementsByClassName("badge");
	les.module = Array.from(badges).some((el) => el.textContent === "module");
	let mutedSpans = lesInfo.getElementsByClassName("text-muted");
	if (mutedSpans.length > 0) {
		les.teacher = Array.from(mutedSpans).pop().textContent;
	}

	return les;
}

function scrapeStudents(studentTable) {
	let students = [];
	if(studentTable.tBodies.length === 0) {
		return students;
	}
	for (const row of studentTable.tBodies[0].rows) {
		let studentInfo = {};
		studentInfo.graadJaar = row.cells[0].children[0].textContent;
		studentInfo.name = row.cells[0].childNodes[1].textContent;
		students.push(studentInfo);
	}
	return students;
}

function scrapeModules() {
	let table = document.getElementById("table_lessen_resultaat_tabel");
	let body = table.tBodies[0];
	let lessen = [];
	for (const row of body.rows) {
		let lesInfo = row.cells[0];
		let studentsCell = row.cells[1];
		let studentsTable = studentsCell.querySelectorAll("table")[0];
		let les = scrapeLesInfo(lesInfo);
		les.students = scrapeStudents(studentsTable);
		let smallTags = studentsCell.querySelectorAll("small");
		let arrayLeerlingenAantal = Array.from(smallTags).map((item) => item.textContent).filter((txt) => txt.includes("leerlingen"));
		if (arrayLeerlingenAantal.length > 0) {
			let reAantallen = /(\d+).\D+(\d+)/;
			let matches = arrayLeerlingenAantal[0].match(reAantallen);
			les.aantal = matches[1];
			les.maxAantal = matches[2];
		}
		let idTag = Array.from(smallTags).find((item) => item.classList.contains("float-right"));
		les.id = idTag.textContent;
		lessen.push(les);
	}
	let modules = lessen.filter((les) => les.module);

	for (let module of modules) {
		//get name of instrument and trimester.
		const reInstrument = /.*\Snitiatie\s*(\w+).*(\d).*/;
		const match = module.naam.match(reInstrument);
		module.instrumentName = match[1];
		module.trimesterNo = parseInt(match[2]);
	}

	db3(modules);
	return modules;
}

function addTrimesters(instrument, inputModules) {
	let mergedInstrument = [undefined, undefined, undefined];
	let modulesForInstrument = inputModules.filter((module) => module.instrumentName === instrument.instrumentName);
	for (let module of modulesForInstrument) {
		mergedInstrument[module.trimesterNo-1] = module;
	}
	instrument.trimesters = mergedInstrument;
}

function mergeTrimesters(inputModules) {
	//get all instruments
	let instrumentNames = inputModules.map((module) => module.instrumentName);
	let uniqueInstrumentNames = [...new Set(instrumentNames)];

	let instruments = [];
	for (let instrumentName of uniqueInstrumentNames) {
		//get module instrument info
		let instrumentInfo = {};
		let module = inputModules.find((module) => module.instrumentName === instrumentName)
		instrumentInfo.instrumentName = module.instrumentName;
		instrumentInfo.maxAantal = module.maxAantal; //TODO: could be different for each trim.
		instrumentInfo.teacher = module.teacher; //TODO: could be different for each trim.
		instruments.push(instrumentInfo);
		addTrimesters(instruments[instruments.length-1], inputModules);
	}
	db3(instruments);
	return instruments;
}

function searchText(text) {
	db3("Forcing enter...");
	let input = document.querySelector("#snel_zoeken_veld_zoektermen");
	input.value = text;
	let evUp = new KeyboardEvent("keyup", {key: "Enter", keyCode: 13, bubbles: true});
	input.dispatchEvent(evUp);
}
