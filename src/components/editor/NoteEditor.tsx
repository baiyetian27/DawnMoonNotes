import { forwardRef, useImperativeHandle, useEffect, useRef } from 'react'
import { EditorContent, type Editor } from '@tiptap/react'
import { useEditor } from '@tiptap/react'
import { createRoot } from 'react-dom/client'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import FontFamily from '@tiptap/extension-font-family'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import MentionSuggestion, { fetchMentionItems } from './MentionSuggestion'

export interface NoteEditorHandle {
  getEditor: () => Editor | null
}

interface NoteEditorProps {
  content: object
  onUpdate: (json: object, text: string) => void
  onEditorReady?: (editor: Editor) => void
  editable: boolean
}

const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  function NoteEditor({ content, onUpdate, onEditorReady, editable }, ref) {
    const onEditorReadyRef = useRef(onEditorReady)
    onEditorReadyRef.current = onEditorReady
    const onUpdateRef = useRef(onUpdate)
    onUpdateRef.current = onUpdate

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        TextStyle,
        Color,
        FontFamily,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
          alignments: ['left', 'center', 'right'],
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
        Table.configure({
          resizable: false,
        }),
        TableRow,
        TableCell,
        TableHeader,
        Image.configure({
          allowBase64: true,
        }),
        Placeholder.configure({
          placeholder: '开始书写...',
        }),
        Mention.configure({
          HTMLAttributes: {
            class: 'mention-link',
          },
          renderHTML({ node }) {
            const displayLabel = node.attrs.label ?? `笔记#${node.attrs.id}`
            return [
              'span',
              {
                class: 'mention-link',
                'data-mention-id': node.attrs.id,
                'data-label': node.attrs.label ?? '',
                title: `跳转到: ${displayLabel}`,
                style: 'color: #A855F7; cursor: pointer; text-decoration: underline; text-underline-offset: 2px;',
              },
              `@${displayLabel}`,
            ]
          },
          suggestion: {
            char: '@',
            items: async ({ query }) => {
              return fetchMentionItems(query)
            },
            render: () => {
              let popup: HTMLDivElement | null = null
              let root: ReturnType<typeof createRoot> | null = null
              let currentItems: Parameters<typeof MentionSuggestion>[0]['items'] = []
              let currentQuery = ''

              function cleanup() {
                if (root) {
                  root.unmount()
                  root = null
                }
                if (popup) {
                  popup.remove()
                  popup = null
                }
              }

              return {
                onStart(props) {
                  currentItems = props.items as Parameters<typeof MentionSuggestion>[0]['items']
                  currentQuery = props.query
                  popup = document.createElement('div')
                  popup.className = 'mention-suggestion-popup'
                  popup.style.position = 'fixed'
                  popup.style.zIndex = '9999'
                  document.body.appendChild(popup)

                  // Position relative to cursor
                  if (props.clientRect) {
                    const rect = props.clientRect()
                    if (rect) {
                      popup.style.left = `${rect.left}px`
                      popup.style.top = `${rect.bottom + 4}px`
                    }
                  }

                  root = createRoot(popup)
                  root.render(
                    <MentionSuggestion
                      query={currentQuery}
                      items={currentItems as Parameters<typeof MentionSuggestion>[0]['items']}
                      command={(item) => {
                        props.command(item)
                        cleanup()
                      }}
                    />,
                  )
                },
                onUpdate(props) {
                  currentItems = props.items as Parameters<typeof MentionSuggestion>[0]['items']
                  currentQuery = props.query

                  // Update position
                  if (popup && props.clientRect) {
                    const rect = props.clientRect()
                    if (rect) {
                      popup.style.left = `${rect.left}px`
                      popup.style.top = `${rect.bottom + 4}px`
                    }
                  }

                  if (root) {
                    root.render(
                      <MentionSuggestion
                        query={currentQuery}
                        items={currentItems as Parameters<typeof MentionSuggestion>[0]['items']}
                        command={(item) => {
                          props.command(item)
                          cleanup()
                        }}
                      />,
                    )
                  }
                },
                onExit() {
                  cleanup()
                },
                onKeyDown(props) {
                  if (popup) {
                    // Forward keyboard event to the popup
                    const event = new KeyboardEvent('keydown', {
                      key: props.event.key,
                      bubbles: true,
                    })
                    popup.dispatchEvent(event)
                    // If it was handled by the popup (Enter/Arrow), prevent default
                    if (['ArrowUp', 'ArrowDown', 'Enter'].includes(props.event.key)) {
                      return true
                    }
                  }
                  return false
                },
              }
            },
          },
        }),
      ],
      content,
      editable,
      onUpdate: ({ editor: ed }) => {
        onUpdateRef.current(ed.getJSON(), ed.getText())
      },
      editorProps: {
        attributes: {
          class:
            'prose prose-invert prose-sm max-w-none focus:outline-none min-h-[300px]',
        },
      },
    })

    useImperativeHandle(ref, () => ({
      getEditor: () => editor,
    }), [editor])

    // 通知父组件编辑器已就绪（只触发一次）
    useEffect(() => {
      if (editor) {
        onEditorReadyRef.current?.(editor)
      }
    }, [editor])

    // 同步 editable 状态
    useEffect(() => {
      if (editor && editor.isEditable !== editable) {
        editor.setEditable(editable)
      }
    }, [editor, editable])

    return (
      <div className="note-editor-wrapper">
        <EditorContent editor={editor} />
      </div>
    )
  },
)

export default NoteEditor
