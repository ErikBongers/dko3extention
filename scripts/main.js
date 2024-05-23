//to avoid "unused function" errors in linters, this file is called as a module.
import * as lessen from "./lessen/setup.js";

export function onPageChanged() {
    lessen.onPageChanged();
}