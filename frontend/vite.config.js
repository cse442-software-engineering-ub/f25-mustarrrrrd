import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

//for local: VITE_BASE=/f25-mustarrrrrd/app/ npm run build
const base = process.env.VITE_BASE || '/CSE442/2025-Fall/cse-442ai/auto_oh/'
export default defineConfig({
  base,
  build: {
    outDir: '../app',   // put the build straight into repo-root/app
    emptyOutDir: true,  // clear old files first
  },
  plugins: [react()],
})
