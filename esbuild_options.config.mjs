import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['typescript/plugin_options/options_page.ts'],
    bundle: true,
    sourcemap: "linked",
    outfile: 'generated/options_page.js'
});