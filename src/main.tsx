import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'

// ── 请求永久存储权限 ──────────────────────────
// 防止浏览器在存储压力下自动清理 IndexedDB 数据
// PWA 安装后 Chrome 自动授予，iOS Safari 需用户交互
if ('storage' in navigator && 'persist' in navigator.storage) {
  navigator.storage.persist().then(granted => {
    if (granted) {
      console.log('✅ 存储已持久化保护，数据不会被自动清理')
    } else {
      console.warn('⚠️ 存储未持久化，建议安装 PWA 以获得自动保护')
    }
  }).catch((err) => {
    console.warn('⚠️ 存储持久化请求失败:', err)
  })
}

// ── Router selection ───────────────────────────
// APK uses file:///android_asset/ which has null origin → HashRouter required
// (HTML5 History API is blocked on opaque origins)
// Web uses BrowserRouter with real HTTPS origin
const isApk = import.meta.env.VITE_APK === 'true'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isApk ? (
        <HashRouter>
          <App />
        </HashRouter>
      ) : (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      )}
    </ErrorBoundary>
  </StrictMode>,
)
