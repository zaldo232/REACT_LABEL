import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 서비스 워커 자동 갱신 설정
      includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000, 
      },
      manifest: {
        name: 'TNTECH 차량 배차 관리 시스템',
        short_name: '배차관리',
        description: 'TNTECH 차량 배차 및 점검 관리 시스템',
        theme_color: '#1976d2',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        icons: [
          {
            src: 'logo192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // 로컬에서
        //target: 'http://127.0.0.1:19999', //로컬에서 서버 붙을때
        changeOrigin: true,
        secure: false,
      }
    }
  }
})