import { defineConfig } from 'rolldown'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/teacherHoursSetup.ts",
    output: {
        file: "generated/teacherHoursSetup.js",
        format: "iife",
        sourcemap: true,
    }
})