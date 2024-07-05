export let PROGRESS_BAR_ID = "progressBarFetch";
export let PREFILL_INSTR_BTN_ID = "prefillInstrButton";
export let MAIL_BTN_ID = "mailButton";
export let DOWNLOAD_TABLE_BTN_ID = "downloadTableButton";
export const LESSEN_OVERZICHT_ID = "lessen_overzicht";
export const TRIM_BUTTON_ID = "moduleButton";
export const CHECKS_BUTTON_ID = "checksButton";
export const COUNT_BUTTON_ID = "fetchAllButton";
export const FULL_CLASS_BUTTON_ID = "fullClassButton";
export const TRIM_TABLE_ID = "trimesterTable";
export const COUNT_TABLE_ID = "werklijst_uren";
export const TRIM_DIV_ID = "trimesterDiv";
export const JSON_URL = "https://europe-west1-ebo-tain.cloudfunctions.net/json";
export function isButtonHighlighted(buttonId) {
    return document.getElementById(buttonId)?.classList.contains("toggled");
}
//# sourceMappingURL=def.js.map