import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, Loader2 } from 'lucide-react'
import SearchBar from '../components/search/SearchBar'
import { listNotes } from '../services/notes'
import type { Note } from '../lib/db'

// ── 搜索历史（localStorage） ──────────────────────

const HISTORY_KEY = 'xizhu_search_history'
const MAX_HISTORY = 5

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveHistory(keyword: string) {
  const prev = loadHistory().filter(k => k !== keyword)
  const next = [keyword, ...prev].slice(0, MAX_HISTORY)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
}

// ── 高亮匹配文本 ─────────────────────────────────

interface HighlightChunk {
  text: string
  match: boolean
}

function highlightText(text: string, query: string): HighlightChunk[] {
  if (!query.trim()) return [{ text, match: false }]
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const chunks: HighlightChunk[] = []
  let idx = 0

  while (idx < text.length) {
    const pos = lowerText.indexOf(lowerQuery, idx)
    if (pos === -1) {
      chunks.push({ text: text.slice(idx), match: false })
      break
    }
    if (pos > idx) {
      chunks.push({ text: text.slice(idx, pos), match: false })
    }
    chunks.push({
      text: text.slice(pos, pos + query.length),
      match: true,
    })
    idx = pos + query.length
  }
  return chunks
}

// ── 获取匹配片段（正文中截取匹配位置上下文） ────────

function getSnippet(plainText: string, query: string, maxLen = 80): string {
  if (!query.trim() || !plainText) return plainText.slice(0, maxLen)
  const lower = plainText.toLowerCase()
  const pos = lower.indexOf(query.toLowerCase())
  if (pos === -1) return plainText.slice(0, maxLen)
  const start = Math.max(0, pos - 30)
  const end = Math.min(plainText.length, pos + query.length + 50)
  let snippet = (start > 0 ? '…' : '') + plainText.slice(start, end)
  if (end < plainText.length) snippet += '…'
  return snippet
}

// ═══════════════════════════════════════════════════
//  组件
// ═══════════════════════════════════════════════════

export default function SearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<Note[]>([])
  const [searching, setSearching] = useState(false)
  const [history, setHistory] = useState<string[]>(loadHistory)

  // ── 200ms 防抖 ─────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200)
    return () => clearTimeout(timer)
  }, [query])

  // ── 搜索 ─────────────────────────────────

  useEffect(() => {
    let cancelled = false

    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }

    setSearching(true)
    listNotes({ keyword: debouncedQuery }).then(notes => {
      if (!cancelled) {
        setResults(notes)
        setSearching(false)
      }
    })

    return () => { cancelled = true }
  }, [debouncedQuery])

  // ── 处理搜索提交 ───────────────────────────

  const handleSubmit = useCallback(
    (keyword: string) => {
      if (!keyword.trim()) return
      saveHistory(keyword)
      setHistory(loadHistory())
    },
    [],
  )

  // ── 点击结果 ─────────────────────────────

  function handleClick(noteId: number) {
    handleSubmit(query)
    navigate(`/note/${noteId}`)
  }

  // ── 点击历史 ─────────────────────────────

  function handleHistoryClick(kw: string) {
    setQuery(kw)
    setDebouncedQuery(kw)
  }

  // ═════════════════════════════════════════════
  //  渲染
  // ═════════════════════════════════════════════

  return (
    <div className="page-enter flex flex-col h-full">
      {/* 搜索栏 */}
      <div className="shrink-0 px-4 pt-2 pb-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="搜索笔记标题、正文..."
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4">
        {/* 搜索中 */}
        {searching && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="text-primary-light animate-spin" />
          </div>
        )}

        {/* 无查询 — 显示历史 */}
        {!debouncedQuery.trim() && !searching && (
          <>
            {history.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-text-disabled mb-2 flex items-center gap-1">
                  <Clock size={12} />
                  最近搜索
                </p>
                {history.map(kw => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => handleHistoryClick(kw)}
                    className="w-full text-left px-3 py-2 rounded-lg
                      text-sm text-text-secondary hover:bg-white/5 hover:text-text-main
                      transition-colors"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            )}

            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText size={36} className="text-text-disabled mb-3" />
                <p className="text-text-disabled text-sm">输入关键词搜索笔记</p>
                <p className="text-text-disabled text-xs mt-1">
                  可搜索标题、副标题和正文内容
                </p>
              </div>
            )}
          </>
        )}

        {/* 有结果 */}
        {debouncedQuery.trim() && !searching && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-text-disabled mb-2">
              找到 {results.length} 篇笔记
            </p>
            {results.map(note => (
              <button
                key={note.id}
                type="button"
                onClick={() => handleClick(note.id!)}
                className="w-full text-left glass rounded-xl p-3.5
                  hover:bg-white/5 transition-colors"
              >
                {/* 标题（高亮） */}
                <p className="text-sm font-medium text-text-main truncate">
                  {highlightText(note.title || '无标题', debouncedQuery).map(
                    (chunk, i) =>
                      chunk.match ? (
                        <mark
                          key={i}
                          className="bg-primary/30 text-primary-light rounded-sm px-0.5"
                        >
                          {chunk.text}
                        </mark>
                      ) : (
                        <span key={i}>{chunk.text}</span>
                      ),
                  )}
                </p>

                {/* 副标题（高亮） */}
                {note.subtitle && (
                  <p className="text-xs text-text-secondary truncate mt-0.5">
                    {highlightText(note.subtitle, debouncedQuery).map(
                      (chunk, i) =>
                        chunk.match ? (
                          <mark
                            key={i}
                            className="bg-primary/30 text-primary-light rounded-sm px-0.5"
                          >
                            {chunk.text}
                          </mark>
                        ) : (
                          <span key={i}>{chunk.text}</span>
                        ),
                    )}
                  </p>
                )}

                {/* 正文片段（高亮） */}
                {note.plainText && (
                  <p className="text-xs text-text-disabled truncate mt-1 leading-relaxed">
                    {highlightText(
                      getSnippet(note.plainText, debouncedQuery),
                      debouncedQuery,
                    ).map((chunk, i) =>
                      chunk.match ? (
                        <mark
                          key={i}
                          className="bg-primary/30 text-primary-light rounded-sm px-0.5"
                        >
                          {chunk.text}
                        </mark>
                      ) : (
                        <span key={i}>{chunk.text}</span>
                      ),
                    )}
                  </p>
                )}

                {/* 时间 */}
                <p className="text-[10px] text-text-disabled mt-1.5">
                  {new Date(note.updatedAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* 无结果 */}
        {debouncedQuery.trim() && !searching && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-text-disabled text-sm">
              未找到 "{debouncedQuery}" 相关笔记
            </p>
            <p className="text-text-disabled text-xs mt-1">尝试其他关键词</p>
          </div>
        )}
      </div>
    </div>
  )
}
