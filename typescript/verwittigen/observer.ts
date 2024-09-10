import {HashObserver} from "../pageObserver.js";

export default new HashObserver("#leerlingen-verwittigen", onMutation);

const CHAR_COUNTER = "charCounterClass";
const COUNTER_ID = "charCounter"
function onMutation (mutation: MutationRecord) {
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

function onSmsChanged(event: Event) {
    let txtSms = document.getElementById("leerlingen_verwittigen_bericht_sjabloon") as HTMLTextAreaElement;
    let spanCounter: HTMLSpanElement =  document.getElementById(COUNTER_ID);
    spanCounter.textContent = txtSms.value.length.toString();
}
