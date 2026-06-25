import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shuffle } from 'lucide-react'
import { getRandomNote } from '../../services/notes'
import { getTagsByIds } from '../../services/notes'
import { getTagColorHex } from '../../services/tags'
import type { Note, Tag } from '../../lib/db'

interface Props {
  tagId: number | null
  trigger: number // 外部递增以触发重新随机
}

export default function RandomWalk({ tagId, trigger }: Props) {
  const navigate = useNavigate()
  const [note, setNote] = useState<Note | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const n = await getRandomNote(tagId ?? undefined)
      if (n) {
        setNote(n)
        // 加载标签
        if (n.tags.length > 0) {
          const ts = await getTagsByIds(n.tags)
          setTags(ts)
        } else {
          setTags([])
        }
      } else {
        setNote(null)
        setTags([])
      }
    } catch {
      setError('加载失败，请重试')
    }
    setLoading(false)
  }, [tagId])

  // 外部 trigger 变化或 tagId 变化时重新随机
  useEffect(() => {
    roll()
  }, [roll, trigger])

  // ── 空状态 ───────────────────────────────

  if (!loading && !note && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <Shuffle size={40} className="text-text-disabled mb-3" />
        <p className="text-text-secondary text-sm">
          {tagId !== null
            ? '该标签下没有笔记'
            : '还没有笔记，去首页创建第一篇吧'}
        </p>
      </div>
    )
  }

  // ── 加载态 ───────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-10 h-10 rounded-full border-2 border-primary-light border-t-transparent animate-spin mb-3" />
        <p className="text-text-disabled text-sm">抽取中...</p>
      </div>
    )
  }

  // ── 错误态 ───────────────────────────────

  if (error || !note) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-text-disabled text-sm mb-3">{error ?? '暂无笔记'}</p>
        <button
          type="button"
          onClick={roll}
          className="text-xs text-primary-light hover:underline"
        >
          重试
        </button>
      </div>
    )
  }

  // ── 正文摘要（纯文本前 120 字） ──────────

  const snippet = note.plainText
    ? note.plainText.length > 120
      ? note.plainText.slice(0, 120) + '…'
      : note.plainText
    : '（空内容）'

  // ═══════════════════════════════════════════════
  //  渲染闪卡
  // ═══════════════════════════════════════════════

  return (
    <div className="flex flex-col items-center gap-4 px-4">
      {/* 闪卡 */}
      <button
        key={note.id}
        type="button"
        onClick={() => navigate(`/note/${note.id}`)}
        className="w-full text-left glass rounded-2xl p-5 hover:bg-white/5 transition-all
          duration-300 animate-[fadeInUp_0.3s_ease]"
      >
        {/* 标题 */}
        <h2 className="text-xl font-bold text-text-main mb-1">
          {note.title || '无标题'}
        </h2>

        {/* 副标题 */}
        {note.subtitle && (
          <p className="text-sm text-text-secondary mb-3">{note.subtitle}</p>
        )}

        {/* 标签 */}
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {tags.map(tag => (
              <span
                key={tag.id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-text-disabled flex items-center gap-1"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: getTagColorHex(tag.color) }}
                />
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 正文摘要 */}
        <p className="text-sm text-text-secondary leading-relaxed line-clamp-4">
          {snippet}
        </p>

        {/* 时间 */}
        <p className="text-[10px] text-text-disabled mt-3">
          {new Date(note.updatedAt).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>

        {/* 曦筑标记 */}
        {note.isXizhu && (
          <div className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded bg-primary/15 text-primary-light">
            🌟 曦筑
          </div>
        )}
      </button>

      {/* 再来一篇按钮 */}
      <button
        type="button"
        onClick={roll}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl glass
          text-primary-light hover:bg-primary/10 transition-all btn-glow"
      >
        <Shuffle size={16} />
        <span className="text-sm">再来一篇</span>
      </button>
    </div>
  )
}
