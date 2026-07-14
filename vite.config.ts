import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:18080'

  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router/') ||
            id.includes('/react-router-dom/') ||
            id.includes('/scheduler/') ||
            id.includes('/history/')
          ) {
            return 'vendor-react'
          }

          if (
            id.includes('/antd/') ||
            id.includes('/@ant-design/icons/') ||
            id.includes('/@rc-component/') ||
            id.includes('/rc-') ||
            id.includes('/@emotion/') ||
            id.includes('/classnames/')
          ) {
            return 'vendor-antd'
          }

          if (
            id.includes('/html2canvas/') ||
            id.includes('/lodash/') ||
            id.includes('/lodash-es/')
          ) {
            return 'vendor-visual'
          }

          if (
            id.includes('/@tanstack/react-query/') ||
            id.includes('/@tanstack/react-query-devtools/') ||
            id.includes('/axios/')
          ) {
            return 'vendor-data'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
  }
})
