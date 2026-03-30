'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateClientSchema, type CreateClientInput } from '@valuation-os/utils'
import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { SimpleRichTextEditor } from '@/components/ui/simple-rich-text-editor'

const FIELD = (label: string, id: keyof CreateClientInput, type = 'text', required = false) =>
  ({ label, id, type, required }) as const

const BASIC_FIELDS = [
  FIELD('Full Name / Company Name', 'name', 'text', true),
  FIELD('Email', 'email', 'email'),
  FIELD('Phone', 'phone', 'tel'),
  FIELD('RC Number (corporate)', 'rcNumber'),
]

const ADDRESS_FIELDS = [
  FIELD('Address', 'address'),
  FIELD('City', 'city'),
  FIELD('State', 'state'),
]

interface BranchOption {
  id: string
  name: string
}

interface NewClientFormProps {
  branches: BranchOption[]
  initialBranchId?: string | undefined
  canSelectBranch?: boolean
}

type ClientCreateRequest = CreateClientInput & {
  allowDuplicate?: boolean
}

const sectionClassName = 'rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 space-y-4'
const inputClassName =
  'block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100'
const labelClassName = 'mb-1 block text-xs font-medium text-slate-700'
const secondaryButtonClassName =
  'rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50'

export function NewClientForm({
  branches,
  initialBranchId,
  canSelectBranch = false,
  onCancel,
}: NewClientFormProps & { onCancel?: () => void }) {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [tagsInput, setTagsInput] = useState('')
  const [duplicateWarnings, setDuplicateWarnings] = useState<Array<{
    id: string
    name: string
    score: number
    email: string | null
    phone: string | null
    rcNumber: string | null
  }>>([])
  const [pendingDuplicatePayload, setPendingDuplicatePayload] = useState<ClientCreateRequest | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(CreateClientSchema),
    defaultValues: { type: 'individual', contacts: [], tags: [], branchId: initialBranchId },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' })
  const clientType = watch('type')
  const notesValue = watch('notes') ?? ''

  async function submitPayload(payload: ClientCreateRequest) {
    const res = await fetch('/api/v1/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))

    if (res.status === 409 && json?.error?.code === 'DUPLICATE_CLIENT') {
      setDuplicateWarnings(json?.data?.duplicateMatches ?? [])
      setPendingDuplicatePayload(payload)
      setErrorMsg('Possible duplicates found. Review the matches before creating this client.')
      return
    }

    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to create client')
      return
    }

    setPendingDuplicatePayload(null)
    setDuplicateWarnings([])
    router.push(`/clients/${json.data.id}`)
  }

  async function onSubmit(data: CreateClientInput) {
    setErrorMsg(null)
    setDuplicateWarnings([])
    setPendingDuplicatePayload(null)
    const payload: ClientCreateRequest = {
      ...data,
      tags: tagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
    }
    await submitPayload(payload)
  }

  async function createDespiteDuplicates() {
    if (!pendingDuplicatePayload) return
    setErrorMsg(null)
    await submitPayload({ ...pendingDuplicatePayload, allowDuplicate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className={sectionClassName}>
        <h2 className="text-sm font-semibold text-slate-900">Client Details</h2>

        <div>
          <label className={`${labelClassName} mb-2`}>
            Client Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            {(['individual', 'corporate'] as const).map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  {...register('type')}
                  type="radio"
                  value={t}
                  className="text-brand-600 focus:ring-brand-500"
                />
                <span className="capitalize">{t}</span>
              </label>
            ))}
          </div>
        </div>

        {branches.length > 0 && (
          <div>
            <label htmlFor="branchId" className={labelClassName}>
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              {...register('branchId')}
              id="branchId"
              disabled={!canSelectBranch}
              className={`${inputClassName} disabled:bg-slate-100 disabled:text-slate-500`}
            >
              <option value="">Select branch…</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {canSelectBranch
                ? 'Assign this client to the branch that owns the relationship.'
                : 'Your branch assignment is applied automatically.'}
            </p>
            {errors.branchId && (
              <p className="mt-1 text-xs text-red-600">{errors.branchId.message}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BASIC_FIELDS.filter((f) => {
            if (f.id === 'rcNumber') return clientType === 'corporate'
            return true
          }).map(({ label, id, type, required }) => (
            <div key={id} className={id === 'name' ? 'sm:col-span-2' : ''}>
              <label htmlFor={id} className={labelClassName}>
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                {...register(id)}
                id={id}
                type={type}
                className={inputClassName}
              />
              {errors[id] && (
                <p className="mt-1 text-xs text-red-600">{errors[id]?.message}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={sectionClassName}>
        <h2 className="text-sm font-semibold text-slate-900">Address</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ADDRESS_FIELDS.map(({ label, id }) => (
            <div key={id} className={id === 'address' ? 'sm:col-span-2' : ''}>
              <label htmlFor={id} className={labelClassName}>
                {label}
              </label>
              <input
                {...register(id)}
                id={id}
                className={inputClassName}
              />
            </div>
          ))}
        </div>

        <div>
          <label htmlFor="tags" className={labelClassName}>
            Tags
          </label>
          <input
            id="tags"
            placeholder="bank, repeat-client, priority"
            className={inputClassName}
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Separate tags with commas. They are normalized to lowercase on save.
          </p>
          {errors.tags && (
            <p className="mt-1 text-xs text-red-600">{errors.tags.message as string}</p>
          )}
        </div>

        <div>
          <label htmlFor="notes" className={labelClassName}>
            Relationship Notes
          </label>
          <SimpleRichTextEditor
            value={notesValue}
            onChange={(nextValue) => setValue('notes', nextValue, { shouldDirty: true })}
            placeholder="Capture context about the relationship, billing preferences, or internal client notes."
          />
          {errors.notes && (
            <p className="mt-1 text-xs text-red-600">{errors.notes.message}</p>
          )}
        </div>
      </section>

      {clientType === 'corporate' && (
        <section className={sectionClassName}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Contacts</h2>
            <button
              type="button"
              onClick={() => append({ name: '', email: undefined, phone: undefined, role: undefined, isPrimary: fields.length === 0 })}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 transition hover:text-brand-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add contact
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 rounded-[22px] border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-700">Contact {index + 1}</p>
                <button type="button" onClick={() => remove(index)}>
                  <Trash2 className="h-3.5 w-3.5 text-slate-400 transition hover:text-red-500" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['name', 'email', 'phone', 'role'] as const).map((f) => (
                  <div key={f}>
                    <input
                      {...register(`contacts.${index}.${f}`)}
                      placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                      className={`${inputClassName} px-3 py-2.5`}
                    />
                  </div>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                <input
                  {...register(`contacts.${index}.isPrimary`)}
                  type="checkbox"
                  className="rounded border-slate-300 text-brand-600"
                />
                Primary contact
              </label>
            </div>
          ))}
        </section>
      )}

      {errorMsg && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

      {duplicateWarnings.length > 0 && (
        <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">Possible duplicates detected</h3>
          <p className="mt-1 text-sm text-amber-800">
            These existing records look similar. Review them before creating a new client record.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            {duplicateWarnings.map((match) => (
              <li key={match.id} className="rounded-2xl bg-white/70 px-3 py-2">
                <div className="font-medium">{match.name}</div>
                <div className="text-xs text-amber-700">
                  Match score {match.score}
                  {match.email ? ` • ${match.email}` : ''}
                  {match.phone ? ` • ${match.phone}` : ''}
                  {match.rcNumber ? ` • ${match.rcNumber}` : ''}
                </div>
                <div className="mt-2">
                  <Link href={`/clients/${match.id}`} className="text-xs font-semibold text-amber-900 underline">
                    Review existing client
                  </Link>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setDuplicateWarnings([])
                setPendingDuplicatePayload(null)
                setErrorMsg(null)
              }}
              className="rounded-2xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
            >
              Cancel Review
            </button>
            <button
              type="button"
              onClick={createDespiteDuplicates}
              className="rounded-2xl bg-amber-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800"
            >
              Create Anyway
            </button>
          </div>
        </section>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => (onCancel ? onCancel() : router.back())}
          className={secondaryButtonClassName}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_16px_28px_-20px_rgba(11,106,56,0.6)] transition-colors hover:bg-brand-800 disabled:opacity-60"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Client
        </button>
      </div>
    </form>
  )
}
