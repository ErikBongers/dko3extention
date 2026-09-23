import { env, pipeline } from '@huggingface/transformers';
import {FindNamesInText, GetNames, WorkerRequest} from "./types";

import {unreachable} from "../unreachable";

async function runAiAndFilterPersons(text: string): Promise<string[]> {
    if(!extensionRoot){
        throw "Oops: Extension root not set";
    }

    env.allowLocalModels = false;
    let res = await handleInference(text);
    console.log(res);
    return res.entities.map((entity: any) => entity.word);
}

// Keep a local reference to the pipeline singleton
let nerPipelineInstance: any = null;

async function getNerPipeline() {
    if (!nerPipelineInstance) {
        // Point directly to your bundled package folder
        nerPipelineInstance = await pipeline(
            'token-classification',
            'onnx-community/bert-base-multilingual-cased-ner-hrl-ONNX', //works but only for capitalized names.
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
        const results = await classifier(text, {
            aggregation_strategy: 'simple'
        });
        console.log("Worker received results:", results);

        // Filter the array to return only extracted entities tagged as a Person (PER)
        return {
            success: true,
            entities: results.filter((item: any) => item.entity_group?.includes('PER') || item.entity?.includes('PER'))
        };
    } catch (error) {
        return { success: false, error: (error as Error).message };
    }
}

async function getNames(data: GetNames) {
    let names = await runAiAndFilterPersons(data.data.join(', '));
    names = names.map(name => name.replace(" - ", "-"));
    console.log(names);
    let result: GetNames = {
        ...data,
        output: names,
        status: 'complete'
    };
    self.postMessage(result); //todo: send return value in onmessage instead of posting it?
}

async function findNames(data: FindNamesInText) {
    let names = await runAiAndFilterPersons(data.data);
    names = names.map(name => name.replace(" - ", "-"));
    console.log(names);
    let result: FindNamesInText = {
        ...data,
        output: names,
        status: 'complete'
    };
    self.postMessage(result); //todo: send return value in onmessage instead of posting it?
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
    switch (event.data.type) {
        case "initPath":
            extensionRoot = event.data.data;
            console.log("extensionRoot:", extensionRoot);
            env.backends.onnx.wasm!.wasmPaths = `${extensionRoot}ai/huggingWasmEngine/`;
            console.log("Worker localized successfully!");
            return;
        case "getNames":
            await getNames(event.data);
            return;
        case "findNames":
            await findNames(event.data);
            return;
        default:
            unreachable(event.data)
    }
}

let extensionRoot = '';
