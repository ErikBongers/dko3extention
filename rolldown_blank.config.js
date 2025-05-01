import { defineConfig } from 'rolldown'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/blank.ts",
    output: {
        file: "generated/blank.js",
        format: "iife",
        sourcemap: true,
    }
})