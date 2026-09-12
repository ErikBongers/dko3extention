import { defineConfig } from 'rolldown'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/main.ts",
    external: ["default_items"],
    output: {
        file: "generated/bundle.js",
        format: "iife",
        sourcemap: true,
        globals: {
            "default_items": "default_items"
        }
    }
})