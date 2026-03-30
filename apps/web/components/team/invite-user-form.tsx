'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { InviteUserSchema, type InviteUserInput } from '@valuation-os/utils'
import { Loader2 } from 'lucide-react'
import { ROLE_LABELS } from '@valuation-os/utils'
import type { UserRole } from '@valuation-os/types'
import { ModalShell } from '@/components/ui/modal-shell'

interface Branch {
  id: string
  name: string
}

interface InviteUserFormProps {
  branches: Branch[]
  onClose: () => void
}

const ROLES = Object.keys(ROLE_LABELS) as UserRole[]
const sectionClassName = 'rounded-[24px] border border-slate-200 bg-slate-50/60 p-5 space-y-4'
const inputClassName =
  'block w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500'
const labelClassName = 'mb-1 block text-xs font-medium text-slate-700'
const secondaryButtonClassName =
  'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50'

export function InviteUserForm({ branches, onClose }: InviteUserFormProps) {
  const router = useRouter()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(InviteUserSchema),
  })
  const selectedRole = watch('role')
  const selectedBranchId = watch('branchId')
  const requiresBranch = selectedRole && selectedRole !== 'managing_partner'

  useEffect(() => {
    if (selectedRole === 'managing_partner') {
      setValue('branchId', undefined)
      return
    }

    if (!selectedBranchId && branches.length === 1) {
      setValue('branchId', branches[0]?.id)
    }
  }, [branches, selectedBranchId, selectedRole, setValue])

  async function onSubmit(data: InviteUserInput) {
    setErrorMsg(null)
    if (data.role !== 'managing_partner' && !data.branchId) {
      setErrorMsg('Select a branch for this team member before sending the invite.')
      return
    }
    if (data.role === 'managing_partner') {
      setValue('branchId', undefined)
    }
    const res = await fetch('/api/v1/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        branchId: data.role === 'managing_partner' ? undefined : data.branchId,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      setErrorMsg(json?.error?.message ?? 'Failed to invite user')
      return
    }
    setSuccess(true)
    router.refresh()
    setTimeout(onClose, 1500)
  }

  return (
    <ModalShell
      title="Invite Team Member"
      description="Add a new team member with the right role and branch ownership."
      onClose={onClose}
      widthClassName="max-w-3xl"
    >
      {success ? (
        <div className="py-6 text-center">
          <p className="text-sm font-medium text-brand-700">Invitation sent!</p>
          <p className="mt-1 text-xs text-slate-500">The user will receive a password reset email.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <section className={sectionClassName}>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Member Details</h2>
              <p className="mt-1 text-xs text-slate-500">
                Capture the person’s identity before setting access and branch ownership.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className={labelClassName}>
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('firstName')}
                  id="firstName"
                  className={inputClassName}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="lastName" className={labelClassName}>
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('lastName')}
                  id="lastName"
                  className={inputClassName}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className={labelClassName}>
                Email <span className="text-red-500">*</span>
              </label>
              <input
                {...register('email')}
                id="email"
                type="email"
                className={inputClassName}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>
          </section>

          <section className={sectionClassName}>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Access And Branch</h2>
              <p className="mt-1 text-xs text-slate-500">
                Choose the right role and branch scope for this team member.
              </p>
            </div>

            <div>
              <label htmlFor="role" className={labelClassName}>
                Role <span className="text-red-500">*</span>
              </label>
              <select
                {...register('role')}
                id="role"
                className={inputClassName}
              >
                <option value="">Select role…</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              {errors.role && (
                <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>
              )}
            </div>

            {branches.length > 0 && (
              <div>
                <label htmlFor="branchId" className={labelClassName}>
                  Branch
                  {requiresBranch && <span className="text-red-500"> *</span>}
                </label>
                <select
                  {...register('branchId')}
                  id="branchId"
                  disabled={selectedRole === 'managing_partner'}
                  className={inputClassName}
                >
                  <option value="">
                    {selectedRole === 'managing_partner' ? 'Managing partner is firm-wide' : 'Select branch…'}
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Managing partners are firm-wide. Every other staff role must belong to a branch.
                </p>
              </div>
            )}
          </section>

          {errorMsg && (
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={secondaryButtonClassName}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Send Invite
            </button>
          </div>
        </form>
      )}
    </ModalShell>
  )
}
