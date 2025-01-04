import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default [
    // UMD Bundle for Browser/Playwright
    {
        input: 'src/highlight.js',
        output: {
            file: 'dist/probolabs.umd.js',
            format: 'umd',
            name: 'ProboLabs',
            sourcemap: true,
        },
        plugins: [resolve(), commonjs(), terser()],
    },
    // ES Module for Chrome Extension
    {
        input: 'src/index.js',
        output: {
            file: 'dist/probolabs.esm.js',
            format: 'es',
            sourcemap: true,
        },
        plugins: [resolve(), commonjs(), terser()],
    },
];