import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Serve static files (like images) from the "images" folder
  // next to this vite.config.js. They are then available at "/<filename>".
  publicDir: 'images',
})
