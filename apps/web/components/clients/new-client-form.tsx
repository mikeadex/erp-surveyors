'use client'

import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CreateClientSchema, type CreateClientInput } from '@valuation-os/utils'
import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'

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

export function NewClientForm() {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateClientInput>({
    resolver: zodResolver(CreateClientSchema),
    defaultValues: { type: 'individual', contacts: [] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'contacts' })
  const clientType = watch('type')

  async function onSubmit(data: CreateClientInput) {
    setErrorMsg(null)
    const res = await fetch('/api/v1/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to create client')
      return
    }
    router.push(`/clients/${json.data.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Client Details</h2>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Client Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            {(['individual', 'corporate'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register('type')}
                  type="radio"
                  value={t}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm capitalize text-gray-700">{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BASIC_FIELDS.filter((f) => {
            if (f.id === 'rcNumber') return clientType === 'corporate'
            return true
          }).map(({ label, id, type, required }) => (
            <div key={id} className={id === 'name' ? 'sm:col-span-2' : ''}>
              <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                {...register(id)}
                id={id}
                type={type}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors[id] && (
                <p className="mt-1 text-xs text-red-600">{errors[id]?.message}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Address</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {ADDRESS_FIELDS.map(({ label, id }) => (
            <div key={id} className={id === 'address' ? 'sm:col-span-2' : ''}>
              <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">
                {label}
              </label>
              <input
                {...register(id)}
                id={id}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      </section>

      {clientType === 'corporate' && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Contacts</h2>
            <button
              type="button"
              onClick={() => append({ name: '', email: undefined, phone: undefined, role: undefined, isPrimary: fields.length === 0 })}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Add contact
            </button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-700">Contact {index + 1}</p>
                <button type="button" onClick={() => remove(index)}>
                  <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['name', 'email', 'phone', 'role'] as const).map((f) => (
                  <div key={f}>
                    <input
                      {...register(`contacts.${index}.${f}`)}
                      placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                      className="block w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  {...register(`contacts.${index}.isPrimary`)}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600"
                />
                Primary contact
              </label>
            </div>
          ))}
        </section>
      )}

      {errorMsg && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Client
        </button>
      </div>
    </form>
  )
}
