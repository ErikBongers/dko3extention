import { pipeline } from '@huggingface/transformers';
import path from 'path';

const modelName = process.argv[2];

const cleanFolderName = modelName.replace(/\//g, '_');
const outDir = path.join(process.cwd(), 'aiModels', cleanFolderName);

console.log(`Downloading model ${modelName} to local assets...`);
await pipeline('token-classification', modelName, {
    cache_dir: outDir
});
console.log('Model successfully saved locally!');
