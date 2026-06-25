import { useState, useEffect, useCallback } from 'react'
import { listNotes } from '../services/notes'
import { listTags } from '../services/tags'
import db from '../lib/db'
import type { Note, Tag } from '../lib/db'

export interface XizhuNote {
  note: Note
  tags: Tag[]
  source: 'manual' | 'smart' | 'both'
}

/**
 * 获取曦筑笔记（手动曦筑 + 智能曦筑标签规则合并，去重）
 */
export function useXizhu() {
  const [xizhuNotes, setXizhuNotes] = useState<XizhuNote[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)

    // 1. 获取手动曦筑笔记
    const manualNotes = await listNotes({ isXizhu: true })

    // 2. 获取智能曦筑配置
    const settings = await db.settings.toArray()
    const autoTagIds = settings.length > 0 ? settings[0].autoXizhuTagIds : []

    // 3. 获取智能曦筑笔记（包含自动标签的笔记）
    let smartNotes: Note[] = []
    if (autoTagIds.length > 0) {
      const allNotes = await listNotes()
      smartNotes = allNotes.filter(
        n => n.tags.some(t => autoTagIds.includes(t))
      )
    }

    // 4. 合并去重（按笔记 ID）
    const merged = new Map<number, { note: Note; source: 'manual' | 'smart' | 'both' }>()
    for (const n of manualNotes) {
      merged.set(n.id!, { note: n, source: 'manual' })
    }
    for (const n of smartNotes) {
      if (merged.has(n.id!)) {
        merged.get(n.id!)!.source = 'both'
      } else {
        merged.set(n.id!, { note: n, source: 'smart' })
      }
    }

    // 5. 收集所有标签 ID，批量查询
    const allTagIds = new Set<number>()
    for (const { note } of merged.values()) {
      note.tags.forEach(t => allTagIds.add(t))
    }
    const allTags = await listTags()
    const tagMap = new Map<number, Tag>()
    for (const t of allTags) {
      if (allTagIds.has(t.id!)) tagMap.set(t.id!, t)
    }

    // 6. 组装结果（按更新时间倒序）
    const result: XizhuNote[] = []
    for (const { note, source } of merged.values()) {
      result.push({
        note,
        tags: note.tags.map(tid => tagMap.get(tid)).filter(Boolean) as Tag[],
        source,
      })
    }
    result.sort((a, b) => b.note.updatedAt - a.note.updatedAt)

    setXizhuNotes(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { xizhuNotes, loading, refresh }
}

// ── TipTap 内容中提取待办项 ──────────────────────────

export interface ExtractedTodo {
  index: number
  text: string
  checked: boolean
}

/**
 * 从 TipTap JSON 中提取所有 taskItem
 */
export function extractTodos(content: object): ExtractedTodo[] {
  const todos: ExtractedTodo[] = []
  let idx = 0
  walkNodes(content as Record<string, unknown>, (node, _path) => {
    if (node.type === 'taskItem') {
      const attrs = (node.attrs as Record<string, boolean>) ?? {}
      const text = extractNodeText(node)
      todos.push({
        index: idx++,
        text: text || '(空)',
        checked: attrs.checked ?? false,
      })
    }
  })
  return todos
}

function walkNodes(
  node: Record<string, unknown>,
  fn: (node: Record<string, unknown>, path: string) => void,
  path = '',
) {
  fn(node, path)
  const content = node.content as unknown[]
  if (Array.isArray(content)) {
    content.forEach((child, i) => {
      walkNodes(child as Record<string, unknown>, fn, `${path}.content.${i}`)
    })
  }
}

function extractNodeText(node: Record<string, unknown>): string {
  let text = ''
  const content = node.content as unknown[]
  if (Array.isArray(content)) {
    for (const child of content) {
      const c = child as Record<string, unknown>
      if (c.type === 'text' && typeof c.text === 'string') {
        text += c.text
      } else if (c.type === 'paragraph') {
        text += extractNodeText(c)
      } else if (Array.isArray(c.content)) {
        text += extractNodeText(c)
      }
    }
  }
  return text.trim()
}

/**
 * 切换 TipTap JSON 中指定 taskItem 的 checked 状态
 * 返回更新后的 content 对象
 */
export function toggleTodoInContent(
  content: object,
  todoIndex: number,
): object {
  const cloned = JSON.parse(JSON.stringify(content)) as Record<string, unknown>
  let idx = 0
  walkAndToggle(cloned, todoIndex)
  return cloned

  function walkAndToggle(
    node: Record<string, unknown>,
    targetIdx: number,
  ): boolean {
    if (node.type === 'taskItem') {
      if (idx === targetIdx) {
        const attrs = (node.attrs ?? {}) as Record<string, unknown>
        attrs.checked = !attrs.checked
        return true
      }
      idx++
    }
    const contentArr = node.content as unknown[]
    if (Array.isArray(contentArr)) {
      for (const child of contentArr) {
        if (walkAndToggle(child as Record<string, unknown>, targetIdx)) return true
      }
    }
    return false
  }
}
