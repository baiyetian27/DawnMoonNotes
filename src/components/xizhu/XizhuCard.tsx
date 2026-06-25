import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Check, Square } from 'lucide-react'
import { getTagColorHex } from '../../services/tags'
import { updateNote } from '../../services/notes'
import {
  extractTodos,
  toggleTodoInContent,
  type XizhuNote,
  type ExtractedTodo,
} from '../../hooks/useXizhu'

interface Props {
  xizhuNote: XizhuNote
  onUpdate: () => void
}

export default function XizhuCard({ xizhuNote, onUpdate }: Props) {
  const navigate = useNavigate()
  const { note, tags, source } = xizhuNote
  const [todos, setTodos] = useState<ExtractedTodo[]>(() =>
    typeof note.content === 'object' && note.content !== null
      ? extractTodos(note.content)
      : [],
  )

  async function handleToggleTodo(todoIdx: number) {
    if (note.isLocked) return
    const newContent = toggleTodoInContent(note.content, todoIdx)
    setTodos(extractTodos(newContent))
    await updateNote(note.id!, { content: newContent })
    onUpdate()
  }

  function formatTime(ts: number): string {
    const date = new Date(ts)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const mins = String(date.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${mins}`
  }

  return (
    <div
      className={`glass rounded-2xl p-4 cursor-pointer group transition-all duration-200
        hover:shadow-[0_4px_20px_rgba(124,58,237,0.12)]
        ${note.isXizhu || source === 'both'
          ? 'border border-primary-light/40 glow-xizhu'
          : 'border border-primary-light/10'
        }`}
      onClick={() => navigate(`/note/${note.id}`)}
    >
      {/* 标题区 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-text-main truncate">
              {note.title || '无标题'}
            </h3>
            {note.isLocked && <Lock size={12} className="text-warning shrink-0" />}
          </div>
          {note.subtitle && (
            <p className="text-xs text-text-secondary mt-0.5 truncate">
              {note.subtitle}
            </p>
          )}
        </div>

        {/* 来源标记 */}
        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary-light shrink-0">
          {source === 'manual' ? '手动' : source === 'smart' ? '智能' : '双源'}
        </span>
      </div>

      {/* 标签 */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map(tag => (
            <span
              key={tag.id}
              className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-text-disabled"
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                style={{ backgroundColor: getTagColorHex(tag.color) }}
              />
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* 正文摘要 */}
      {note.plainText && (
        <p className="text-xs text-text-disabled line-clamp-2 mb-2">
          {note.plainText}
        </p>
      )}

      {/* 内联待办项 */}
      {todos.length > 0 && (
        <div className="space-y-1 mb-2" onClick={(e) => e.stopPropagation()}>
          {todos.slice(0, 5).map(todo => (
            <button
              key={todo.index}
              type="button"
              onClick={() => handleToggleTodo(todo.index)}
              disabled={note.isLocked}
              className="flex items-start gap-2 w-full text-left px-2 py-1 rounded-lg
                hover:bg-white/5 transition-colors group/todo"
            >
              <span className="shrink-0 mt-0.5">
                {todo.checked ? (
                  <Check
                    size={14}
                    className="text-success drop-shadow-[0_0_4px_rgba(34,197,94,0.5)]"
                  />
                ) : (
                  <Square
                    size={14}
                    className="text-text-disabled group-hover/todo:text-text-secondary transition-colors"
                  />
                )}
              </span>
              <span
                className={`text-xs ${
                  todo.checked
                    ? 'text-text-disabled line-through'
                    : 'text-text-secondary'
                }`}
              >
                {todo.text}
              </span>
            </button>
          ))}
          {todos.length > 5 && (
            <p className="text-[10px] text-text-disabled px-2">
              +{todos.length - 5} 项待办
            </p>
          )}
        </div>
      )}

      {/* 底部时间 */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-disabled">
          {formatTime(note.updatedAt)}
        </span>
      </div>
    </div>
  )
}
