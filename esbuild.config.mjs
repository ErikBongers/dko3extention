import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['typescript/main.ts'],
    bundle: true,
    sourcemap: "linked",
    outfile: 'scripts/ts/bundle.js'
});