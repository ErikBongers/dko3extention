import {WorkerRequest} from "./types";

let worker: Worker | Promise<Worker> | null = null;

export async function initWorker(onMessage: (event: MessageEvent) => void): Promise<Worker> {
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
        aiWorker.postMessage({ type: 'initPath', data: extensionRoot, status: "sending" } satisfies WorkerRequest);

        worker = aiWorker;
        return aiWorker;

    } catch (error) {
        console.error("Worker initialization failed:", error);
        throw error;
    }
}
