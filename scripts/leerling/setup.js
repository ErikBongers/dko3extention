import {db3} from "../globals.js";

const observerCallback = (mutationList /*, observer*/) => {
    for (const mutation of mutationList) {
        if (mutation.type !== "childList") {
            continue;
        }
        // db3(mutation);
        let tabInschrijving = document.getElementById("leerling_inschrijvingen_weergave");
        if (mutation.target !== tabInschrijving) {
            continue;
        }
        onInschrijvingChanged(tabInschrijving);
        break;
    }
};

const bodyObserver  = new MutationObserver(observerCallback);

export function onPageChanged() {
    if (window.location.hash.startsWith("#leerlingen-leerling")) {
        db3("In leerling fiche!");
        setObserver();
    } else {
        db3("Niet in leerling fiche.");
        bodyObserver.disconnect();
    }
}

function setObserver() {
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

function onInschrijvingChanged(tabInschrijving) {
    db3("inschrijving (tab) changed.");
    let moduleButtons = tabInschrijving.querySelectorAll("tr td.right_center > button");
    for(let btn of moduleButtons) {
        let onClick = btn.getAttribute("onclick");
        let tr = btn.parentNode.parentNode;
        onClick = onClick.substring(10, onClick.length- 1);
        let args = onClick
            .split(", ")
            .map((arg) => arg.replaceAll("'", ""));
        getModule(...args)
            .then((modName) => {
                let instrumentText = "";
                if(modName) {
                    let rx = /Initiatie (.*) - trimester.*/;
                    let matches = modName.match(rx);
                    if (matches.length >= 1) {
                        instrumentText = ": " + matches[1];
                    } else {
                        instrumentText = ": ???";
                    }
                }
                let span = document.createElement("span");
                tr.children[0].appendChild(span);
                span.innerText = instrumentText;
            });
    }
}

async function getModule(size,modal,file,args) {
    let folder = modal.split("-").join("/");

    // This call is being skipped: (probably ok)
    // let res = await fetch('views/'+folder+'/'+file+'.modal.php?'+args);
    // let text = await res.text();

    // This call uses the `args` param, although that contains an extra schooljaar paran which is not really needed.
    // > 'inschrijving_vak_id=289840&schooljaar=2024-2025&lesmoment_id=4102'
    // let lesmoment_id = args.substring(args.lastIndexOf("=")+1);
    // let res2 = await fetch("/views/leerlingen/leerling/inschrijvingen/modules_kiezen.modules.div.php?inschrijving_vak_id=289840&lesmoment_id=" + lesmoment_id);
    let res2 = await fetch("/views/leerlingen/leerling/inschrijvingen/modules_kiezen.modules.div.php?"+args);

    let text2 = await res2.text();
    const template = document.createElement('template');
    template.innerHTML = text2;
    let check = template.content.querySelector("i.fa-check-square");
    return check?.parentNode.parentNode.parentNode.querySelector("strong").textContent;
}

