import { useState, useEffect, useCallback } from 'react'

interface StorageInfo {
  isPersisted: boolean | null  // null = 查询中
  usage: number                // 已用字节
  quota: number                // 配额字节
}

interface UseStorageInfoReturn extends StorageInfo {
  /** 当前是否正在请求持久化权限 */
  loading: boolean
  /** 主动请求存储持久化保护，返回是否授予 */
  requestPersist: () => Promise<boolean>
  /** 重新查询存储状态（持久化 + 用量） */
  refresh: () => Promise<void>
}

export default function useStorageInfo(): UseStorageInfoReturn {
  const [info, setInfo] = useState<StorageInfo>({
    isPersisted: null,
    usage: 0,
    quota: 0,
  })
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    let persisted = false
    let usage = 0
    let quota = 0

    // Check persistence status
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      try {
        persisted = await navigator.storage.persisted()
      } catch {
        // API may throw on some browsers; treat as not persisted
      }
    }

    // Estimate storage usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const est = await navigator.storage.estimate()
        usage = est.usage ?? 0
        quota = est.quota ?? 0
      } catch {
        // Non-critical, leave as 0
      }
    }

    setInfo({ isPersisted: persisted, usage, quota })
  }, [])

  const requestPersist = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const granted = await navigator.storage.persist()
        // Re-check to get the definitive status after requesting
        await refresh()
        return granted
      }
      return false
    } catch {
      return false
    } finally {
      setLoading(false)
    }
  }, [refresh])

  // On mount: request persistence, then check status
  useEffect(() => {
    let cancelled = false

    async function init() {
      // Request persistent storage
      if ('storage' in navigator && 'persist' in navigator.storage) {
        try {
          await navigator.storage.persist()
        } catch {
          // Silent fail — we'll show status from persisted() below
        }
      }
      // Refresh state after the request settles
      if (!cancelled) await refresh()
    }

    init()
    return () => { cancelled = true }
  }, [refresh])

  // Re-check when the page becomes visible again
  // (e.g. user installed PWA in another tab and came back)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  return { ...info, loading, requestPersist, refresh }
}

/** 格式化字节为可读大小 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
