import { defineConfig } from 'rolldown'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/main.ts",
    // external: ["defaultQueryItems"],
    output: {
        file: "generated/bundle.js",
        format: "iife",
        sourcemap: true,
    }
})