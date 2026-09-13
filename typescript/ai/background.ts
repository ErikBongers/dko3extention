import { env, pipeline } from '@huggingface/transformers';
import * as ort from 'onnxruntime-web';
// import * as ort from 'onnxruntime-web/all';

// 1. Force Transformers.js to execute entirely locally
env.allowRemoteModels = true;
env.allowLocalModels = false;

// 2. Point the WebAssembly backends to your local folder path
const extensionRoot = chrome.runtime.getURL('/');
env.backends.onnx.wasm!.wasmPaths = `${extensionRoot}ai/huggingWasmEngine/`;
env.localModelPath = `${extensionRoot}ai/models/Xenova_bert-base-NER/`;
console.log(env.backends.onnx.wasm!.wasmPaths);
// =========================================================================
// ❌ FIX THE SERVICE WORKER IMPORT BUG:
// Force the ONNX runtime engine to run purely inside the main thread
// so it never fires a disallowed import() command.
// =========================================================================
env.backends.onnx.wasm!.numThreads = 1;
env.backends.onnx.wasm!.proxy = false;
// =========================================================================
// =========================================================================
// ❌ THE HARD OVERRIDE FOR MANIFEST V3 SERVICE WORKERS:
// Apply configuration directly to the 'ort.env' engine to ensure
// execution parameters lock before Transformers.js accesses the layer.
// =========================================================================
ort.env.wasm.numThreads = 1;  // Single-core execution prevents worker module injection
ort.env.wasm.proxy = false;   // Disabling the proxy halts the forbidden dynamic import() call
// =========================================================================
ort.env.wasm.numThreads = 1; // Service workers cannot spawn multi-threaded Workers
ort.env.wasm.proxy = false;  // Disables the background thread script loader

// Keep a local reference to the pipeline singleton
let nerPipelineInstance: any = null;

async function getNerPipeline() {
    if (!nerPipelineInstance) {
        // Point directly to your bundled package folder
        nerPipelineInstance = await pipeline(
            'token-classification',
            'Xenova/bert-base-NER',
            {
                // FIX: Force the engine to read "model.onnx" instead of looking for "model_quantized.onnx"
                dtype: 'fp32'
            }
        );
    }
    return nerPipelineInstance;
}

export async function handleInference(text: string) {
    try {
        const classifier = await getNerPipeline();
        const results = await classifier(text);

        // Filter the array to return only extracted entities tagged as a Person (PER)
        return {
            success: true,
            entities: results.filter((item: any) => item.entity.includes('PER'))
        };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}
