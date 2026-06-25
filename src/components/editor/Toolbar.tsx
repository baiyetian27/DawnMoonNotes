import { useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  CheckSquare,
  Table as TableIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
} from 'lucide-react'
import FontSizePicker from './FontSizePicker'
import ColorPicker from './ColorPicker'

interface ToolbarProps {
  editor: Editor | null
}

export default function Toolbar({ editor }: ToolbarProps) {
  const insertImage = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file || !editor) return
      const reader = new FileReader()
      reader.onload = () => {
        editor.chain().focus().setImage({ src: reader.result as string }).run()
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }, [editor])

  const addTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 2, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  if (!editor) return null

  const btnBase =
    'p-1.5 rounded-md text-text-secondary transition-all duration-200'
  const btnActive =
    'text-primary-light bg-primary/15'
  const btnInactive =
    'hover:text-text-main hover:bg-white/5'

  function btnClass(active: boolean) {
    return `${btnBase} ${active ? btnActive : btnInactive}`
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-1 py-1.5 mb-3 border-b border-white/5">
      {/* 历史操作 */}
      <div className="flex items-center gap-0.5 mr-2">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className={`${btnBase} ${btnInactive}`}
          title="撤销"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className={`${btnBase} ${btnInactive}`}
          title="重做"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* 文本样式 */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}
          title="加粗"
        >
          <Bold size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}
          title="斜体"
        >
          <Italic size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive('underline'))}
          title="下划线"
        >
          <UnderlineIcon size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btnClass(editor.isActive('strike'))}
          title="删除线"
        >
          <Strikethrough size={16} />
        </button>
      </div>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* 字号 + 颜色 */}
      <FontSizePicker editor={editor} />
      <ColorPicker editor={editor} />

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* 对齐 */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={btnClass(editor.isActive({ textAlign: 'left' }))}
          title="左对齐"
        >
          <AlignLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={btnClass(editor.isActive({ textAlign: 'center' }))}
          title="居中对齐"
        >
          <AlignCenter size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={btnClass(editor.isActive({ textAlign: 'right' }))}
          title="右对齐"
        >
          <AlignRight size={16} />
        </button>
      </div>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* 列表 */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}
          title="无序列表"
        >
          <List size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))}
          title="有序列表"
        >
          <ListOrdered size={16} />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          className={btnClass(editor.isActive('taskList'))}
          title="待办事项"
        >
          <CheckSquare size={16} />
        </button>
      </div>

      <div className="w-px h-5 bg-white/10 mx-1" />

      {/* 插入 */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={addTable}
          className={`${btnBase} ${btnInactive}`}
          title="插入表格"
        >
          <TableIcon size={16} />
        </button>
        <button
          type="button"
          onClick={insertImage}
          className={`${btnBase} ${btnInactive}`}
          title="插入图片"
        >
          <ImageIcon size={16} />
        </button>
      </div>
    </div>
  )
}
