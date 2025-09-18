import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/CSE442/2025-Fall/cse-442ai/app/',
  build: {
    outDir: '../app',   // put the build straight into repo-root/app
    emptyOutDir: true,  // clear old files first
  },
  plugins: [react()],
})
