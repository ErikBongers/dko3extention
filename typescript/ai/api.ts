import { initWorker } from "./core";
import {FindNamesInText, GetNames, WorkerRequest} from "./types";

export let ai = {
    getNames,
    findNames,
}

export function onMessage(event: MessageEvent<WorkerRequest>) {
    const { status} = event.data
    if (status != 'complete') {
        console.log("Result from AI worker, not complete: ", event.data);
        return;
    }
    if(event.data.type === "getNames") {
        onResultMap["getNames"]?.(event.data);
    }
}

type RequestDataFor<T extends WorkerRequest['type']> =
    Extract<WorkerRequest, { type: T }>;

type HandlerMap = {
    [K in WorkerRequest['type']]: (data: RequestDataFor<K>) => void | Promise<void>;
};

let onResultMap: HandlerMap = {
    getNames: (names) => console.log("AI list of names: ", names),
    initPath: (data) => console.log("AI init path: ", data),
    findNames: (data) => console.log("AI find names: ", data),
};

async function getNames(wordList: string[], onResult: (data: GetNames) => void) {
    onResultMap["getNames"] = onResult;
    await sendRequest("getNames", wordList);
}

async function findNames(text: string, onResult: (data: FindNamesInText) => void) {
    onResultMap["findNames"] = onResult;
    await sendRequest("findNames", text);
}

async function sendRequest<T extends WorkerRequest['type']>(type: T, data: RequestDataFor<T>['data']) {
    (await initWorker(onMessage)).postMessage({ status: "sending", type, data} satisfies {status: string, type: T, data: RequestDataFor<T>['data']});
}