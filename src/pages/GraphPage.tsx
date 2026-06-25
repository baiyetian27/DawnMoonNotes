import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { GitGraph, Loader2, Tag } from 'lucide-react'
import { listNotes } from '../services/notes'
import { listAllLinks } from '../services/links'
import { listTags } from '../services/tags'
import type { Note, Link } from '../lib/db'
import KnowledgeGraph from '../components/graph/KnowledgeGraph'
import { getTagColorHex } from '../services/tags'

export default function GraphPage() {
  const navigate = useNavigate()

  const [notes, setNotes] = useState<Note[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set())

  // ── 加载数据 ──────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [n, l] = await Promise.all([listNotes(), listAllLinks()])
      if (!cancelled) {
        setNotes(n)
        setLinks(l)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── 所有标签（从笔记中提取） ──────────────

  const tagIdsFromNotes = useMemo(() => {
    const ids = new Set<number>()
    for (const n of notes) {
      n.tags.forEach(tid => ids.add(tid))
    }
    return ids
  }, [notes])

  const [tagCache, setTagCache] = useState<
    Map<number, { id: number; name: string; color: string }>
  >(new Map())

  useEffect(() => {
    if (tagIdsFromNotes.size === 0) {
      setTagCache(new Map())
      return
    }
    let cancelled = false
    listTags().then(tags => {
      if (cancelled) return
      const map = new Map<number, { id: number; name: string; color: string }>()
      for (const t of tags) {
        if (tagIdsFromNotes.has(t.id!)) {
          map.set(t.id!, { id: t.id!, name: t.name, color: t.color })
        }
      }
      setTagCache(map)
    })
    return () => { cancelled = true }
  }, [tagIdsFromNotes])

  // ── 标签筛选切换 ──────────────────────────

  function toggleTag(tagId: number) {
    setSelectedTagIds(prev => {
      const next = new Set(prev)
      if (next.has(tagId)) {
        next.delete(tagId)
      } else {
        next.add(tagId)
      }
      return next
    })
  }

  function clearTagFilter() {
    setSelectedTagIds(new Set())
  }

  // ── 统计 ──────────────────────────────────

  const { nodeCount, linkCount } = useMemo(() => {
    let filteredNotes = notes
    if (selectedTagIds.size > 0) {
      filteredNotes = notes.filter(n => n.tags.some(tid => selectedTagIds.has(tid)))
    }
    const visibleIds = new Set(filteredNotes.map(n => String(n.id!)))
    const filteredLinks = links.filter(
      l =>
        visibleIds.has(String(l.sourceNoteId)) &&
        visibleIds.has(String(l.targetNoteId)),
    )
    return { nodeCount: filteredNotes.length, linkCount: filteredLinks.length }
  }, [notes, links, selectedTagIds])

  // ── 点击节点 ──────────────────────────────

  function handleNodeClick(noteId: number) {
    navigate(`/note/${noteId}`)
  }

  // ═══════════════════════════════════════════════
  //  渲染
  // ═══════════════════════════════════════════════

  return (
    <div className="page-enter flex flex-col h-full">
      {/* 标签筛选栏 */}
      {tagCache.size > 0 && (
        <div className="shrink-0 px-4 py-2">
          <div className="glass rounded-xl px-3 py-2 flex items-center gap-2 overflow-x-auto">
            {/* "全部" 按钮 */}
            <button
              type="button"
              onClick={clearTagFilter}
              className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors ${
                selectedTagIds.size === 0
                  ? 'bg-primary/25 text-primary-light'
                  : 'text-text-secondary hover:text-text-main'
              }`}
            >
              全部
            </button>

            {[...tagCache.values()].map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`shrink-0 text-xs px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                  selectedTagIds.has(tag.id)
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

      {/* 图谱区域 */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 size={28} className="text-primary-light animate-spin" />
            <p className="text-text-disabled text-sm">加载图谱数据...</p>
          </div>
        ) : notes.length === 0 ? (
          /* 无笔记空状态 */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <GitGraph size={48} className="text-text-disabled mb-4" />
            <p className="text-text-secondary text-sm mb-1">还没有笔记</p>
            <p className="text-text-disabled text-xs">
              创建笔记并在编辑器中用 @ 链接其他笔记后，知识图谱会在这里展示
            </p>
          </div>
        ) : linkCount === 0 && selectedTagIds.size === 0 ? (
          /* 无链接空状态 */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <GitGraph size={48} className="text-text-disabled mb-4" />
            <p className="text-text-secondary text-sm mb-1">暂无笔记关联</p>
            <p className="text-text-disabled text-xs">
              在笔记编辑器中输入 @ 链接其他笔记，关联将自动出现在这里
            </p>
          </div>
        ) : nodeCount === 0 ? (
          /* 筛选后无结果 */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Tag size={40} className="text-text-disabled mb-3" />
            <p className="text-text-secondary text-sm">筛选标签后没有匹配的笔记</p>
            <button
              type="button"
              onClick={clearTagFilter}
              className="mt-3 text-xs text-primary-light hover:underline"
            >
              清除筛选
            </button>
          </div>
        ) : (
          <KnowledgeGraph
            notes={notes}
            links={links}
            selectedTagIds={selectedTagIds}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>

      {/* 底部统计栏 */}
      {!loading && notes.length > 0 && (
        <div className="shrink-0 px-4 py-2">
          <div className="flex items-center justify-center gap-4 text-xs text-text-disabled">
            <span>
              <span className="text-text-secondary font-medium">{nodeCount}</span>{' '}
              个节点
            </span>
            <span className="text-text-disabled/40">·</span>
            <span>
              <span className="text-text-secondary font-medium">{linkCount}</span>{' '}
              条连线
            </span>
            {selectedTagIds.size > 0 && (
              <>
                <span className="text-text-disabled/40">·</span>
                <button
                  type="button"
                  onClick={clearTagFilter}
                  className="text-primary-light hover:underline"
                >
                  已筛选 · 清除
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
