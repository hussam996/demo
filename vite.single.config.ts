import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// builds the whole game into one self-contained HTML file (dist-single/index.html)
// used for sandboxed hosting (e.g. claude.ai Artifacts) where external requests are blocked
export default defineConfig({
  base: './',
  define: {
    __FORCE_WEBGL__: 'true',
  },
  plugins: [viteSingleFile()],
  build: {
    target: 'es2022',
    outDir: 'dist-single',
    chunkSizeWarningLimit: 40960,
    // inline the CC0 GLB models as data URIs — a sandboxed host cannot fetch
    // sibling files, so the single-file build must carry them inside the HTML
    assetsInlineLimit: 24 * 1024 * 1024,
  },
});
