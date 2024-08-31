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
export const CACHE_INFO_ID =  "dko3plugin_cacheInfo";

export function isButtonHighlighted(buttonId: string) {
    return document.getElementById(buttonId)?.classList.contains("toggled");
}

export const CACHE_DATE_SUFFIX = "__date";
export const POWER_QUERY_ID = "savedPowerQuery";
export const STORAGE_PAGE_STATE_KEY = "pageState";
export const WERKLIJST_TABLE_NAME_PROP = "werklijstTableName";
export const UREN_TELLER = "urenTeller";
export const UREN_TABLE_STATE_NAME = "__uren__";