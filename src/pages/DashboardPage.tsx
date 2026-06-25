import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Settings, RefreshCw } from 'lucide-react'
import { useXizhu } from '../hooks/useXizhu'
import XizhuCard from '../components/xizhu/XizhuCard'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { xizhuNotes, loading, refresh } = useXizhu()

  return (
    <div className="page-enter">
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text-main flex items-center gap-2">
          <LayoutDashboard size={22} className="text-primary-light" />
          曦筑
        </h1>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={refresh}
            className="p-2 rounded-lg text-text-disabled hover:text-text-secondary transition-all duration-200"
            title="刷新"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg text-text-disabled hover:text-text-secondary transition-all duration-200"
            title="智能曦筑设置"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* 说明 */}
      <p className="text-xs text-text-secondary mb-4">
        集中展示手动曦筑 + 智能曦筑标签匹配的笔记。
        在笔记编辑页点击 <span className="text-primary-light">📌 图标</span> 可手动曦筑，
        在 <button
          type="button"
          onClick={() => navigate('/settings')}
          className="text-primary-light underline hover:text-primary-light/80"
        >设置页</button> 可配置智能曦筑标签规则。
      </p>

      {/* 统计 */}
      {!loading && (
        <div className="flex gap-3 mb-4">
          <div className="flex-1 glass rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-primary-light">
              {xizhuNotes.filter(n => n.source === 'manual' || n.source === 'both').length}
            </div>
            <div className="text-[10px] text-text-disabled">手动曦筑</div>
          </div>
          <div className="flex-1 glass rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-primary-light">
              {xizhuNotes.filter(n => n.source === 'smart' || n.source === 'both').length}
            </div>
            <div className="text-[10px] text-text-disabled">智能曦筑</div>
          </div>
          <div className="flex-1 glass rounded-xl p-3 text-center">
            <div className="text-lg font-bold text-primary-light">
              {xizhuNotes.length}
            </div>
            <div className="text-[10px] text-text-disabled">合计</div>
          </div>
        </div>
      )}

      {/* 曦筑卡片列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
        </div>
      ) : xizhuNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">🏠</div>
          <p className="text-text-disabled text-sm">暂无曦筑笔记</p>
          <p className="text-text-disabled text-xs mt-1">
            在笔记编辑页点击 📌 图标可手动曦筑，或前往设置页配置智能曦筑规则
          </p>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/20 border border-primary-light/30
              text-primary-light text-sm font-medium
              hover:bg-primary/30 hover:shadow-[0_0_12px_rgba(124,58,237,0.3)]
              active:scale-[0.98] transition-all duration-200"
          >
            <Settings size={16} />
            配置智能曦筑
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {xizhuNotes.map(xn => (
            <XizhuCard
              key={xn.note.id}
              xizhuNote={xn}
              onUpdate={refresh}
            />
          ))}
        </div>
      )}
    </div>
  )
}
