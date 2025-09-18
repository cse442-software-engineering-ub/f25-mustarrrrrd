import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/CSE442/2025-Fall/cse-442ai/app/',
  plugins: [react()],
})
