import db, { type Link } from '../lib/db'

// ── 链接管理 ──────────────────────────────────────────

export async function createLink(
  sourceNoteId: number,
  targetNoteId: number,
  sourceTitle: string,
  targetTitle: string,
): Promise<number> {
  // 避免重复链接
  const existing = await db.links
    .where({ sourceNoteId, targetNoteId })
    .first()
  if (existing) return existing.id!

  const id = await db.links.add({
    sourceNoteId,
    targetNoteId,
    sourceTitle,
    targetTitle,
    createdAt: Date.now(),
  })
  return id as number
}

export async function deleteLink(id: number): Promise<void> {
  await db.links.delete(id)
}

/** 获取笔记的反向链接（哪些笔记链接到了我） */
export async function getBacklinks(targetNoteId: number): Promise<Link[]> {
  return db.links.where('targetNoteId').equals(targetNoteId).toArray()
}

/** 获取笔记的正向链接（我链接了哪些笔记） */
export async function getForwardLinks(sourceNoteId: number): Promise<Link[]> {
  return db.links.where('sourceNoteId').equals(sourceNoteId).toArray()
}

/** 保存时同步链接关系：创建新链接，删除已移除的链接 */
export async function syncLinksAfterNoteUpdate(noteId: number, outgoingIds: number[]): Promise<void> {
  // 获取源笔记标题
  const sourceNote = await db.notes.get(noteId)
  const sourceTitle = sourceNote?.title || '无标题'

  // 获取现有链接
  const existing = await db.links
    .where('sourceNoteId').equals(noteId).toArray()
  const existingTargetIds = new Set(existing.map(l => l.targetNoteId))

  // 创建新链接
  for (const targetId of outgoingIds) {
    if (!existingTargetIds.has(targetId) && targetId !== noteId) {
      const targetNote = await db.notes.get(targetId)
      const targetTitle = targetNote?.title || '无标题'
      await db.links.add({
        sourceNoteId: noteId,
        targetNoteId: targetId,
        sourceTitle,
        targetTitle,
        createdAt: Date.now(),
      })
    }
  }

  // 删除不再存在的链接
  for (const link of existing) {
    if (!outgoingIds.includes(link.targetNoteId)) {
      await db.links.delete(link.id!)
    }
  }

  // 更新已保留链接的标题（标题可能已变更）
  for (const link of existing) {
    if (outgoingIds.includes(link.targetNoteId)) {
      if (link.sourceTitle !== sourceTitle) {
        await db.links.update(link.id!, { sourceTitle })
      }
      // 可能的话也更新 target 标题
      const targetNote = await db.notes.get(link.targetNoteId)
      if (targetNote && link.targetTitle !== targetNote.title) {
        await db.links.update(link.id!, { targetTitle: targetNote.title || '无标题' })
      }
    }
  }
}

/** 获取所有链接（用于知识图谱） */
export async function listAllLinks(): Promise<Link[]> {
  return db.links.toArray()
}
