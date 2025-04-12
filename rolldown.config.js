import { defineConfig } from 'rolldown'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/main.ts",
    output: {
        file: "generated/bundle.js",
        format: "iife",
        sourcemap: true,
    }
})