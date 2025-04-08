export let COPY_AGAIN = "copy_again";
export let PROGRESS_BAR_ID = "progressBarFetch";
export let UREN_PREV_BTN_ID = "prefillInstrButton";
export let UREN_NEXT_BTN_ID = "prefillInstrButtonNext";
export let MAIL_BTN_ID = "mailButton";
export let DOWNLOAD_TABLE_BTN_ID = "downloadTableButton";
export let COPY_TABLE_BTN_ID = "copyTableButton";
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
export const TEMP_MSG_ID =  "dko3plugin_tempMessage";
export const INFO_MSG_ID =  "dko3plugin_infoMessage";
export const AANW_LIST =  "aanwezighedenList";
export const GLOBAL_SETTINGS_FILENAME =  "global_settings.json";

export function isButtonHighlighted(buttonId: string) {
    return document.getElementById(buttonId)?.classList.contains("toggled");
}

export const CACHE_DATE_SUFFIX = "__date";
export const POWER_QUERY_ID = "savedPowerQuery";
export const STORAGE_GOTO_STATE_KEY = "gotoState";
export const STORAGE_PAGE_STATE_KEY_PREFIX = "pageState_";
export const UREN_TABLE_STATE_NAME = "__uren__";
export const CAN_HAVE_MENU = "canHaveMenu";
export const CAN_SORT = "canSort";