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
				let moduleButton = document.getElementById("moduleButton");
				if (moduleButton === null) {
					/*
					* <button class="btn btn-sm btn-primary w-100 mt-3" id="btn_lessen_overzicht_zoeken"><i class="fas fa-search"></i> Lessen zoeken</button>
					* */
					db3("adding button");
					const trimButton = document.createElement("button", );
					trimButton.classList.add("btn", "btn-sm", "btn-outline-secondary", "w-100");
					trimButton.id = "moduleButton";
					trimButton.textContent = "Toon trimesters";
					trimButton.style.marginTop = "0";
					trimButton.onclick = listIt;
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

function listIt() {
	let table = document.getElementById("table_lessen_resultaat_tabel");
	let body = table.tBodies[0];
	for (const row of body.rows) {
		let lesInfo = row.cells[0];
		let studentList = row.cells[1];
		let vakStrong = lesInfo.firstChild;

		let les = {};
		les.vakNaam = vakStrong.textContent;
		les.lesNaam = lesInfo.children[1].textContent;
		let badges = lesInfo.getElementsByClassName("badge");
		les.module = Array.from(badges).some((el) => el.textContent === "module");
		let mutedSpans = lesInfo.getElementsByClassName("text-muted");
		if (mutedSpans.length > 0) {
			les.teacher = Array.from(mutedSpans).pop().textContent;
		}
		db3(les);
	}

}