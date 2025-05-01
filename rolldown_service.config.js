import { defineConfig } from 'rolldown'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/serviceworker.ts",
    output: {
        file: "generated/serviceworker.js",
        format: "iife",
        sourcemap: true,
    }
})