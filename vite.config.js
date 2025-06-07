import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]'
      }
    },
    copyPublicDir: true,
    // Vercel optimizations
    minify: 'terser',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  },
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    fs: {
      allow: ['..']
    },
    port: 3000,
    strictPort: true,
    host: true
  }
})
