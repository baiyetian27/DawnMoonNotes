import { useState, useEffect, useCallback, type KeyboardEvent } from 'react'
import { FileText } from 'lucide-react'
import { getTagsByIds } from '../../services/notes'
import { getTagColorHex } from '../../services/tags'
import type { Tag } from '../../lib/db'

interface MentionItem {
  id: string   // note id as string → TipTap mention attrs.id
  label: string // display text → TipTap mention attrs.label
  title: string
  subtitle: string
  tags: Tag[]
}

interface Props {
  query: string
  items: MentionItem[]
  command: (item: MentionItem) => void
}

export default function MentionSuggestion({
  query,
  items,
  command,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index]
      if (item) command(item)
    },
    [items, command],
  )

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      selectItem(selectedIndex)
    } else if (e.key === 'Escape') {
      // Let parent handle dismissal
    }
  }

  if (items.length === 0) {
    return (
      <div className="glass rounded-xl p-4 min-w-[200px] text-center">
        <p className="text-xs text-text-disabled">
          {query ? `没有找到 "${query}" 相关笔记` : '输入关键词搜索笔记'}
        </p>
      </div>
    )
  }

  return (
    <div
      className="glass rounded-xl overflow-hidden min-w-[240px] max-w-[320px] shadow-lg"
      onKeyDown={handleKeyDown}
    >
      {items.map((item, idx) => (
        <button
          key={item.id}
          type="button"
          onClick={() => selectItem(idx)}
          className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors
            ${idx === selectedIndex
              ? 'bg-primary/15'
              : 'hover:bg-white/5'
            }`}
        >
          <FileText
            size={14}
            className={`shrink-0 mt-0.5 ${
              idx === selectedIndex ? 'text-primary-light' : 'text-text-disabled'
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-main truncate">
              {item.title || '无标题'}
            </p>
            {item.subtitle && (
              <p className="text-[10px] text-text-disabled truncate">
                {item.subtitle}
              </p>
            )}
            {item.tags.length > 0 && (
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {item.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="text-[9px] px-1 py-px rounded bg-white/5 text-text-disabled"
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-0.5"
                      style={{ backgroundColor: getTagColorHex(tag.color) }}
                    />
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  )
}

// ── 供外部使用的项目获取函数 ────────────────────────
export async function fetchMentionItems(query: string): Promise<MentionItem[]> {
  const { listNotes } = await import('../../services/notes')
  const notes = await listNotes()
  const filtered = query
    ? notes.filter(
        n =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          n.subtitle.toLowerCase().includes(query.toLowerCase()),
      )
    : notes

  // Collect all tag IDs
  const allTagIds = new Set<number>()
  for (const n of filtered) {
    n.tags.forEach(t => allTagIds.add(t))
  }
  const tags = await getTagsByIds([...allTagIds])
  const tagMap = new Map<number, Tag>()
  for (const t of tags) tagMap.set(t.id!, t)

  return filtered.slice(0, 10).map(n => ({
    id: String(n.id!),
    label: n.title || '无标题',
    title: n.title,
    subtitle: n.subtitle,
    tags: n.tags.map(tid => tagMap.get(tid)).filter(Boolean) as Tag[],
  }))
}
