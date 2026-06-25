import Dexie, { type EntityTable } from 'dexie'

// ── 数据模型 ──────────────────────────────────────────

export interface Note {
  id?: number
  title: string
  subtitle: string
  content: object           // TipTap 编辑器 JSON
  plainText: string         // 正文纯文本，用于搜索
  tags: number[]            // 关联标签 ID
  isXizhu: boolean          // 是否曦筑（置顶）
  isLocked: boolean         // 是否加锁
  outgoingLinks: number[]   // 链接到的笔记 ID
  createdAt: number         // Unix timestamp ms
  updatedAt: number
}

export interface Tag {
  id?: number
  name: string              // 标签名，最长 10 字
  color: string             // red | orange | yellow | green | blue | purple | default
  createdAt: number
}

export interface Link {
  id?: number
  sourceNoteId: number
  targetNoteId: number
  sourceTitle: string
  targetTitle: string
  createdAt: number
}

export interface AppSettings {
  id?: number
  autoXizhuTagIds: number[]  // 智能曦筑标签 ID（最多 3 个）
}

export interface ImageRecord {
  id?: number
  noteId: number
  data: string              // base64 data URL
  filename: string
  createdAt: number
}

// ── 数据库定义 ────────────────────────────────────────

const db = new Dexie('XiyueNotes') as Dexie & {
  notes: EntityTable<Note, 'id'>
  tags: EntityTable<Tag, 'id'>
  links: EntityTable<Link, 'id'>
  settings: EntityTable<AppSettings, 'id'>
  images: EntityTable<ImageRecord, 'id'>
}

db.version(1).stores({
  notes: '++id, title, plainText, tags, isXizhu, isLocked, updatedAt',
  tags: '++id, name',
  links: '++id, sourceNoteId, targetNoteId',
  settings: '++id',
  images: '++id, noteId',
})

// v2: 给 tags 添加 createdAt 索引
db.version(2).stores({
  tags: '++id, name, createdAt',
})

export default db
