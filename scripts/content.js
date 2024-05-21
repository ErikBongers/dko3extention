const LESSEN_OVERZICHT_ID = "lessen_overzicht";
const TRIM_BUTTON_ID = "moduleButton";
const CHECKS_BUTTON_ID = "checksButton";
const FULL_CLASS_BUTTON_ID = "fullClassButton";
const TRIM_TABLE_ID = "trimesterTable";
const TRIM_DIV_ID = "trimesterDiv";

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
		if (mutation.type !== "childList") {
			continue;
		}
		let lessenOverzicht = document.getElementById(LESSEN_OVERZICHT_ID);
		if (mutation.target !== lessenOverzicht) {
			continue;
		}
		let printButton = document.getElementById("btn_print_overzicht_lessen");
		if (!printButton) {
			continue;
		}
		onLessenOverzichtChanged(printButton);
	}
};

function onLessenOverzichtChanged(printButton) {
	//reset state
	let overzichtDiv = document.getElementById(LESSEN_OVERZICHT_ID);
	let trimDiv = document.getElementById(TRIM_DIV_ID);
	if (!trimDiv) {
		let trimDiv = document.createElement("div");
		let originalTable = document.getElementById("table_lessen_resultaat_tabel");
		originalTable.insertAdjacentElement("afterend", trimDiv);
		trimDiv.id = TRIM_DIV_ID;
	}
	overzichtDiv.dataset.filterFullClasses = "false";

	let badges = document.getElementsByClassName("badge");
	let hasModules = Array.from(badges).some((el) => el.textContent === "module");
	let hasAlc = Array.from(badges).some((el) => el.textContent === "ALC")
	let warnings = document.getElementsByClassName("text-warning");
	let hasWarnings = warnings.length !==0;

	let hasFullClasses = Array.from(warnings).map((item) => item.textContent).some((txt) => txt.includes("leerlingen"));

	if (!hasModules && !hasAlc && !hasWarnings && !hasFullClasses) {
		return;
	}
	if (hasModules) {
		addButton(printButton, TRIM_BUTTON_ID, "Toon trimesters", onClickShowTrimesters, "fa-sitemap");
	}
	if(hasAlc || hasWarnings) {
		addButton(printButton, CHECKS_BUTTON_ID, "Controleer lessen op fouten", onClickCheckResults, "fa-stethoscope");
	}
	if(hasFullClasses) {
		addButton(printButton, FULL_CLASS_BUTTON_ID, "Filter volle klassen", onClickFullClasses, "fa-weight-hanging");
	}
}

function addButton(printButton, buttonId, title, clickFunction, imageId) {
	let button = document.getElementById(buttonId);
	if (button === null) {
		const button = document.createElement("button",);
		button.classList.add("btn", "btn-sm", "btn-outline-secondary", "w-100");
		button.id = buttonId;
		button.style.marginTop = "0";
		button.onclick = clickFunction;
		button.title = title;
		const buttonContent = document.createElement("i");
		button.appendChild(buttonContent);
		buttonContent.classList.add("fas", imageId);
		printButton.insertAdjacentElement("beforebegin", button);
	}
}

const bodyObserver = new MutationObserver(bodyObserverCallback);

const debugDko3 = true;
function db3(message) {
	if (debugDko3) {
		console.log(message);
	}
}

function onClickCheckResults() {
	let lessen = scrapeLessenOverzicht();

	let overzichtDiv = document.getElementById(LESSEN_OVERZICHT_ID);
	let table = document.getElementById("table_lessen_resultaat_tabel");

	let checksDiv = document.createElement("div");
	checksDiv.id = "checksDiv";
	checksDiv.classList.add("badge-warning");

	let checksText = "";
	table.parentNode.insertBefore(checksDiv, table.previousSibling);
	for(let les of lessen) {
		if (les.alc) {
			if(les.visible) {
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
	overzichtDiv.dataset.filterFullClasses = (overzichtDiv.dataset.filterFullClasses?? "false") === "false" ? "true" : "false";
	let displayState = overzichtDiv.dataset.filterFullClasses === "true" ? "none" : "table-row";
	for(let les of lessen) {
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

function setButtonHighlighted(buttonId, show) {
	if (show) {
		document.getElementById(buttonId).classList.add("toggled");
	} else {
		document.getElementById(buttonId).classList.remove("toggled");
	}
}

function isButtonHighlighted(buttonId) {
	return document.getElementById(buttonId).classList.contains("toggled");
}

function showTrimesterTable(show) {
	//Build lazily and only once. Table will automatically be erased when filters are changed.
	if (!document.getElementById(TRIM_TABLE_ID)) {
		let inputModules = scrapeModules();
		let tableData = buildTableData(inputModules);
		buildTrimesterTable(tableData.instruments);
	}

	document.getElementById("table_lessen_resultaat_tabel").style.display = show ? "none" : "table";
	document.getElementById(TRIM_TABLE_ID).style.display = show ? "table" : "none";
	document.getElementById(TRIM_BUTTON_ID).title = show ? "Toon normaal" : "Toon trimesters";
	setButtonHighlighted(TRIM_BUTTON_ID, show);
}

function searchText(text) {
	let input = document.querySelector("#snel_zoeken_veld_zoektermen");
	input.value = text;
	let evUp = new KeyboardEvent("keyup", {key: "Enter", keyCode: 13, bubbles: true});
	input.dispatchEvent(evUp);
}

function findStudentId(studentName, text) {
	console.log(text);
	studentName = studentName.replaceAll(",", "");
	let namePos = text.indexOf(studentName);
	if (namePos < 0) {
		return -1
	}
	//the name comes AFTER the id, hence the backward search of the leftmost slice of the string.
	let idPos = text.substring(0, namePos).lastIndexOf("'id=", namePos);
	let id = text.substring(idPos, idPos+10);
	id = id.match(/\d+/)[0]; //TODO: may fail!
	console.log(id);
	return parseInt(id);
}

async function fetchStudentId(studentName) {
	let studentNameForUrl = studentName.replaceAll(",", "").replaceAll("(", "").replaceAll(")", "");
	return fetch("/view.php?args=zoeken?zoek="+encodeURIComponent(studentNameForUrl))
		.then((response) => response.text())
		.then((text) => fetch("/views/zoeken/index.view.php"))
		.then((response) => response.text())
		.then((text) => findStudentId(studentName, text))
		.catch(err => {
			console.error('Request failed', err)
		});
}