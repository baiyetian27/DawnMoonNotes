import db, { type Tag } from '../lib/db'

// ── 标签 CRUD ─────────────────────────────────────────

export async function createTag(name: string, color: string): Promise<number> {
  const id = await db.tags.add({
    name,
    color,
    createdAt: Date.now(),
  })
  return id as number
}

export async function getTag(id: number): Promise<Tag | undefined> {
  return db.tags.get(id)
}

export async function updateTag(
  id: number,
  changes: Partial<Pick<Tag, 'name' | 'color'>>,
): Promise<void> {
  await db.tags.update(id, changes)
}

export async function deleteTag(id: number): Promise<void> {
  await db.tags.delete(id)
  // 清理所有笔记中关联该标签的引用
  const notes = await db.notes.filter(n => n.tags.includes(id)).toArray()
  for (const note of notes) {
    await db.notes.update(note.id!, {
      tags: note.tags.filter(t => t !== id),
    })
  }
  // 清理智能曦筑设置中的引用
  const settings = await db.settings.toArray()
  for (const s of settings) {
    if (s.autoXizhuTagIds.includes(id)) {
      await db.settings.update(s.id!, {
        autoXizhuTagIds: s.autoXizhuTagIds.filter(t => t !== id),
      })
    }
  }
}

export async function listTags(): Promise<Tag[]> {
  return db.tags.orderBy('createdAt').toArray()
}

/** 标签颜色预设 */
export const TAG_COLORS = [
  { value: 'red', label: '赤', hex: '#EF4444' },
  { value: 'orange', label: '橙', hex: '#F97316' },
  { value: 'yellow', label: '黄', hex: '#EAB308' },
  { value: 'green', label: '绿', hex: '#22C55E' },
  { value: 'blue', label: '蓝', hex: '#3B82F6' },
  { value: 'purple', label: '紫', hex: '#A855F7' },
  { value: 'default', label: '白', hex: '#FFFFFF' },
] as const

export function getTagColorHex(colorValue: string): string {
  return TAG_COLORS.find(c => c.value === colorValue)?.hex ?? '#FFFFFF'
}
