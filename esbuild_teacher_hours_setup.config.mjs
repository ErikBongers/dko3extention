import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['typescript/teacherHoursSetup.ts'],
    bundle: true,
    sourcemap: "linked",
    outfile: 'generated/teacherHoursSetup.js'
});