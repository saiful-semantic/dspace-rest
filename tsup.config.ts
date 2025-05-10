import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/cli/index.ts'],
    dts: true,
    format: ['esm', 'cjs'],
    outDir: 'dist',
    splitting: false,
    sourcemap: true,
    minify: true,
    clean: true
  }
])
