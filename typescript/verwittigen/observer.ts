import {HashObserver} from "../pageObserver";

class VerwittigenObserver extends HashObserver {
    constructor() {
        super("#leerlingen-verwittigen", onMutation);
    }
    isPageReallyLoaded(): boolean {
        return document.getElementById("leerlingen_verwittigen_bericht_sjabloon") != null;
    }
}

export default new VerwittigenObserver();

const CHAR_COUNTER = "charCounterClass";
const COUNTER_ID = "charCounter"
function onMutation (_mutation: MutationRecord) {
    // console.log(mutation)
    let txtSms = document.getElementById("leerlingen_verwittigen_bericht_sjabloon");
    if(txtSms && !txtSms?.classList.contains(CHAR_COUNTER)) {
        txtSms.classList.add(CHAR_COUNTER);
        txtSms.addEventListener("input", onSmsChanged);
        let span = document.createElement("span");
        span.id = COUNTER_ID;
        txtSms.parentElement.appendChild(span);
        onSmsChanged(undefined);
    }
    return true;
}

function onSmsChanged(_event: Event) {
    let txtSms = document.getElementById("leerlingen_verwittigen_bericht_sjabloon") as HTMLTextAreaElement;
    let spanCounter: HTMLSpanElement =  document.getElementById(COUNTER_ID);
    spanCounter.textContent = txtSms.value.length.toString();
}
