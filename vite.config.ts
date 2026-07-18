import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/proteomics-power-calc/',
  build: {
    // Split the two large third-party libraries into their own cacheable chunks
    // so vendor code is cached across deploys and the main app bundle stays
    // smaller. (React stays in the main graph; carving it out produced an empty
    // chunk under the react plugin.)
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          katex: ['katex'],
        },
      },
    },
  },
})
