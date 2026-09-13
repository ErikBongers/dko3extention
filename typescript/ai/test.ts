import {Actions, ServiceRequest, TabType} from "../messaging";
import { env, pipeline } from '@huggingface/transformers';
import * as ort from 'onnxruntime-web';
// import * as ort from 'onnxruntime-web/all';

const testEmailText = "Beste planner, ik denk dat Bobby en Emre er vanavond helaas niet bij kunnen zijn. Groeten, familie Janssens.";

export function runAiTest() {
    // Define a test email snippet with mixed Flemish and Turkish names

    console.log("⏳ Sending text to Service Worker for local AI analysis...");

// Send the message across the extension runtime boundary
    let serviceRequest: ServiceRequest<any> = { action: Actions.AnalyzeText, data: testEmailText, senderTabType: TabType.Undefined, targetTabType: TabType.Undefined };
    chrome.runtime.sendMessage(
        serviceRequest,
        (response) => {
            // Check for runtime communication errors
            if (chrome.runtime.lastError) {
                console.error("❌ Communication failed:", chrome.runtime.lastError.message);
                return;
            }

            if (response && response.success) {
                console.log("✅ AI Analysis Success! Extracted Name Entities:");
                console.table(response.entities);

                // Look at the array of words we got back
                const namesFound = response.entities.map((item: any) => item.word);
                console.log("Filtered Names for Fuzzy Matching:", namesFound);
            } else {
                console.error("❌ AI Processing failed:", response?.error || "Unknown error");
            }
        }
    );

}

export function runAiTest2() {
    runAiTest2sub().then(() => {});
}
export async function runAiTest2sub() {

// 1. Force Transformers.js to execute entirely locally
    env.allowRemoteModels = true;
    env.allowLocalModels = false;

// 2. Point the WebAssembly backends to your local folder path
    const extensionRoot = chrome.runtime.getURL('/');
    env.backends.onnx.wasm!.wasmPaths = `${extensionRoot}ai/huggingWasmEngine/`;
    env.localModelPath = `${extensionRoot}ai/models/Xenova_bert-base-NER/`;
    env.localModelPath = `${extensionRoot}ai/models/onnx-community_bert-base-multilingual-cased-ner-hrl-ONNX/`;
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
let res = await handleInference(testEmailText);
console.log(res);
}

// Keep a local reference to the pipeline singleton
let nerPipelineInstance: any = null;

async function getNerPipeline() {
    if (!nerPipelineInstance) {
        // Point directly to your bundled package folder
        nerPipelineInstance = await pipeline(
            'token-classification',
            // 'Xenova/bert-base-NER',
            'onnx-community/bert-base-multilingual-cased-ner-hrl-ONNX',
            {
                // FIX: Force the engine to read "model.onnx" instead of looking for "model_quantized.onnx"
                dtype: 'fp32'
            }
        );
    }
    return nerPipelineInstance;
}

async function handleInference(text: string) {
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
