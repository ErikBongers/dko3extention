export const LESSEN_OVERZICHT_ID = "lessen_overzicht";
export const TRIM_BUTTON_ID = "moduleButton";
export const CHECKS_BUTTON_ID = "checksButton";
export const FETCH_ALL_BUTTON_ID = "fetchAllButton";
export const FULL_CLASS_BUTTON_ID = "fullClassButton";
export const TRIM_TABLE_ID = "trimesterTable";
export const TRIM_DIV_ID = "trimesterDiv";

export function isButtonHighlighted(buttonId) {
    return document.getElementById(buttonId)?.classList.contains("toggled");
}

