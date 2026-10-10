import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const srcDir = fileURLToPath(new URL('./src', import.meta.url))
const contentDir = fileURLToPath(new URL('../content', import.meta.url))

export default defineConfig({
  server: {
    port: 3000,
    proxy: { '/api': { target: process.env.BTD_API_URL ?? 'http://127.0.0.1:8000', changeOrigin: true } },
    fs: { allow: ['.', contentDir] },
  },
  resolve: {
    // Alias explicites : ils s'appliquent aussi aux visuels importés depuis content/.
    alias: { '@': srcDir, '@content': contentDir },
    // Les visuels de content/ importent react et remotion : on les résout toujours depuis frontend/.
    dedupe: ['react', 'react-dom', 'remotion', '@remotion/player'],
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
})
