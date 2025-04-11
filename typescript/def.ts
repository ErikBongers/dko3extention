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
export const INFO_CONTAINER_ID =  "dp3p_infoContainer";
export const INFO_CACHE_ID =  "dp3p_cacheInfo";
export const INFO_TEMP_ID =  "dp3_tempInfo";
export const INFO_EXTRA_ID =  "dp3_extraInfo";
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
export const LESSEN_TABLE_ID = "table_lessen_resultaat_tabel";
export const FILTER_INFO_ID = "filterInfo";