'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

export default function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          'min-h-[200px] px-3 py-2 focus:outline-none text-sm text-slate-800 ' +
          '[&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ' +
          '[&_a]:text-violet-600 [&_a]:underline [&_h3]:font-semibold [&_h3]:text-base [&_h3]:mt-2 [&_h3]:mb-1',
      },
    },
  })

  if (!editor) return null

  const btnClass = (active: boolean) =>
    `text-xs font-semibold px-2 py-1 rounded ${active ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50 px-2 py-1.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btnClass(editor.isActive('bold'))}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btnClass(editor.isActive('italic'))}>I</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btnClass(editor.isActive('heading', { level: 3 }))}>H3</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btnClass(editor.isActive('bulletList'))}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btnClass(editor.isActive('orderedList'))}>1. List</button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Link URL')
            if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
          }}
          className={btnClass(editor.isActive('link'))}
        >
          Link
        </button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()} className={btnClass(false)}>Unlink</button>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} className={btnClass(false)}>↺</button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} className={btnClass(false)}>↻</button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
