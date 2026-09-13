import { defineConfig } from 'rolldown'
import copy from "rollup-plugin-copy";

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
    input:  "./typescript/serviceworker.ts",
    output: {
        file: "generated/serviceworker.js",
        format: "es",
        sourcemap: true,
    },
    tsconfig: "./tsconfig_service.json",
    plugins: [
    copy({
        hook: 'writeBundle', // Forces the copy routine to happen safely after code compilation
        targets: [
            {
                src: './node_modules/onnxruntime-web/dist/*.wasm',
                dest: './ai/huggingWasmEngine'
            },
            {
                src: './node_modules/onnxruntime-web/dist/*.mjs',
                dest: './ai/huggingWasmEngine'
            }
        ]
    })
]
})