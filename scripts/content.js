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
		let lessenOverzicht = document.getElementById("lessen_overzicht");
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
		addTrimesterButton(printButton);
	}
	if(hasAlc || hasWarnings) {
		addChecksButton(printButton);
	}
	if(hasFullClasses) {
		addFullClassesButton(printButton);
	}
}

function addTrimesterButton(printButton) {
	let buttonId = "moduleButton";
	let title = "Toon trimesters";
	let clickFunction = showModules;
	let imageId = "fa-sitemap";
	addButton(buttonId, clickFunction, title, imageId, printButton);
}

function addChecksButton(printButton) {
	let buttonId = "checksButton";
	let title = "Controleer lessen op fouten";
	let clickFunction = showCheckResults;
	let imageId = "fa-stethoscope";
	addButton(buttonId, clickFunction, title, imageId, printButton);
}

function addFullClassesButton(printButton) {
	let buttonId = "fullClassButton";
	let title = "Filter volle klassen";
	let clickFunction = showFullClasses;
	let imageId = "fa-weight-hanging";
	addButton(buttonId, clickFunction, title, imageId, printButton);
}

function addButton(buttonId, clickFunction, title, imageId, printButton) {
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

function showCheckResults() {
	let lessen = scrapeLessenOverzicht();

	let overzichtDiv = document.getElementById("lessen_overzicht");
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

function showFullClasses() {
	let lessen = scrapeLessenOverzicht();
	let overzichtDiv = document.getElementById("lessen_overzicht");
	overzichtDiv.dataset.showFullClasses = (overzichtDiv.dataset.showFullClasses?? "table-row") === "none" ? "table-row" : "none";
	for(let les of lessen) {
		if (les.aantal < les.maxAantal) {
			les.tableRow.style.display = overzichtDiv.dataset.showFullClasses;
		}
	}
}

function showModules() {
	showOriginalTable(document.getElementById("table_lessen_resultaat_tabel").style.display === "none");
}

function showOriginalTable(show) {
	//Build lazily and only once. Table will automatically be erased when filters are changed.
	if (!document.getElementById("trimesterTable")) {
		let inputModules = scrapeModules();
		let tableData = buildTableData(inputModules);
		buildTrimesterTable(tableData.instruments);
	}

	document.getElementById("table_lessen_resultaat_tabel").style.display = show ? "table" : "none";
	document.getElementById("trimesterTable").style.display = show ? "none" : "table";
	document.getElementById("moduleButton").title = show ? "Toon trimesters": "Toon normaal";

	if(show) {
		document.getElementById("moduleButton").classList.remove("toggled");
	} else {
		document.getElementById("moduleButton").classList.add("toggled");
	}
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