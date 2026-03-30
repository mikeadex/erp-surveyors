'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, FileCode2, FilePlus2, Loader2, PencilLine } from 'lucide-react'
import { ModalShell } from '@/components/ui/modal-shell'

type TemplateRecord = {
  id: string
  name: string
  valuationType: string
  templateHtml: string
  defaultAssumptions: Array<{ id?: string; text?: string } | string>
  defaultDisclaimers: Array<{ id?: string; text?: string } | string>
  isActive: boolean
  updatedAt: string
}

type TemplateFormState = {
  name: string
  valuationType:
    | 'market'
    | 'rental'
    | 'mortgage'
    | 'insurance'
    | 'probate'
    | 'commercial'
    | 'land'
  templateHtml: string
  defaultAssumptions: string
  defaultDisclaimers: string
  isActive: boolean
}

const emptyForm: TemplateFormState = {
  name: '',
  valuationType: 'market',
  templateHtml: '',
  defaultAssumptions: '',
  defaultDisclaimers: '',
  isActive: true,
}

function toLines(items: Array<{ text?: string } | string>) {
  return items
    .map((item) => (typeof item === 'string' ? item : item.text ?? ''))
    .filter(Boolean)
    .join('\n')
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function labelize(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export function ReportTemplateManager({
  templates,
  canManage,
}: {
  templates: TemplateRecord[]
  canManage: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [form, setForm] = useState<TemplateFormState>(emptyForm)

  const activeTemplate = useMemo(
    () => templates.find((template) => template.isActive) ?? null,
    [templates],
  )

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setErrorMsg(null)
    setPreviewHtml(null)
    setOpen(true)
  }

  function openEdit(template: TemplateRecord) {
    setEditingId(template.id)
    setForm({
      name: template.name,
      valuationType: template.valuationType as TemplateFormState['valuationType'],
      templateHtml: template.templateHtml,
      defaultAssumptions: toLines(template.defaultAssumptions),
      defaultDisclaimers: toLines(template.defaultDisclaimers),
      isActive: template.isActive,
    })
    setErrorMsg(null)
    setPreviewHtml(null)
    setOpen(true)
  }

  async function submitForm() {
    setErrorMsg(null)

    const payload = {
      name: form.name.trim(),
      valuationType: form.valuationType,
      templateHtml: form.templateHtml,
      defaultAssumptions: splitLines(form.defaultAssumptions),
      defaultDisclaimers: splitLines(form.defaultDisclaimers),
      isActive: form.isActive,
    }

    const endpoint = editingId ? `/api/v1/report-templates/${editingId}` : '/api/v1/report-templates'
    const method = editingId ? 'PATCH' : 'POST'

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to save report template')
      return
    }

    setOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setPreviewHtml(null)
    startTransition(() => router.refresh())
  }

  async function previewTemplate() {
    setErrorMsg(null)

    const res = await fetch('/api/v1/report-templates/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim() || 'Template Preview',
        valuationType: form.valuationType,
        templateHtml: form.templateHtml,
        defaultDisclaimers: splitLines(form.defaultDisclaimers),
      }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to preview report template')
      return
    }

    setPreviewHtml(json.data.html ?? '')
  }

  return (
    <>
      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.28)] sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
              Template Control
            </p>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Manage firm report templates
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Set the active valuation template, tailor default assumptions and disclaimers,
                and optionally override the built-in HTML layout when your team needs a bespoke
                report structure.
              </p>
            </div>
          </div>

          {canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800"
            >
              <FilePlus2 className="h-4 w-4" />
              New Template
            </button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Active Template
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              {activeTemplate?.name ?? 'Built-in standard template'}
            </p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Templates
            </p>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{templates.length}</p>
          </div>
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              Layout Note
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If template HTML is left alone, report generation uses the platform’s default layout.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {templates.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-sm text-slate-500">
              No firm templates yet. Generated reports will use the built-in standard layout until
              you add one here.
            </div>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="rounded-[24px] border border-slate-200 bg-white px-5 py-4"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{template.name}</h3>
                      {template.isActive ? (
                        <span className="inline-flex rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-500">
                      {labelize(template.valuationType)} · Updated{' '}
                      {new Date(template.updatedAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {template.defaultAssumptions.length} assumptions
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {template.defaultDisclaimers.length} disclaimers
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {template.templateHtml.trim() ? 'Custom layout saved' : 'Built-in layout'}
                      </span>
                    </div>
                  </div>

                  {canManage ? (
                    <button
                      type="button"
                      onClick={() => openEdit(template)}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      <PencilLine className="h-4 w-4" />
                      Edit
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {open ? (
        <ModalShell
          title={editingId ? 'Edit Report Template' : 'Create Report Template'}
          description="Keep it simple with assumptions and disclaimers, or expand the HTML layout in the advanced section."
          onClose={() => setOpen(false)}
          widthClassName="max-w-4xl"
        >
          <div className="space-y-5">
            <section className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Template Name
                </label>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Prime market valuation"
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Valuation Type
                </label>
                <select
                  value={form.valuationType}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      valuationType: event.target.value as TemplateFormState['valuationType'],
                    }))
                  }
                  className="block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="market">Market</option>
                  <option value="rental">Rental</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="insurance">Insurance</option>
                  <option value="probate">Probate</option>
                  <option value="commercial">Commercial</option>
                  <option value="land">Land</option>
                </select>
              </div>
              <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 md:col-span-2">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                />
                Make this the active template for new reports
              </label>
            </section>

            <section className="grid gap-4 rounded-[24px] border border-slate-200 bg-white p-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Default Assumptions
                </label>
                <textarea
                  rows={7}
                  value={form.defaultAssumptions}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, defaultAssumptions: event.target.value }))
                  }
                  placeholder={'Each line becomes one assumption\nProperty title supplied is good and marketable\nNo undisclosed structural defects exist'}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                  Default Disclaimers
                </label>
                <textarea
                  rows={7}
                  value={form.defaultDisclaimers}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, defaultDisclaimers: event.target.value }))
                  }
                  placeholder={'Each line becomes one disclaimer\nThis report is for the stated purpose only\nNo third-party reliance without written consent'}
                  className="block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
              </div>
            </section>

            <section className="rounded-[24px] border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Advanced HTML Layout</p>
                  <p className="text-xs text-slate-500">
                    Optional. Leave this as-is if you want to keep the platform’s default report layout.
                  </p>
                </div>
              </div>

              <textarea
                rows={14}
                value={form.templateHtml}
                onChange={(event) =>
                  setForm((current) => ({ ...current, templateHtml: event.target.value }))
                }
                placeholder="Optional custom Handlebars HTML template"
                className="mt-4 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 font-mono text-xs leading-6 text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
            </section>

            {previewHtml ? (
              <section className="rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Template Preview</p>
                    <p className="text-xs text-slate-500">
                      Sample data rendered through the current template draft.
                    </p>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto rounded-[20px] border border-slate-200 bg-slate-50/50 px-4 py-4">
                  <div
                    className="min-w-[820px] rounded-[18px] bg-white p-4 shadow-sm"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </section>
            ) : null}

            {errorMsg ? (
              <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMsg}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={previewTemplate}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Preview Template
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitForm}
                disabled={isPending}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
                {editingId ? 'Save Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  )
}
