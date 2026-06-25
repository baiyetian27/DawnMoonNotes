import { useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export default function SearchBar({
  value,
  onChange,
  placeholder = '搜索笔记...',
  autoFocus = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) {
      // 延迟聚焦，避免移动端键盘弹出时序问题
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  return (
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-text-disabled pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-bg-input border border-white/10 rounded-xl pl-9 pr-9 py-2.5
          text-sm text-text-main placeholder:text-text-disabled
          focus:outline-none focus:border-primary-light/40 focus:shadow-[0_0_10px_rgba(124,58,237,0.15)]
          transition-all duration-200"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded
            text-text-disabled hover:text-text-secondary transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
