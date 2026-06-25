import { useState, useEffect } from 'react'

interface StorageInfo {
  isPersisted: boolean | null  // null = 查询中
  usage: number                // 已用字节
  quota: number                // 配额字节
}

export default function useStorageInfo() {
  const [info, setInfo] = useState<StorageInfo>({
    isPersisted: null,
    usage: 0,
    quota: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function check() {
      // 检查持久化状态
      let persisted = false
      if ('storage' in navigator && 'persisted' in navigator.storage) {
        persisted = await navigator.storage.persisted()
      }

      // 估算存储用量
      let usage = 0
      let quota = 0
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const est = await navigator.storage.estimate()
        usage = est.usage ?? 0
        quota = est.quota ?? 0
      }

      if (!cancelled) {
        setInfo({ isPersisted: persisted, usage, quota })
      }
    }

    check()
    return () => { cancelled = true }
  }, [])

  return info
}

/** 格式化字节为可读大小 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
