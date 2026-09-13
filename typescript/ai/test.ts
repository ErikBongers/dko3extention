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
    const extensionRoot = chrome.runtime.getURL('/');
    env.allowLocalModels = false;
    env.backends.onnx.wasm!.wasmPaths = `${extensionRoot}ai/huggingWasmEngine/`;
    env.localModelPath = `${extensionRoot}ai/models/onnx-community_bert-base-multilingual-cased-ner-hrl-ONNX/`;
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
            'onnx-community/bert-base-multilingual-cased-ner-hrl-ONNX',
            {
                // FIX: Force the engine to read "model.onnx" instead of looking for "model_quantized.onnx"
                dtype: 'fp32',
                device: 'webgpu'
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

let worker: Worker | null = null;

function onMessage(event: any) {
    const { status, output } = event.data
    if (status === 'complete') {
        console.log(output);
    }
}

export async function runAiTestInWorker() {
    if(!worker)
        throw new Error("Worker not initialized");
    worker.postMessage({ text: testEmailText });
}

export async function doInitWorker() {
    worker = await initWorker(onMessage);
}

async function initWorker(onMessage: (event: MessageEvent) => void): Promise<Worker> {
    if(worker)
        return worker;
    try {
        const extensionWorkerUrl = chrome.runtime.getURL('generated/aiworker.js');

        const response = await fetch(extensionWorkerUrl);
        const workerCode = await response.text();

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        console.log("Creating worker for code URL:", blobUrl);
        const aiWorker = new Worker(blobUrl, { type: 'module' });
        aiWorker.onmessage = onMessage;

        const extensionRoot = chrome.runtime.getURL('/');
        aiWorker.postMessage({ type: 'INIT_PATH', path: extensionRoot });

        worker = aiWorker;
        return aiWorker;

    } catch (error) {
        console.error("Worker initialization failed:", error);
        throw error;
    }
}
