import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ArrowLeft,
  Tag,
} from 'lucide-react'
import {
  listTags,
  createTag,
  updateTag,
  deleteTag,
  TAG_COLORS,
  getTagColorHex,
} from '../services/tags'
import type { Tag as TagType } from '../lib/db'

interface EditState {
  id: number
  name: string
  color: string
}

export default function TagsPage() {
  const navigate = useNavigate()
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)

  // 新建表单
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('purple')

  // 编辑状态
  const [editing, setEditing] = useState<EditState | null>(null)

  // 删除确认
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    loadTags()
  }, [])

  async function loadTags() {
    setLoading(false)
    setTags(await listTags())
  }

  // ── 创建 ──────────────────────────────────────────

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    if (name.length > 10) {
      alert('标签名最长 10 个字')
      return
    }
    await createTag(name, newColor)
    setNewName('')
    setNewColor('purple')
    setShowCreate(false)
    await loadTags()
  }

  // ── 编辑 ──────────────────────────────────────────

  function startEdit(tag: TagType) {
    setEditing({ id: tag.id!, name: tag.name, color: tag.color })
  }

  function cancelEdit() {
    setEditing(null)
  }

  async function saveEdit() {
    if (!editing) return
    const name = editing.name.trim()
    if (!name) return
    if (name.length > 10) {
      alert('标签名最长 10 个字')
      return
    }
    await updateTag(editing.id, { name, color: editing.color })
    setEditing(null)
    await loadTags()
  }

  // ── 删除 ──────────────────────────────────────────

  async function handleDelete() {
    if (deleteId === null) return
    await deleteTag(deleteId)
    setDeleteId(null)
    await loadTags()
  }

  // ── 渲染 ──────────────────────────────────────────

  // 编辑行组件（提取出来避免嵌套三元和 IIFE）
  function EditForm({ ed }: { ed: EditState }) {
    return (
      <div className="flex-1 flex flex-col gap-2">
        <input
          type="text"
          value={ed.name}
          onChange={(e) => setEditing({ ...ed, name: e.target.value })}
          maxLength={10}
          autoFocus
          className="px-3 py-1.5 rounded-xl bg-bg-input border border-primary-light/40 text-sm text-text-main
            outline-none transition-all duration-200"
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
        />
        <div className="flex gap-1.5">
          {TAG_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setEditing({ ...ed, color: c.value })}
              className="w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center
                hover:scale-110"
              style={{ backgroundColor: c.hex }}
            >
              {ed.color === c.value && (
                <Check size={12} className="text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]" />
              )}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancelEdit}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-text-secondary text-xs
              hover:border-white/20 transition-all duration-200"
          >
            <X size={12} />
            取消
          </button>
          <button
            type="button"
            onClick={saveEdit}
            disabled={!ed.name.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium
              hover:shadow-[0_0_12px_rgba(124,58,237,0.4)]
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all duration-200"
          >
            <Check size={12} />
            保存
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter">
      {/* 顶栏 */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-text-secondary hover:text-text-main transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold text-text-main flex items-center gap-2">
            <Tag size={22} className="text-primary-light" />
            标签管理
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-sm font-medium
            hover:shadow-[0_0_12px_rgba(124,58,237,0.4)] active:scale-[0.98] transition-all duration-200"
        >
          <Plus size={16} />
          新建标签
        </button>
      </div>

      {/* ── 新建标签表单 ──────────────────────────── */}
      {showCreate && (
        <div className="glass rounded-2xl p-4 mb-4 animate-[fadeInUp_0.25s_ease]">
          <div className="flex items-center gap-3 mb-3">
            <input
              type="text"
              placeholder="标签名称（最长10字）"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={10}
              autoFocus
              className="flex-1 px-3 py-2 rounded-xl bg-bg-input border border-white/10 text-sm text-text-main
                placeholder-text-disabled outline-none focus:border-primary-light/50 transition-all duration-200"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            />
          </div>

          {/* 颜色选择器 */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-text-disabled shrink-0">颜色：</span>
            <div className="flex gap-1.5 flex-wrap">
              {TAG_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setNewColor(c.value)}
                  className="w-7 h-7 rounded-full transition-all duration-200 flex items-center justify-center"
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                >
                  {newColor === c.value && (
                    <Check size={14} className="text-white drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowCreate(false); setNewName('') }}
              className="flex-1 py-2 rounded-xl border border-white/10 text-text-secondary text-sm
                hover:border-white/20 transition-all duration-200"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium
                hover:shadow-[0_0_12px_rgba(124,58,237,0.4)]
                disabled:opacity-40 disabled:cursor-not-allowed
                active:scale-[0.98] transition-all duration-200"
            >
              创建
            </button>
          </div>
        </div>
      )}

      {/* ── 标签列表 ──────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tags.length === 0 && !showCreate ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3 opacity-30">🏷️</div>
          <p className="text-text-disabled text-sm">暂无标签</p>
          <p className="text-text-disabled text-xs mt-1">
            点击「新建标签」创建第一个标签
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="glass rounded-2xl p-4 flex items-center gap-3
                hover:shadow-[0_4px_20px_rgba(124,58,237,0.08)]
                transition-all duration-200"
            >
              {editing && editing.id === tag.id ? (
                <EditForm ed={editing} />
              ) : (
                /* ── 显示模式 ────────────────────── */
                <>
                  <span
                    className="w-4 h-4 rounded-full shrink-0"
                    style={{ backgroundColor: getTagColorHex(tag.color) }}
                  />
                  <span className="flex-1 text-sm text-text-main font-medium">
                    {tag.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(tag)}
                      className="p-1.5 rounded-lg text-text-disabled hover:text-text-secondary hover:bg-white/5
                        transition-all duration-200"
                      title="编辑"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteId(tag.id!)}
                      className="p-1.5 rounded-lg text-text-disabled hover:text-error hover:bg-red-500/10
                        transition-all duration-200"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 删除确认弹窗 ──────────────────────────── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDeleteId(null)}
        >
          <div
            className="glass rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium text-text-main mb-2">确认删除标签</h3>
            <p className="text-xs text-text-secondary mb-4">
              删除后，所有笔记中该标签都会被移除。此操作不可恢复。
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-secondary text-sm
                  hover:border-white/20 transition-all duration-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-medium
                  hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]
                  active:scale-[0.98] transition-all duration-200"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
