import { defineConfig } from 'rolldown'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/roster_diff/diffSettingsPage.ts",
    output: {
        file: "generated/diffSettingsPage.js",
        format: "iife",
        sourcemap: true,
    }
})