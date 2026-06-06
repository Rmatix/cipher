import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  base: './',
  build: {
    outDir: '../src/renderer-dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000, // raise limit to 1 MB to silence warning
    rollupOptions: {
      output: {
        // Separate vendor libraries into their own chunk
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  }
})

