import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['typescript/blank.ts'],
    bundle: true,
    sourcemap: "linked",
    outfile: 'generated/blank.js'
});