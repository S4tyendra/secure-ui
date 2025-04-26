import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    https: {
      key: path.resolve(__dirname, './ssl/localhost-key.pem'),
      cert: path.resolve(__dirname, './ssl/localhost-cert.pem'),
      minVersion: 'TLSv1.2',
      ciphers: 'HIGH:!aNULL:!MD5',
    },
  },
  build: {
    outDir: '../dist',
    chunkSizeWarningLimit: 600,
  }
})
