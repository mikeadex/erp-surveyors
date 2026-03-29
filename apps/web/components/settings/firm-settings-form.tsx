'use client'

import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UpdateFirmSchema, type UpdateFirmInput } from '@valuation-os/utils'
import { Loader2 } from 'lucide-react'

interface FirmSettingsFormProps {
  firm: {
    id: string
    name: string
    slug: string
    rcNumber: string | null
    esvarNumber: string | null
    address: string | null
    city: string | null
    state: string | null
    phone: string | null
    email: string | null
    logoKey: string | null
  }
}

export function FirmSettingsForm({ firm }: FirmSettingsFormProps) {
  const [isPending, startTransition] = useTransition()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<UpdateFirmInput>({
    resolver: zodResolver(UpdateFirmSchema),
    defaultValues: {
      name: firm.name,
      rcNumber: firm.rcNumber ?? undefined,
      esvarNumber: firm.esvarNumber ?? undefined,
      address: firm.address ?? undefined,
      city: firm.city ?? undefined,
      state: firm.state ?? undefined,
      phone: firm.phone ?? undefined,
      email: firm.email ?? undefined,
    },
  })

  async function onSubmit(data: UpdateFirmInput) {
    setSuccessMsg(null)
    setErrorMsg(null)
    const res = await fetch('/api/v1/firms/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to save changes')
      return
    }
    startTransition(() => {
      setSuccessMsg('Firm details updated successfully.')
    })
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900">Firm Details</h2>
        <p className="text-xs text-gray-500 mt-0.5">Slug: {firm.slug}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([
            { id: 'name' as const, label: 'Firm Name', type: 'text', required: true },
            { id: 'email' as const, label: 'Contact Email', type: 'email', required: false },
            { id: 'phone' as const, label: 'Phone', type: 'text', required: false },
            { id: 'rcNumber' as const, label: 'CAC Number', type: 'text', required: false },
            { id: 'esvarNumber' as const, label: 'ESVARBON Number', type: 'text', required: false },
          ] satisfies Array<{ id: keyof UpdateFirmInput; label: string; type: string; required: boolean }>).map(({ id, label, type, required }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-xs font-medium text-gray-700 mb-1">
                {label}
                {required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input
                {...register(id)}
                id={id}
                type={type ?? 'text'}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors[id] && (
                <p className="mt-1 text-xs text-red-600">{errors[id]?.message}</p>
              )}
            </div>
          ))}
        </div>

        <div>
          <label htmlFor="address" className="block text-xs font-medium text-gray-700 mb-1">
            Address <span className="text-red-500">*</span>
          </label>
          <input
            {...register('address')}
            id="address"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-xs font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              {...register('city')}
              id="city"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label htmlFor="state" className="block text-xs font-medium text-gray-700 mb-1">
              State
            </label>
            <input
              {...register('state')}
              id="state"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {successMsg && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{successMsg}</p>
        )}
        {errorMsg && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isDirty || isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </section>
  )
}
