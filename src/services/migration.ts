import db from '../lib/db'

export interface BackupData {
  version: number
  exportedAt: string
  notes: unknown[]
  tags: unknown[]
  links: unknown[]
  settings: unknown[]
  images: unknown[]
}

/**
 * 导出所有数据为 JSON 对象
 */
export async function exportAllData(): Promise<BackupData> {
  const [notes, tags, links, settings, images] = await Promise.all([
    db.notes.toArray(),
    db.tags.toArray(),
    db.links.toArray(),
    db.settings.toArray(),
    db.images.toArray(),
  ])

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    notes: notes.map(({ id, ...rest }) => rest),
    tags: tags.map(({ id, ...rest }) => rest),
    links: links.map(({ id, ...rest }) => rest),
    settings: settings.map(({ id, ...rest }) => rest),
    images: images.map(({ id, ...rest }) => rest),
  }
}

/**
 * 导出并下载 JSON 文件
 */
export async function downloadBackup(): Promise<void> {
  const data = await exportAllData()
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const filename = `曦月笔记备份_${dateStr}.json`

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 从文件导入数据（会清空现有数据后导入）
 * 返回导入的统计信息
 */
export async function importFromFile(file: File): Promise<{
  notes: number
  tags: number
  links: number
  images: number
}> {
  const text = await file.text()
  const data: BackupData = JSON.parse(text)

  if (!data.version || !Array.isArray(data.notes)) {
    throw new Error('无效的备份文件格式')
  }

  // 清空现有数据
  await db.notes.clear()
  await db.tags.clear()
  await db.links.clear()
  await db.settings.clear()
  await db.images.clear()

  // 导入数据（保留原始 ID 以便链接关系一致）
  const noteIds = new Map<number, number>()
  const tagIds = new Map<number, number>()

  for (const tag of data.tags) {
    const id = await db.tags.add(tag as never) as number
    tagIds.set((tag as Record<string, number>).id, id)
  }

  for (const note of data.notes) {
    const noteData = note as Record<string, unknown>
    const id = await db.notes.add(noteData as never) as number
    noteIds.set(noteData.id as number, id)
  }

  for (const link of data.links) {
    const linkData = link as Record<string, number>
    await db.links.add({
      ...linkData,
      sourceNoteId: noteIds.get(linkData.sourceNoteId) ?? linkData.sourceNoteId,
      targetNoteId: noteIds.get(linkData.targetNoteId) ?? linkData.targetNoteId,
    } as never)
  }

  for (const setting of data.settings) {
    const s = setting as Record<string, number[]>
    await db.settings.add({
      ...s,
      autoXizhuTagIds: s.autoXizhuTagIds?.map(oldId => tagIds.get(oldId) ?? oldId) ?? [],
    } as never)
  }

  for (const image of data.images) {
    const imgData = image as Record<string, number>
    await db.images.add({
      ...imgData,
      noteId: noteIds.get(imgData.noteId) ?? imgData.noteId,
    } as never)
  }

  return {
    notes: data.notes.length,
    tags: data.tags.length,
    links: data.links.length,
    images: data.images.length,
  }
}
