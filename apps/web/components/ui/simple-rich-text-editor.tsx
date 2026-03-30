'use client'

import { useEffect, useMemo, useRef } from 'react'
import { Bold, List, Minus } from 'lucide-react'
import { richTextToPlainText, richTextValueToHtml } from '@/lib/editor/rich-text'

interface SimpleRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function SimpleRichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing…',
}: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    const nextHtml = richTextValueToHtml(value)
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml
    }
  }, [value])

  const isEmpty = useMemo(() => richTextToPlainText(value).length === 0, [value])

  function runCommand(command: string, arg?: string) {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
    document.execCommand(command, false, arg)
    onChange(editor.innerHTML)
  }

  const headingLevels = [
    { label: 'H1', tag: 'h1' },
    { label: 'H2', tag: 'h2' },
    { label: 'H3', tag: 'h3' },
    { label: 'H4', tag: 'h4' },
  ] as const

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm transition focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {headingLevels.map((heading) => (
            <button
              key={heading.tag}
              type="button"
              onClick={() => runCommand('formatBlock', heading.tag)}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold tracking-wide text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
            >
              {heading.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => runCommand('bold')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
        >
          <Bold className="h-3.5 w-3.5" />
          Bold
        </button>
        <button
          type="button"
          onClick={() => runCommand('insertUnorderedList')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
        >
          <List className="h-3.5 w-3.5" />
          Bullet
        </button>
        <button
          type="button"
          onClick={() => runCommand('insertHorizontalRule')}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-brand-200 hover:text-brand-700"
        >
          <Minus className="h-3.5 w-3.5" />
          Divider
        </button>
      </div>

      <div className="relative mt-3 min-h-[180px]">
        {isEmpty ? (
          <div className="pointer-events-none absolute left-0 top-0 text-sm text-slate-400">
            {placeholder}
          </div>
        ) : null}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => onChange((event.currentTarget as HTMLDivElement).innerHTML)}
          className="min-h-[180px] outline-none [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_hr]:my-4 [&_hr]:border-slate-200 [&_p]:mb-3 [&_p]:text-sm [&_p]:leading-6 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6"
        />
      </div>
    </div>
  )
}
