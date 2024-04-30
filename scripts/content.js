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