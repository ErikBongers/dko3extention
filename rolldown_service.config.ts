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
                // Use a bracket wildcard to copy only the matching .wasm and .mjs files
                src: [
                    './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.{mjs,wasm}',
                    './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.asyncify.{mjs,wasm}'
                ],
                dest: './ai/huggingWasmEngine'
            }
        ]
    })
]
})