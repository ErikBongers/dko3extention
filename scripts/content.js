const debugDko3 = true;

function db3(message) {
    if (debugDko3) {
        console.log(message);
    }
}


(async () => {
    db3("setting up controller");
    const src = chrome.runtime.getURL('scripts/main.js');
    const mainScript = await import(src);

    window.navigation.addEventListener("navigatesuccess", (event) => {
        db3("navigateSuccess");
        pageListener();
    });

    window.addEventListener("load", (event) => {
        db3("loaded");
        pageListener();
    });

    function pageListener() {
        mainScript.onPageChanged();

        let footer = document.querySelector("body > main > div.row > div.col-auto.mr-auto > small");
        const reInstrument = /.*Je bent aangemeld als (.*)\s@\s(.*)\./;
        const match =  footer.textContent.match(reInstrument);
        if (match?.length !== 3) {
            console.log(`Could not process footer text "${footer.textContent}"`);
            return;
        }
        let userName = match[1];
        let schoolName = match[2];
        db3("user:" + userName);
        db3("school:" + schoolName);
        if (schoolName !== "Academie Berchem (Muziek-Woord)") {
            document.body.classList.add("otherSchool");
        } else {
            document.body.classList.remove("otherSchool");
        }

    }

    pageListener();

})();



