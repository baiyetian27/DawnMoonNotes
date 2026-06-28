import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import { Search, Tags, Settings, ArrowLeft } from 'lucide-react'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const isSettingsPage = location.pathname === '/settings'
  const isNoteEditor = location.pathname.startsWith('/note')
  const showBottomNav = !isSettingsPage

  return (
    <div
      className="min-h-screen min-h-dvh bg-bg-page text-text-main flex flex-col"
      style={{ paddingTop: 'var(--status-safe, 0px)' }}
    >
      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 glass border-b border-primary-light/10">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          {/* 左侧：设置页显示返回按钮，其他页显示 Logo */}
          {isSettingsPage ? (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-main hover:bg-bg-card transition-all duration-200"
              title="返回"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">返回</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-lg">🌙</span>
              <span className="text-sm font-medium text-text-main">曦月笔记</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            {/* 搜索 */}
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="p-2 rounded-lg text-text-disabled hover:text-text-secondary hover:bg-bg-card transition-all duration-200"
              title="搜索"
            >
              <Search size={18} />
            </button>

            {/* 标签 */}
            <button
              type="button"
              onClick={() => navigate('/tags')}
              className="p-2 rounded-lg text-text-disabled hover:text-text-secondary hover:bg-bg-card transition-all duration-200"
              title="标签管理"
            >
              <Tags size={18} />
            </button>

            {/* 设置 — 在设置页和笔记编辑页隐藏 */}
            {!isSettingsPage && !isNoteEditor && (
              <button
                type="button"
                onClick={() => navigate('/settings')}
                className="p-2 rounded-lg text-text-disabled hover:text-text-secondary hover:bg-bg-card transition-all duration-200"
                title="设置"
              >
                <Settings size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主内容区 — 无底部导航时不保留底部间距 */}
      <main className={`flex-1 px-4 pt-4 max-w-2xl mx-auto w-full page-enter ${showBottomNav ? 'pb-20 pb-safe' : ''}`}>
        <Outlet />
      </main>

      {/* 底部导航栏 — 设置页隐藏 */}
      {showBottomNav && <BottomNav />}
    </div>
  )
}
