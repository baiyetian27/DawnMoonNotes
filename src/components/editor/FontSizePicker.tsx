import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { Type } from 'lucide-react'

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 54, 60]

interface FontSizePickerProps {
  editor: Editor | null
}

export default function FontSizePicker({ editor }: FontSizePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const currentSize = editor?.getAttributes('textStyle').fontSize
    ? parseInt(editor.getAttributes('textStyle').fontSize as string, 10)
    : 16

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function applySize(size: number) {
    if (!editor) return
    // 清除之前的字号再设置新字号
    if (size === 16) {
      editor.chain().focus().unsetMark('textStyle').run()
    } else {
      editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run()
    }
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-text-secondary
          hover:text-text-main hover:bg-white/5 transition-all duration-200"
        title="字号"
      >
        <Type size={16} />
        <span className="w-5 text-center">{currentSize}</span>
      </button>

      {open && (
        <div
          className="absolute left-0 top-10 z-30 glass rounded-xl border border-white/10 overflow-hidden
            shadow-lg max-h-[260px] overflow-y-auto min-w-[64px]"
        >
          {FONT_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => applySize(size)}
              className={`w-full px-3 py-1.5 text-xs text-left transition-all duration-150
                ${size === currentSize
                  ? 'text-primary-light bg-primary/15'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-main'
                }`}
            >
              {size}px
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
