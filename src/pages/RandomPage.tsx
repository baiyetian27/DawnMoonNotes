import { useState, useEffect } from 'react'
import { listNotes } from '../services/notes'
import { listTags } from '../services/tags'
import { getTagColorHex } from '../services/tags'
import RandomWalk from '../components/random/RandomWalk'

export default function RandomPage() {
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)
  const [trigger, setTrigger] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [tagCache, setTagCache] = useState<
    { id: number; name: string; color: string }[]
  >([])

  // ── 加载标签列表 ───────────────────────

  useEffect(() => {
    let cancelled = false
    listTags().then(tags => {
      if (cancelled) return
      setTagCache(tags.map(t => ({ id: t.id!, name: t.name, color: t.color })))
    })
    return () => { cancelled = true }
  }, [])

  // ── 加载笔记总数 ───────────────────────

  useEffect(() => {
    let cancelled = false
    listNotes(selectedTagId ? { tagId: selectedTagId } : undefined).then(
      notes => {
        if (!cancelled) setTotalCount(notes.length)
      },
    )
    return () => { cancelled = true }
  }, [selectedTagId])

  // ── 标签筛选 ─────────────────────────────

  function selectTag(id: number | null) {
    setSelectedTagId(id)
    setTrigger(t => t + 1) // 触发重新随机
  }

  // ── 强制重新随机 ───────────────────────

  function reroll() {
    setTrigger(t => t + 1)
  }

  // ═══════════════════════════════════════════════
  //  渲染
  // ═══════════════════════════════════════════════

  return (
    <div className="page-enter flex flex-col h-full">
      {/* 标题 */}
      <div className="shrink-0 px-4 pt-3 pb-1">
        <h1 className="text-lg font-bold text-text-main">🎲 随机漫步</h1>
        <p className="text-xs text-text-disabled mt-0.5">
          从 {totalCount} 篇笔记中随机抽取
        </p>
      </div>

      {/* 标签筛选栏 */}
      {tagCache.length > 0 && (
        <div className="shrink-0 px-4 py-2">
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => selectTag(null)}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
                selectedTagId === null
                  ? 'bg-primary/25 text-primary-light'
                  : 'text-text-secondary hover:text-text-main'
              }`}
            >
              全部
            </button>
            {tagCache.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => selectTag(tag.id)}
                className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                  selectedTagId === tag.id
                    ? 'bg-primary/25 text-primary-light'
                    : 'text-text-secondary hover:text-text-main'
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: getTagColorHex(tag.color) }}
                />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 闪卡区域 */}
      <div className="flex-1 flex items-center justify-center min-h-0 py-4">
        <div className="w-full max-w-md">
          <RandomWalk tagId={selectedTagId} trigger={trigger} />
        </div>
      </div>

      {/* 底部提示 */}
      <div className="shrink-0 pb-4 text-center">
        <button
          type="button"
          onClick={reroll}
          className="text-xs text-text-disabled hover:text-text-secondary transition-colors"
        >
          或点击卡片查看笔记详情
        </button>
      </div>
    </div>
  )
}
