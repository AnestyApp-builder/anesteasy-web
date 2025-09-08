import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true, // Permite acesso externo
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-avatar', '@radix-ui/react-dropdown-menu', '@radix-ui/react-progress', '@radix-ui/react-select', '@radix-ui/react-separator', '@radix-ui/react-slot', '@radix-ui/react-tabs'],
          charts: ['recharts'],
          motion: ['framer-motion']
        }
      }
    }
  },
  preview: {
    port: 3000,
    host: true
  }
})
