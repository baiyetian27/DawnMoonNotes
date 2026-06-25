import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Lock, MoreHorizontal, Search, X, Settings2 } from 'lucide-react'
import { listNotes, deleteNote, createNote, getTagsByIds, type NoteFilter } from '../services/notes'
import { listTags, getTagColorHex } from '../services/tags'
import type { Note, Tag as TagType } from '../lib/db'

export default function HomePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notes, setNotes] = useState<(Note & { tagObjects?: TagType[] })[]>([])
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState<number | null>(null)

  const selectedTagId = searchParams.get('tag')
    ? Number(searchParams.get('tag'))
    : undefined

  useEffect(() => {
    loadData()
  }, [selectedTagId])

  async function loadData() {
    setLoading(true)
    const filter: NoteFilter = {}
    if (selectedTagId) filter.tagId = selectedTagId
    const [noteList, tagList] = await Promise.all([
      listNotes(filter),
      listTags(),
    ])
    // 关联标签对象
    const enriched = await Promise.all(
      noteList.map(async (note) => {
        const tagObjects = note.tags.length > 0
          ? await getTagsByIds(note.tags)
          : []
        return { ...note, tagObjects }
      }),
    )
    setNotes(enriched)
    setTags(tagList)
    setLoading(false)
  }

  async function handleCreate() {
    const id = await createNote()
    navigate(`/note/${id}`)
  }

  async function handleDelete(noteId: number) {
    setShowMenu(null)
    await deleteNote(noteId)
    await loadData()
  }

  function toggleTagFilter(tagId: number) {
    if (selectedTagId === tagId) {
      setSearchParams({})
    } else {
      setSearchParams({ tag: String(tagId) })
    }
  }

  function formatTime(ts: number): string {
    const now = new Date()
    const date = new Date(ts)
    const diff = now.getTime() - date.getTime()
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${month}-${day}`
  }

  return (
    <div className="page-enter">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-text-main">📝 笔记</h1>
        <button
          type="button"
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-sm font-medium
            hover:shadow-[0_0_12px_rgba(124,58,237,0.4)] active:scale-[0.98] transition-all duration-200"
        >
          <Plus size={16} />
          新建
        </button>
      </div>

      {/* 搜索 */}
      <button
        type="button"
        onClick={() => navigate('/search')}
        className="w-full flex items-center gap-2 px-4 py-2.5 mb-4 rounded-xl bg-bg-input border border-white/10
          text-text-disabled text-sm hover:border-white/20 transition-all duration-200"
      >
        <Search size={16} />
        搜索笔记...
      </button>

      {/* 标签筛选 */}
      {tags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none items-center">
          {selectedTagId && (
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/20 border border-primary-light/30
                text-primary-light text-xs shrink-0"
            >
              <X size={12} />
              清除筛选
            </button>
          )}
          {tags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTagFilter(tag.id!)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs shrink-0 transition-all duration-200
                ${selectedTagId === tag.id
                  ? 'bg-white/10 border border-white/20 text-white'
                  : 'bg-bg-input border border-white/5 text-text-secondary hover:border-white/15'
                }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getTagColorHex(tag.color) }}
              />
              {tag.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate('/tags')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-text-disabled
              hover:text-text-secondary border border-transparent hover:border-white/10
              transition-all duration-200 shrink-0"
            title="管理标签"
          >
            <Settings2 size={12} />
            管理
          </button>
        </div>
      )}

      {/* 笔记列表 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-text-disabled text-sm">还没有笔记</p>
          <p className="text-text-disabled text-xs mt-1">点击「新建」开始记录</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div
              key={note.id}
              className={`glass rounded-2xl p-4 hover:shadow-[0_4px_20px_rgba(124,58,237,0.1)]
                transition-all duration-200 cursor-pointer group relative
                ${note.isXizhu ? 'border border-primary-light/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'border border-primary-light/10'}`}
              onClick={() => navigate(`/note/${note.id}`)}
            >
              {/* 标题区 */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-text-main truncate">
                    {note.title || '无标题'}
                  </h3>
                  {note.subtitle && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {note.subtitle}
                    </p>
                  )}
                </div>

                {/* 状态图标 */}
                <div className="flex items-center gap-1 shrink-0">
                  {note.isLocked && (
                    <Lock size={14} className="text-warning" />
                  )}
                  {/* 更多菜单 */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(showMenu === note.id ? null : note.id!)
                    }}
                    className="p-1 rounded-lg text-text-disabled hover:text-text-secondary
                      opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>

              {/* 摘要 */}
              {note.plainText && (
                <p className="text-xs text-text-disabled mt-1.5 line-clamp-2">
                  {note.plainText}
                </p>
              )}

              {/* 底部：标签 + 时间 */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-1.5">
                  {note.tagObjects?.map(tag => (
                    <span
                      key={tag.id}
                      className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-text-disabled"
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                        style={{ backgroundColor: getTagColorHex(tag.color) }}
                      />
                      {tag.name}
                    </span>
                  ))}
                </div>
                <span className="text-[10px] text-text-disabled">
                  {formatTime(note.updatedAt)}
                </span>
              </div>

              {/* 弹出菜单 */}
              {showMenu === note.id && (
                <div
                  className="absolute right-4 top-12 z-10 glass rounded-xl border border-white/10
                    overflow-hidden shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id!)}
                    className="block w-full text-left px-4 py-2.5 text-xs text-error
                      hover:bg-red-500/10 transition-colors"
                  >
                    删除笔记
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
