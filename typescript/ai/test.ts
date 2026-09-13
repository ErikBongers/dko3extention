const testEmailText = "Beste planner, ik denk dat Bobby en Emre er vanavond helaas niet bij kunnen zijn. Groeten, familie Janssens. Ter info, wij gebruiker Microsoft Outlook, wonen in Belgie en Nederland en gaan op vakantie in Kalmthout.";
// const testEmailText = "Beste planner, ik denk dat bobby en emre er vanavond helaas niet bij kunnen zijn. Groeten, familie janssens. Ter info, wij gebruiker Microsoft Outlook, wonen in Belgie en Nederland en gaan op vakantie in Kalmthout.";

let worker: Worker | Promise<Worker> | null = null;

function onMessage(event: any) {
    const { status, output } = event.data
    if (status === 'complete') {
        console.log("Result from AI worker: ", output);
    }
}

export async function runAiTestInWorker() {
    (await initWorker(onMessage)).postMessage({ text: testEmailText });
}

export async function findPersonsInWorker(wordList: string[]) {
    (await initWorker(onMessage)).postMessage({ type: "extractNames", wordList });
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
