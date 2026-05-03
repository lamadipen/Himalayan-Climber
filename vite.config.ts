// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target:    'es2020',
    outDir:    'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Split vendor chunks for better caching
        manualChunks: {
          phaser:   ['phaser'],
          three:    ['three'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],  // WASM — must not be pre-bundled
  },
  server: {
    port: 5173,
    open: true,
  },
})
