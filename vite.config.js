import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 讓建置後的資源用相對路徑，GitHub Pages 子路徑（/repo名/）才讀得到
export default defineConfig({
  base: './',
  plugins: [react()],
})
