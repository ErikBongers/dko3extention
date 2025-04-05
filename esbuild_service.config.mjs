import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['typescript/serviceworker.ts'],
    bundle: true,
    sourcemap: "linked",
    outfile: 'generated/serviceworker.js'
});