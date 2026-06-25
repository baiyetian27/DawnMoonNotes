import db, { type ImageRecord } from '../lib/db'

/**
 * 将图片文件转为 base64 并保存到 IndexedDB
 */
export async function saveImage(file: File, noteId: number): Promise<ImageRecord> {
  const data = await fileToBase64(file)
  const id = await db.images.add({
    noteId,
    data,
    filename: file.name,
    createdAt: Date.now(),
  })
  return (await db.images.get(id))!
}

/**
 * 从 URL 保存图片（用于从网页插入图片）
 */
export async function saveImageFromUrl(url: string, noteId: number, filename?: string): Promise<ImageRecord> {
  const response = await fetch(url)
  const blob = await response.blob()
  const data = await blobToBase64(blob)
  const id = await db.images.add({
    noteId,
    data,
    filename: filename ?? 'image',
    createdAt: Date.now(),
  })
  return (await db.images.get(id))!
}

export async function getImage(id: number): Promise<ImageRecord | undefined> {
  return db.images.get(id)
}

export async function deleteImage(id: number): Promise<void> {
  await db.images.delete(id)
}

/** 清理笔记所有图片 */
export async function deleteNoteImages(noteId: number): Promise<void> {
  await db.images.where('noteId').equals(noteId).delete()
}

// ── 辅助 ──────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
