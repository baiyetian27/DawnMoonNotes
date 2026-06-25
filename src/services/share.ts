import html2canvas from 'html2canvas'

/**
 * 分享笔记为图片（使用 html2canvas 截图 + Web Share API）
 */
export async function shareNoteAsImage(
  element: HTMLElement,
  filename?: string,
): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0F0F1A',
      scale: 2,
      useCORS: true,
      logging: false,
    })

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('canvas toBlob failed'))),
        'image/png',
      )
    })

    const file = new File(
      [blob],
      `${filename ?? '曦月笔记'}.png`,
      { type: 'image/png' },
    )

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: '曦月笔记分享',
        files: [file],
      })
    } else {
      // 降级：下载图片
      downloadBlob(blob, `${filename ?? '曦月笔记'}.png`)
    }
  } catch (err) {
    // 用户取消分享不算错误
    if (err instanceof DOMException && err.name === 'AbortError') return
    throw err
  }
}

/**
 * 分享笔记为纯文本（使用 Web Share API）
 */
export async function shareNoteAsText(
  title: string,
  plainText: string,
): Promise<void> {
  const text = `【${title || '无标题'}】\n\n${plainText}`
  try {
    if (navigator.share) {
      await navigator.share({
        title: title || '曦月笔记',
        text,
      })
    } else {
      // 降级：复制到剪贴板
      await navigator.clipboard.writeText(text)
      // 触发自定义事件通知（页面可以监听显示 toast）
      window.dispatchEvent(new CustomEvent('clipboard-copied', { detail: { text } }))
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    // 备用：仍然复制
    await navigator.clipboard.writeText(text)
    window.dispatchEvent(new CustomEvent('clipboard-copied', { detail: { text } }))
  }
}

/**
 * 下载 Blob 为文件
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
