import { Outlet, useNavigate } from 'react-router-dom'
import BottomNav from './BottomNav'
import { Search, Tags, Settings } from 'lucide-react'

export default function AppLayout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen min-h-dvh bg-bg-page text-text-main flex flex-col">
      {/* 顶部栏 */}
      <header className="sticky top-0 z-40 glass border-b border-primary-light/10">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🌙</span>
            <span className="text-sm font-medium text-text-main">曦月笔记</span>
          </div>

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

            {/* 设置 */}
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="p-2 rounded-lg text-text-disabled hover:text-text-secondary hover:bg-bg-card transition-all duration-200"
              title="设置"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="flex-1 pb-20 px-4 pt-4 max-w-2xl mx-auto w-full page-enter">
        <Outlet />
      </main>

      {/* 底部导航栏 */}
      <BottomNav />
    </div>
  )
}
