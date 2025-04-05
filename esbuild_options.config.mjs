import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['typescript/plugin_options/options.ts'],
    bundle: true,
    sourcemap: "linked",
    outfile: 'generated/options.js'
});