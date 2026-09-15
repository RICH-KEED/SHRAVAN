import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err.code)) {
              return // Suppress expected socket resets on navigation/refresh
            }
            console.warn('[vite proxy error]:', err.message)
          })
          proxy.on('proxyReqWs', (_proxyReq, _req, socket) => {
            socket.on('error', (err) => {
              if (['ECONNABORTED', 'ECONNRESET', 'EPIPE'].includes(err.code)) {
                return
              }
              console.warn('[vite ws socket error]:', err.message)
            })
          })
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          echarts: ['echarts', 'echarts-for-react'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
