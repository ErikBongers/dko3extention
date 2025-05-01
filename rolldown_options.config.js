import { defineConfig } from 'rolldown'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/plugin_options/options_page.ts",
    output: {
        file: "generated/options_page.js",
        format: "iife",
        sourcemap: true,
    }
})