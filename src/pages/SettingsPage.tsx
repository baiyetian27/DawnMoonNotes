import { useState, useEffect, useRef } from 'react'
import {
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Tag,
  Smartphone,
  ShieldCheck,
  ShieldOff,
  HardDrive,
} from 'lucide-react'
import { downloadBackup, importFromFile } from '../services/migration'
import { listTags } from '../services/tags'
import db from '../lib/db'
import type { Tag as TagType } from '../lib/db'
import useStorageInfo, { formatBytes } from '../hooks/useStorageInfo'

export default function SettingsPage() {
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  // 智能曦筑
  const [allTags, setAllTags] = useState<TagType[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storageInfo = useStorageInfo()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [tags, settings] = await Promise.all([
      listTags(),
      db.settings.toArray(),
    ])
    setAllTags(tags)
    if (settings.length > 0) {
      setSelectedTagIds(settings[0].autoXizhuTagIds ?? [])
    }
  }

  // ── 智能曦筑标签切换 ──────────────────────────────

  async function toggleXizhuTag(tagId: number) {
    let newIds: number[]
    if (selectedTagIds.includes(tagId)) {
      newIds = selectedTagIds.filter(id => id !== tagId)
    } else {
      if (selectedTagIds.length >= 3) return // 最多 3 个
      newIds = [...selectedTagIds, tagId]
    }
    setSelectedTagIds(newIds)
    await saveXizhuSettings(newIds)
  }

  async function saveXizhuSettings(tagIds: number[]) {
    const existing = await db.settings.toArray()
    if (existing.length > 0) {
      await db.settings.update(existing[0].id!, { autoXizhuTagIds: tagIds })
    } else {
      await db.settings.add({ autoXizhuTagIds: tagIds })
    }
  }

  // ── 导出 ──────────────────────────────────────────

  async function handleExport() {
    try {
      await downloadBackup()
    } catch {
      setImportError('导出失败，请重试')
    }
  }

  // ── 导入 ──────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setImportError(null)
    setShowImportConfirm(true)
  }

  async function handleImportConfirm() {
    if (!pendingFile) return
    setShowImportConfirm(false)
    setImporting(true)
    setImportError(null)
    setImportResult(null)

    try {
      const result = await importFromFile(pendingFile)
      setImportResult(
        `导入成功！笔记 ${result.notes} 条、标签 ${result.tags} 条、链接 ${result.links} 条、图片 ${result.images} 张`,
      )
      await loadData()
    } catch {
      setImportError('导入失败，请确认文件格式正确')
    } finally {
      setImporting(false)
      setPendingFile(null)
      // 重置 file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleImportCancel() {
    setShowImportConfirm(false)
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── 标签颜色 ──────────────────────────────────────

  const colorMap: Record<string, string> = {
    red: '#EF4444',
    orange: '#F97316',
    yellow: '#EAB308',
    green: '#22C55E',
    blue: '#3B82F6',
    purple: '#A855F7',
    default: '#9B97A8',
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <h1 className="text-xl font-bold text-text-main">设置</h1>

      {/* ── 智能曦筑 ──────────────────────────────── */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-sm font-medium text-text-main mb-3 flex items-center gap-2">
          <Tag size={18} className="text-primary-light" />
          智能曦筑
        </h2>
        <p className="text-xs text-text-secondary mb-3">
          选择最多 3 个标签，包含这些标签的笔记会自动出现在曦筑仪表板
        </p>
        {allTags.length === 0 ? (
          <p className="text-xs text-text-disabled">暂无标签，请先在标签管理中创建</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => {
              const isSelected = selectedTagIds.includes(tag.id!)
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleXizhuTag(tag.id!)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border
                    ${isSelected
                      ? 'border-primary-light/60 text-white shadow-[0_0_10px_rgba(124,58,237,0.3)]'
                      : 'border-white/10 text-text-secondary hover:border-white/20'
                    }`}
                  style={{
                    backgroundColor: isSelected
                      ? colorMap[tag.color] + '20'
                      : 'transparent',
                  }}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-1.5"
                    style={{ backgroundColor: colorMap[tag.color] }}
                  />
                  {tag.name}
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 数据迁移 ──────────────────────────────── */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-sm font-medium text-text-main mb-3 flex items-center gap-2">
          <Smartphone size={18} className="text-primary-light" />
          数据迁移
        </h2>
        <p className="text-xs text-text-secondary mb-4">
          更换手机时，先导出备份文件到旧手机，再在新手机上导入。备份包含所有笔记、标签、链接和图片。
        </p>

        <div className="flex flex-col gap-3">
          {/* 导出 */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
              bg-primary/20 border border-primary-light/30 text-primary-light text-sm font-medium
              hover:bg-primary/30 hover:shadow-[0_0_12px_rgba(124,58,237,0.3)]
              active:scale-[0.98] transition-all duration-200"
          >
            <Download size={18} />
            导出全部数据（JSON）
          </button>

          {/* 导入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl
              bg-bg-input border border-white/10 text-text-secondary text-sm font-medium
              hover:border-white/20 hover:text-text-main
              active:scale-[0.98] transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            从备份文件导入
          </button>
        </div>

        {/* 导入结果 */}
        {importResult && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle2 size={16} className="text-success shrink-0 mt-0.5" />
            <p className="text-xs text-success">{importResult}</p>
          </div>
        )}
        {importError && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle size={16} className="text-error shrink-0 mt-0.5" />
            <p className="text-xs text-error">{importError}</p>
          </div>
        )}
      </section>

      {/* ── 导入确认弹窗 ──────────────────────────── */}
      {showImportConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <AlertTriangle size={20} className="text-warning" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-text-main">确认导入</h3>
                <p className="text-xs text-text-secondary mt-1">
                  导入将<strong className="text-error">清空当前所有数据</strong>并替换为备份文件中的内容。此操作不可撤销。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleImportCancel}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-secondary text-sm
                  hover:border-white/20 transition-all duration-200"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleImportConfirm}
                className="flex-1 py-2.5 rounded-xl bg-error text-white text-sm font-medium
                  hover:shadow-[0_0_12px_rgba(239,68,68,0.4)]
                  active:scale-[0.98] transition-all duration-200"
              >
                确认导入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 存储状态 ──────────────────────────── */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-sm font-medium text-text-main mb-3 flex items-center gap-2">
          <HardDrive size={18} className="text-primary-light" />
          存储状态
        </h2>

        {/* 持久化状态 */}
        <div className="flex items-center gap-3 mb-3">
          {storageInfo.isPersisted === null ? (
            <Loader2 size={16} className="text-text-disabled animate-spin" />
          ) : storageInfo.isPersisted ? (
            <div className="flex items-center gap-2 text-success">
              <ShieldCheck size={16} />
              <span className="text-xs font-medium">数据已受保护</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-warning">
              <ShieldOff size={16} />
              <span className="text-xs font-medium">数据未受保护</span>
            </div>
          )}
        </div>

        {/* 未保护时的提示 */}
        {storageInfo.isPersisted === false && (
          <div className="mb-3 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/15">
            <p className="text-xs text-text-secondary leading-relaxed">
              ⚠️ 当前存储空间可能被浏览器在存储压力大时自动清理。建议：
            </p>
            <ul className="text-xs text-text-secondary mt-1.5 space-y-1 list-disc list-inside">
              <li>将本应用<strong className="text-text-main">安装到桌面</strong>（PWA），安装后浏览器会自动保护数据</li>
              <li>定期使用下方<strong className="text-text-main">导出功能</strong>备份数据</li>
            </ul>
          </div>
        )}

        {/* 用量 */}
        {storageInfo.quota > 0 && (
          <div className="text-xs text-text-disabled">
            已用 {formatBytes(storageInfo.usage)} / 配额 {formatBytes(storageInfo.quota)}
          </div>
        )}
      </section>

      {/* ── 关于 ──────────────────────────────── */}
      <section className="glass rounded-2xl p-5">
        <h2 className="text-sm font-medium text-text-main mb-2">关于</h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          曦月笔记 · 深空中的知识星图
          <br />
          纯本地 PWA 应用，数据保存在设备本地，无需联网。
          <br />
          更换手机时，请使用上方数据迁移功能导出/导入。
        </p>
      </section>
    </div>
  )
}
