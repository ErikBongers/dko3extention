import { defineConfig } from 'rolldown'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/roster_diff/diffSettings.ts",
    output: {
        file: "generated/diffSettings.js",
        format: "iife",
        sourcemap: true,
    }
})