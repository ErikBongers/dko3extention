const debugDko3 = true;

function db3(message) {
    if (debugDko3) {
        console.log(message);
    }
}
window.navigation.addEventListener("navigatesuccess", (event) => {
	db3("navigateSuccess");
	pageListener();
});


window.addEventListener("load", (event) => {
	db3("loaded");
	pageListener();
});

function pageListener() {

    if (window.location.hash === "#lessen-overzicht") {

        db3("In lessen overzicht!");
        setLessenOverzichtObserver();
    } else {
        db3("Niet in lessen overzicht.");
        bodyObserver.disconnect();
    }
}

