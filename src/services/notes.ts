import db, { type Note, type Tag } from '../lib/db'

// ── 笔记 CRUD ─────────────────────────────────────────

export async function createNote(data?: {
  title?: string
  subtitle?: string
}): Promise<number> {
  const now = Date.now()
  const id = await db.notes.add({
    title: data?.title ?? '',
    subtitle: data?.subtitle ?? '',
    content: {},
    plainText: '',
    tags: [],
    isXizhu: false,
    isLocked: false,
    outgoingLinks: [],
    createdAt: now,
    updatedAt: now,
  })
  return id as number
}

export async function getNote(id: number): Promise<Note | undefined> {
  return db.notes.get(id)
}

export async function updateNote(
  id: number,
  changes: Partial<Omit<Note, 'id' | 'createdAt'>>,
): Promise<void> {
  // 提取纯文本：如果 content 是 TipTap JSON，遍历提取 text
  if (changes.content !== undefined) {
    changes.plainText = extractPlainText(changes.content)
  }
  await db.notes.update(id, { ...changes, updatedAt: Date.now() })
}

export async function deleteNote(id: number): Promise<void> {
  await db.notes.delete(id)
  // 同时清理关联的链接和图片
  await db.links.where('sourceNoteId').equals(id).delete()
  await db.links.where('targetNoteId').equals(id).delete()
  await db.images.where('noteId').equals(id).delete()
}

export interface NoteFilter {
  tagId?: number
  isXizhu?: boolean
  keyword?: string
}

export async function listNotes(filter?: NoteFilter): Promise<Note[]> {
  let collection = db.notes.orderBy('updatedAt').reverse()

  if (filter?.isXizhu) {
    collection = collection.filter(n => n.isXizhu === true)
  }

  let results = await collection.toArray()

  // 按标签筛选（客户端过滤，Dexie 不支持数组包含查询的优雅写法）
  if (filter?.tagId !== undefined) {
    results = results.filter(n => n.tags.includes(filter.tagId!))
  }

  // 关键词搜索
  if (filter?.keyword) {
    const kw = filter.keyword.toLowerCase()
    results = results.filter(n =>
      n.title.toLowerCase().includes(kw) ||
      n.subtitle.toLowerCase().includes(kw) ||
      n.plainText.toLowerCase().includes(kw),
    )
  }

  return results
}

/** 获取某月笔记（用于日历视图） */
export async function getNotesByMonth(year: number, month: number): Promise<Note[]> {
  const start = new Date(year, month - 1, 1).getTime()
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime()
  return db.notes
    .where('updatedAt')
    .between(start, end, true, true)
    .toArray()
}

/** 获取某天笔记 */
export async function getNotesByDay(year: number, month: number, day: number): Promise<Note[]> {
  const start = new Date(year, month - 1, day).getTime()
  const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime()
  return db.notes
    .where('updatedAt')
    .between(start, end, true, true)
    .toArray()
}

/** 随机获取一条笔记（支持标签筛选） */
export async function getRandomNote(tagId?: number): Promise<Note | undefined> {
  const all = await listNotes(tagId !== undefined ? { tagId } : undefined)
  if (all.length === 0) return undefined
  return all[Math.floor(Math.random() * all.length)]
}

// ── 标签关联查询 ──────────────────────────────────────

/** 根据 ID 批量获取标签 */
export async function getTagsByIds(ids: number[]): Promise<Tag[]> {
  if (ids.length === 0) return []
  return db.tags.where('id').anyOf(ids).toArray()
}

// ── 辅助函数 ──────────────────────────────────────────

function extractPlainText(content: object): string {
  if (!content || typeof content !== 'object') return ''
  const doc = content as Record<string, unknown>
  // TipTap JSON 格式: { type: 'doc', content: [...] }
  if (doc.type === 'doc' && Array.isArray(doc.content)) {
    return extractFromNodes(doc.content as unknown[])
  }
  return ''
}

function extractFromNodes(nodes: unknown[]): string {
  let text = ''
  for (const node of nodes) {
    const n = node as Record<string, unknown>
    if (n.type === 'text' && typeof n.text === 'string') {
      text += n.text + ' '
    }
    if (Array.isArray(n.content)) {
      text += extractFromNodes(n.content as unknown[])
    }
    if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'bulletList' || n.type === 'orderedList') {
      text += '\n'
    }
  }
  return text.trim()
}
