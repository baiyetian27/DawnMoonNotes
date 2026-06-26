import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages 部署时通过 VITE_BASE 环境变量设置子路径
const base = process.env.VITE_BASE || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [`${base}favicon.svg`],
      manifest: {
        name: '曦月笔记',
        short_name: '曦月',
        description: '深色科技风个人笔记应用',
        theme_color: '#0F0F1A',
        background_color: '#0F0F1A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: `${base}pwa-192.svg`, sizes: '192x192', type: 'image/svg+xml' },
          { src: `${base}pwa-512.svg`, sizes: '512x512', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // 本地数据由 IndexedDB 管理，无远程存储缓存需求
        runtimeCaching: [
          {
            // 导航请求：网络优先，离线回退到缓存
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: { maxEntries: 20 },
            },
          },
          {
            // JS/CSS 静态资源：缓存优先
            urlPattern: /\.(?:js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            // 图片/字体：缓存优先，长期缓存
            urlPattern: /\.(?:svg|png|ico|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
})
