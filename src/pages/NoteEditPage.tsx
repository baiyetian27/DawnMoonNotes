import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Lock,
  Unlock,
  Share2,
  Image,
  FileText,
  Trash2,
  Tag,
  Pin,
  Link2,
} from 'lucide-react'
import { getNote, createNote, updateNote, deleteNote } from '../services/notes'
import { listTags, getTagColorHex } from '../services/tags'
import { shareNoteAsImage, shareNoteAsText } from '../services/share'
import { getBacklinks, syncLinksAfterNoteUpdate } from '../services/links'
import type { Editor } from '@tiptap/react'
import NoteEditor, { type NoteEditorHandle } from '../components/editor/NoteEditor'
import Toolbar from '../components/editor/Toolbar'
import type { Note, Tag as TagType, Link } from '../lib/db'

export default function NoteEditPage() {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const isNew = !noteId

  const [note, setNote] = useState<Note | null>(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [allTags, setAllTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [backlinks, setBacklinks] = useState<Link[]>([])
  const [showBacklinks, setShowBacklinks] = useState(false)

  const editorRef = useRef<NoteEditorHandle>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 存储最新的 TipTap JSON，避免 autoSave 回调闭包过期
  const latestContentRef = useRef<object>({ type: 'doc', content: [] })
  // 编辑器实例（通过 onEditorReady 回调获得，用于触发 Toolbar 重渲染）
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null)

  // ── 加载笔记 ──────────────────────────────────────

  useEffect(() => {
    if (isNew) {
      initNewNote()
    } else {
      loadNote(Number(noteId))
      loadBacklinks(Number(noteId))
    }
    loadAllTags()
  }, [noteId])

  async function loadBacklinks(nid: number) {
    const links = await getBacklinks(nid)
    setBacklinks(links)
  }

  async function initNewNote() {
    const id = await createNote()
    const newNote = await getNote(id)
    if (newNote) {
      setNote(newNote)
      setLoading(false)
    }
  }

  async function loadNote(id: number) {
    const found = await getNote(id)
    if (!found) {
      navigate('/', { replace: true })
      return
    }
    setNote(found)
    setTitle(found.title)
    setSubtitle(found.subtitle)
    setLoading(false)
  }

  async function loadAllTags() {
    setAllTags(await listTags())
  }

  async function loadTagsByIds(ids: number[]): Promise<TagType[]> {
    if (ids.length === 0) return []
    const { getTagsByIds } = await import('../services/notes')
    return getTagsByIds(ids)
  }

  // ── 获取当前标签列表（用于渲染） ─────────────────

  const [currentTags, setCurrentTags] = useState<TagType[]>([])
  useEffect(() => {
    if (note?.tags.length) {
      loadTagsByIds(note.tags).then(setCurrentTags)
    } else {
      setCurrentTags([])
    }
  }, [note?.tags])

  // ── TipTap 编辑器回调 ─────────────────────────────

  // 从 TipTap JSON 中提取所有 @mention 指向的笔记 ID
  function extractMentionIds(contentObj: object): number[] {
    const ids: number[] = []
    const seen = new Set<number>()
    walkContent(contentObj as Record<string, unknown>)
    return ids

    function walkContent(node: Record<string, unknown>): void {
      if (node.type === 'mention') {
        const attrs = node.attrs as Record<string, string> | undefined
        if (attrs?.id) {
          const id = Number(attrs.id)
          if (!seen.has(id)) {
            seen.add(id)
            ids.push(id)
          }
        }
      }
      const children = node.content as unknown[]
      if (Array.isArray(children)) {
        for (const child of children) {
          walkContent(child as Record<string, unknown>)
        }
      }
    }
  }

  const handleEditorUpdate = useCallback(async (_json: object, _text: string) => {
    latestContentRef.current = _json
    // 触发自动保存
    if (note?.id && saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    if (note?.id) {
      saveTimerRef.current = setTimeout(async () => {
        setSaving(true)
        // 提取 mention 链接 ID
        const mentionedIds = extractMentionIds(latestContentRef.current)
        // 同步到 links 表
        await syncLinksAfterNoteUpdate(note.id!, mentionedIds)
        await updateNote(note.id!, {
          content: latestContentRef.current,
          outgoingLinks: mentionedIds,
        })
        setSaving(false)
        // 如果笔记 ID 在 backlinks 的 source 变化中，重新加载
        loadBacklinks(note.id!)
      }, 500)
    }
  }, [note?.id])

  // ── 自动保存（标题/副标题） ───────────────────────

  const autoSaveMeta = useCallback(async (
    newTitle: string,
    newSubtitle: string,
  ) => {
    if (!note?.id) return
    setSaving(true)
    await updateNote(note.id, {
      title: newTitle,
      subtitle: newSubtitle,
    })
    setSaving(false)
  }, [note?.id])

  // 标题变化时防抖保存
  useEffect(() => {
    if (!note?.id) return
    const timer = setTimeout(() => {
      autoSaveMeta(title, subtitle)
    }, 500)
    return () => clearTimeout(timer)
  }, [title, subtitle])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [])

  // ── 加锁/解锁 ──────────────────────────────────────

  async function handleToggleLock() {
    if (!note?.id) return
    if (note.isLocked) {
      setShowUnlockConfirm(true)
    } else {
      await updateNote(note.id, { isLocked: true })
      setNote({ ...note, isLocked: true })
    }
  }

  async function confirmUnlock() {
    if (!note?.id) return
    setShowUnlockConfirm(false)
    await updateNote(note.id, { isLocked: false })
    setNote({ ...note, isLocked: false })
  }

  // ── 删除 ──────────────────────────────────────────

  async function handleDelete() {
    if (!note?.id) return
    await deleteNote(note.id)
    navigate('/', { replace: true })
  }

  // ── 分享 ──────────────────────────────────────────

  async function handleShareImage() {
    setShowShareMenu(false)
    if (!contentRef.current) return
    try {
      await shareNoteAsImage(contentRef.current, title || '曦月笔记')
    } catch {
      // 忽略
    }
  }

  async function handleShareText() {
    setShowShareMenu(false)
    const text = editorInstance?.getText() ?? ''
    try {
      await shareNoteAsText(title, text)
    } catch {
      // 忽略
    }
  }

  // ── 标签 ──────────────────────────────────────────

  async function toggleNoteTag(tagId: number) {
    if (!note?.id) return
    const newTagIds = note.tags.includes(tagId)
      ? note.tags.filter(id => id !== tagId)
      : [...note.tags, tagId]
    await updateNote(note.id, { tags: newTagIds })
    setNote({ ...note, tags: newTagIds })
  }

  async function toggleXizhu() {
    if (!note?.id) return
    const newVal = !note.isXizhu
    await updateNote(note.id, { isXizhu: newVal })
    setNote({ ...note, isXizhu: newVal })
  }

  const isLocked = note?.isLocked ?? false

  // ── 获取初始内容 ─────────────────────────────────
  function getInitialContent(): object {
    if (note?.content && typeof note.content === 'object' && 'type' in (note.content as Record<string, unknown>)) {
      return note.content as object
    }
    return { type: 'doc', content: [{ type: 'paragraph' }] }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-primary-light border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-enter">
      {/* ── 顶栏 ─────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-text-secondary hover:text-text-main transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">返回</span>
        </button>

        <div className="flex items-center gap-1">
          {/* 保存状态 */}
          {saving && (
            <span className="text-[10px] text-text-disabled mr-1">保存中...</span>
          )}

          {/* 曦筑 */}
          <button
            type="button"
            onClick={toggleXizhu}
            className={`p-2 rounded-lg transition-all duration-200
              ${note?.isXizhu
                ? 'text-primary-light bg-primary/20'
                : 'text-text-disabled hover:text-text-secondary'
              }`}
            title={note?.isXizhu ? '取消曦筑' : '曦筑'}
          >
            <Pin size={18} />
          </button>

          {/* 加锁 */}
          <button
            type="button"
            onClick={handleToggleLock}
            className={`p-2 rounded-lg transition-all duration-200
              ${isLocked
                ? 'text-warning bg-yellow-500/10'
                : 'text-text-disabled hover:text-text-secondary'
              }`}
            title={isLocked ? '解锁' : '加锁'}
          >
            {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
          </button>

          {/* 标签 */}
          <button
            type="button"
            onClick={() => !isLocked && setShowTagPicker(!showTagPicker)}
            disabled={isLocked}
            className={`p-2 rounded-lg transition-all duration-200
              ${showTagPicker ? 'text-primary-light bg-primary/10' : 'text-text-disabled hover:text-text-secondary'}
              ${isLocked ? 'opacity-50' : ''}`}
            title="标签"
          >
            <Tag size={18} />
          </button>

          {/* 分享 */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="p-2 rounded-lg text-text-disabled hover:text-text-secondary transition-all duration-200"
              title="分享"
            >
              <Share2 size={18} />
            </button>

            {showShareMenu && (
              <div
                className="absolute right-0 top-10 z-20 glass rounded-xl border border-white/10
                  overflow-hidden shadow-lg min-w-[140px]"
              >
                <button
                  type="button"
                  onClick={handleShareImage}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-text-secondary
                    hover:bg-white/5 transition-colors"
                >
                  <Image size={14} />
                  分享为图片
                </button>
                <button
                  type="button"
                  onClick={handleShareText}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-text-secondary
                    hover:bg-white/5 transition-colors"
                >
                  <FileText size={14} />
                  分享为文本
                </button>
              </div>
            )}
          </div>

          {/* 删除 */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLocked}
            className={`p-2 rounded-lg text-text-disabled hover:text-error transition-all duration-200
              ${isLocked ? 'opacity-50' : ''}`}
            title="删除"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* ── 编辑区 ─────────────────────────────────── */}
      <div ref={contentRef} className="space-y-4">
        {/* 主标题 */}
        <input
          type="text"
          placeholder="主标题（选填）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isLocked}
          className="w-full text-lg font-bold text-text-main bg-transparent border-none outline-none
            placeholder-text-disabled"
        />

        {/* 副标题 */}
        <input
          type="text"
          placeholder="副标题（选填）"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          disabled={isLocked}
          className="w-full text-sm text-text-secondary bg-transparent border-none outline-none
            placeholder-text-disabled"
        />

        {/* 标签显示 */}
        {currentTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {currentTags.map(tag => (
              <span
                key={tag.id}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-text-disabled"
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                  style={{ backgroundColor: getTagColorHex(tag.color) }}
                />
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* 分隔线 */}
        <div className="border-t border-white/5" />

        {/* ── TipTap 富文本编辑器 ───────────────── */}
        {!isLocked && <Toolbar editor={editorInstance} />}

        <NoteEditor
          key={noteId ?? 'new'}
          ref={editorRef}
          content={getInitialContent()}
          onUpdate={handleEditorUpdate}
          onEditorReady={setEditorInstance}
          editable={!isLocked}
        />

        {/* 锁定提示 */}
        {isLocked && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <Lock size={16} className="text-warning shrink-0" />
            <p className="text-xs text-warning">笔记已锁定，点击上方锁图标解锁后可编辑</p>
          </div>
        )}

        {/* ── 反向链接面板 ──────────────────────────── */}
        <div className="border-t border-white/5 pt-4">
          <button
            type="button"
            onClick={() => setShowBacklinks(!showBacklinks)}
            className="flex items-center gap-2 text-xs text-text-secondary hover:text-text-main transition-colors"
          >
            <Link2 size={14} className="text-primary-light" />
            反向链接
            {backlinks.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary/15 text-primary-light text-[10px]">
                {backlinks.length}
              </span>
            )}
          </button>

          {showBacklinks && (
            <div className="mt-3 space-y-2">
              {backlinks.length === 0 ? (
                <p className="text-xs text-text-disabled">暂无笔记链接到此处</p>
              ) : (
                backlinks.map(link => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => navigate(`/note/${link.sourceNoteId}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl glass border border-white/5
                      hover:border-primary-light/20 hover:bg-white/[0.02] transition-all duration-200 text-left"
                  >
                    <Link2 size={14} className="text-primary-light shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-main truncate">
                        {link.sourceTitle || '无标题'}
                      </p>
                    </div>
                    <span className="text-[10px] text-text-disabled shrink-0">→ 链接到当前</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 标签选择器弹窗 ──────────────────────────── */}
      {showTagPicker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowTagPicker(false)}
        >
          <div
            className="glass rounded-2xl p-5 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-main">选择标签</h3>
              <button
                type="button"
                onClick={() => { setShowTagPicker(false); navigate('/tags') }}
                className="text-xs text-primary-light hover:text-primary-light/80 transition-colors"
              >
                管理标签
              </button>
            </div>
            {allTags.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-text-disabled mb-2">暂无标签</p>
                <button
                  type="button"
                  onClick={() => { setShowTagPicker(false); navigate('/tags') }}
                  className="text-xs text-primary-light hover:text-primary-light/80 transition-colors"
                >
                  去创建标签
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto">
                {allTags.map(tag => {
                  const isActive = note?.tags.includes(tag.id!)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleNoteTag(tag.id!)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200
                        ${isActive
                          ? 'bg-primary/20 border border-primary-light/40 text-primary-light'
                          : 'bg-bg-input border border-white/5 text-text-secondary hover:border-white/15'
                        }`}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1.5"
                        style={{ backgroundColor: getTagColorHex(tag.color) }}
                      />
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowTagPicker(false)}
              className="w-full mt-4 py-2.5 rounded-xl border border-white/10 text-text-secondary text-sm
                hover:border-white/20 transition-all duration-200"
            >
              完成
            </button>
          </div>
        </div>
      )}

      {/* ── 解锁确认弹窗 ──────────────────────────── */}
      {showUnlockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-medium text-text-main mb-2">确认解锁</h3>
            <p className="text-xs text-text-secondary mb-4">解锁后笔记可以编辑，确定要继续吗？</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowUnlockConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-secondary text-sm
                  hover:border-white/20 transition-all duration-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmUnlock}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium
                  hover:shadow-[0_0_12px_rgba(124,58,237,0.4)]
                  active:scale-[0.98] transition-all duration-200"
              >
                确认解锁
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 删除确认弹窗 ──────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-sm font-medium text-text-main mb-2">确认删除</h3>
            <p className="text-xs text-text-secondary mb-4">删除后笔记不可恢复，确定要删除吗？</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
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

      {/* ── 分享菜单关闭捕获 ────────────────────────── */}
      {showShareMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowShareMenu(false)}
        />
      )}
    </div>
  )
}
