import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

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
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
