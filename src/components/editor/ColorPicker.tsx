import { useState, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { Palette } from 'lucide-react'

const COLORS = [
  { name: '赤', value: '#EF4444' },
  { name: '橙', value: '#F97316' },
  { name: '黄', value: '#EAB308' },
  { name: '绿', value: '#22C55E' },
  { name: '蓝', value: '#3B82F6' },
  { name: '紫', value: '#A855F7' },
  { name: '白', value: '#FFFFFF' },
]

interface ColorPickerProps {
  editor: Editor | null
}

export default function ColorPicker({ editor }: ColorPickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 获取当前选中文字的颜色
  const currentColor = (editor?.getAttributes('textStyle').color as string) ?? null

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function applyColor(color: string) {
    if (!editor) return
    if (color === currentColor) {
      editor.chain().focus().unsetColor().run()
    } else {
      editor.chain().focus().setColor(color).run()
    }
    setOpen(false)
  }

  function resetColor() {
    if (!editor) return
    editor.chain().focus().unsetColor().run()
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-text-secondary
          hover:text-text-main hover:bg-white/5 transition-all duration-200"
        title="文字颜色"
      >
        <Palette size={16} />
        {currentColor && (
          <span
            className="w-3 h-3 rounded-full border border-white/20"
            style={{ backgroundColor: currentColor }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-10 z-30 glass rounded-xl border border-white/10 overflow-hidden
            shadow-lg p-3"
        >
          <p className="text-[10px] text-text-disabled mb-2">文字颜色</p>
          <div className="flex gap-1.5 mb-2">
            {COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => applyColor(c.value)}
                className="w-7 h-7 rounded-full transition-all duration-200 hover:scale-110
                  flex items-center justify-center"
                style={{ backgroundColor: c.value }}
                title={c.name}
              >
                {c.value === currentColor && (
                  <span className="w-2 h-2 rounded-full bg-white shadow-sm" />
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={resetColor}
            className="w-full text-[10px] text-text-disabled hover:text-text-secondary
              transition-colors py-1"
          >
            恢复默认
          </button>
        </div>
      )}
    </div>
  )
}
