'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const schema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(30).optional(),
  password: z.string().min(10, 'Password must be at least 10 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof schema>

function AcceptInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setApiError('')
    const res = await fetch('/api/v1/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
      }),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setApiError(json.error?.message ?? json.message ?? 'Failed to accept invitation')
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  if (!token) {
    return (
      <div className="rounded-lg bg-red-50 px-4 py-4 text-sm text-red-700 text-center">
        Invalid invitation link. Please contact your administrator for a new invite.
      </div>
    )
  }

  return success ? (
    <div className="text-center py-6">
      <div className="text-green-600 font-semibold mb-1">Account activated!</div>
      <p className="text-sm text-gray-500">Redirecting to your dashboard…</p>
    </div>
  ) : (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-sm text-gray-600 mb-6">
        Set your name and a secure password to activate your account.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('firstName')}
            className={inputCls}
          />
          {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            {...register('lastName')}
            className={inputCls}
          />
          {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
        <input
          {...register('phone')}
          type="tel"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Password <span className="text-red-500">*</span>
        </label>
        <input
          {...register('password')}
          type="password"
          autoComplete="new-password"
          className={inputCls}
        />
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Confirm Password <span className="text-red-500">*</span>
        </label>
        <input
          {...register('confirmPassword')}
          type="password"
          autoComplete="new-password"
          className={inputCls}
        />
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
      </div>

      {apiError && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
      >
        {isSubmitting ? 'Activating…' : 'Activate account'}
      </button>
    </form>
  )
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Accept your invitation</h1>
          <p className="mt-1 text-sm text-gray-500">You have been invited to join ValuCore Africa</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-8">
          <Suspense fallback={<div className="text-sm text-gray-500 text-center py-4">Loading…</div>}>
            <AcceptInviteForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
