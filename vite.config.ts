import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// ── APK 构建模式检测 ──────────────────────────
// VITE_APK=true 时：通过 WebViewAssetLoader 以 https:// 虚拟域名加载
// - base 设为 '/'（虚拟域名的根路径）
// - PWA 可选（HTTPS 下 SW 可用，但本地资源无需缓存）
const isApk = process.env.VITE_APK === 'true'
const base = isApk ? '/' : (process.env.VITE_BASE || '/')

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    // PWA 仅在 Web 构建时启用
    // APK 模式下所有资源已在本地，SW 缓存无实际价值
    ...(isApk ? [] : [
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
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'pages-cache',
                expiration: { maxEntries: 20 },
              },
            },
            {
              urlPattern: /\.(?:js|css)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'assets-cache',
                expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 },
              },
            },
            {
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
    ]),
  ],
})
