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
 * Check if running inside Android WebView (native bridge available).
 */
function isAndroidWebView(): boolean {
  return typeof window !== 'undefined' && 'Android' in window
}

// Type declaration for the Android bridge injected by WebView
declare global {
  interface Window {
    Android?: {
      saveBackup(jsonData: string, filename: string): void
      pickBackupFile(): void
    }
  }
}

/**
 * Export all data as a JSON object.
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
 * Generate backup filename with current date.
 */
function backupFilename(): string {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `曦月笔记备份_${dateStr}.json`
}

/**
 * Export and trigger download.
 *
 * In Android WebView: calls native bridge to save file to Downloads/曦月笔记/.
 * In browser: creates a blob URL and programmatically clicks a download link.
 *
 * Returns the file path (WebView) or filename (browser).
 */
export async function downloadBackup(): Promise<string> {
  const data = await exportAllData()
  const json = JSON.stringify(data, null, 2)
  const filename = backupFilename()

  if (isAndroidWebView()) {
    // Android WebView — use native bridge to save to Downloads
    return new Promise<string>((resolve, reject) => {
      // Set up global callbacks for the native bridge
      ;(window as unknown as Record<string, unknown>).__xiyueOnExportDone = (savedPath: string) => {
        resolve(savedPath)
      }
      ;(window as unknown as Record<string, unknown>).__xiyueOnExportError = (errorMsg: string) => {
        reject(new Error(errorMsg))
      }

      window.Android!.saveBackup(json, filename)
    })
  }

  // Browser/standalone PWA — use blob URL download
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return filename
}

/**
 * Pick a backup file for import.
 *
 * In Android WebView: opens native file picker, returns file content.
 * In browser: returns a Promise that opens the system file picker via hidden <input>.
 *
 * Returns the parsed BackupData object.
 */
export async function pickFileForImport(): Promise<BackupData> {
  if (isAndroidWebView()) {
    // Android WebView — use native file picker
    const content = await new Promise<string>((resolve, reject) => {
      ;(window as unknown as Record<string, unknown>).__xiyueOnFilePicked = (fileContent: string) => {
        resolve(fileContent)
      }
      ;(window as unknown as Record<string, unknown>).__xiyueOnFileError = (errorMsg: string) => {
        reject(new Error(errorMsg))
      }

      window.Android!.pickBackupFile()
    })

    const data: BackupData = JSON.parse(content)
    if (!data.version || !Array.isArray(data.notes)) {
      throw new Error('无效的备份文件格式')
    }
    return data
  }

  // Browser — use hidden file input
  return new Promise<BackupData>((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('未选择文件'))
        return
      }

      try {
        const text = await file.text()
        const data: BackupData = JSON.parse(text)
        if (!data.version || !Array.isArray(data.notes)) {
          throw new Error('无效的备份文件格式')
        }
        resolve(data)
      } catch (err) {
        reject(err)
      }
    }

    // Clean up on cancel (input never fires change)
    input.oncancel = () => reject(new Error('已取消'))

    input.click()
  })
}

/**
 * Import backup data into the database (clears existing data first).
 * Returns import statistics.
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

  return importFromData(data)
}

/**
 * Import from already-parsed BackupData object (no File needed).
 * Used by the WebView picker path.
 */
export async function importFromData(data: BackupData): Promise<{
  notes: number
  tags: number
  links: number
  images: number
}> {
  // Clear existing data
  await db.notes.clear()
  await db.tags.clear()
  await db.links.clear()
  await db.settings.clear()
  await db.images.clear()

  // Import data (preserve original IDs for link relationships)
  const noteIds = new Map<number, number>()
  const tagIds = new Map<number, number>()

  for (const tag of data.tags) {
    const id = (await db.tags.add(tag as never)) as number
    tagIds.set((tag as Record<string, number>).id, id)
  }

  for (const note of data.notes) {
    const noteData = note as Record<string, unknown>
    const id = (await db.notes.add(noteData as never)) as number
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
