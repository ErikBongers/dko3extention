import { env, pipeline } from '@huggingface/transformers';

async function runAiTest2sub(text: string) {
    if(!extensionRoot){
        return "Oops: Extension root not set";
    }

    env.allowLocalModels = false;
    env.backends.onnx.wasm!.wasmPaths = `${extensionRoot}ai/huggingWasmEngine/`;
    env.localModelPath = `${extensionRoot}ai/models/onnx-community_bert-base-multilingual-cased-ner-hrl-ONNX/`;
    let res = await handleInference(text);
    console.log(res);
    return res;
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

self.onmessage = async (event) => {
    if (event.data.type === 'INIT_PATH') {
        extensionRoot = event.data.path;
        env.backends.onnx.wasm!.wasmPaths = `${extensionRoot}ai/huggingWasmEngine/`;
        console.log("Worker localized successfully!");
        return;
    }
    const result = await runAiTest2sub(event.data.text);
    console.log("Worker:", result);
    self.postMessage({ status: 'complete', output: JSON.stringify(result) });
}

let extensionRoot = '';
