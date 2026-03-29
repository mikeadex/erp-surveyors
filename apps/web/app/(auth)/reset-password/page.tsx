'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const requestSchema = z.object({
  email: z.string().email('Valid email required'),
})

const confirmSchema = z.object({
  token: z.string().length(6, 'Verification code must be 6 digits'),
  newPassword: z.string().min(10, 'Password must be at least 10 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RequestData = z.infer<typeof requestSchema>
type ConfirmData = z.infer<typeof confirmSchema>

function RequestForm() {
  const [sent, setSent] = useState(false)
  const [apiError, setApiError] = useState('')
  const [email, setEmail] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RequestData>({
    resolver: zodResolver(requestSchema),
  })

  const onSubmit = async (data: RequestData) => {
    setApiError('')
    setEmail(data.email)
    const res = await fetch('/api/v1/auth/password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setApiError(json.error?.message ?? 'Request failed')
      return
    }
    setSent(true)
  }

  const inputCls = 'block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5'

  if (sent) {
    return <ConfirmForm email={email} />
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label className={labelCls}>Email address</label>
        <input {...register('email')} type="email" autoComplete="email" className={inputCls} placeholder="you@yourfirm.com" />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      {apiError && <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-700">{apiError}</div>}
      <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50">
        {isSubmitting ? 'Sending…' : 'Send reset code →'}
      </button>
    </form>
  )
}

function ConfirmForm({ email }: { email: string }) {
  const router = useRouter()
  const [success, setSuccess] = useState(false)
  const [apiError, setApiError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ConfirmData>({
    resolver: zodResolver(confirmSchema),
  })

  const onSubmit = async (data: ConfirmData) => {
    setApiError('')
    const res = await fetch('/api/v1/auth/password/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token: data.token, newPassword: data.newPassword }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setApiError(json.error?.message ?? json.message ?? 'Reset failed')
      return
    }
    setSuccess(true)
    setTimeout(() => router.push('/login'), 2000)
  }

  if (success) {
    return (
      <div className="text-center py-4 space-y-1">
        <div className="text-green-700 font-semibold">Password reset successfully</div>
        <p className="text-sm text-gray-500">Redirecting to login…</p>
      </div>
    )
  }

  const inputCls = 'block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5'

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">Check your email</h3>
        <p className="text-xs text-blue-700 leading-relaxed">
          We've sent a 6-digit reset code to <strong>{email}</strong>.<br />
          <span className="opacity-75">(Check your terminal console in development mode)</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className={labelCls}>6-Digit Code</label>
          <input {...register('token')} placeholder="123456" maxLength={6} className={`${inputCls} text-center tracking-[0.5em] text-lg font-mono`} />
          {errors.token && <p className="mt-1 text-xs text-red-600">{errors.token.message}</p>}
        </div>
        <div>
          <label className={labelCls}>New Password</label>
          <input {...register('newPassword')} type="password" autoComplete="new-password" className={inputCls} />
          {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
        </div>
        <div>
          <label className={labelCls}>Confirm Password</label>
          <input {...register('confirmPassword')} type="password" autoComplete="new-password" className={inputCls} />
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
        </div>
        {apiError && <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-700">{apiError}</div>}
        <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50">
          {isSubmitting ? 'Resetting…' : 'Reset password →'}
        </button>
      </form>
    </div>
  )
}

function ResetContent() {
  return <RequestForm />
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Reset your password</h1>
        <p className="mt-1.5 text-sm text-gray-500">We'll send you a code to reset it</p>
      </div>

      <Suspense fallback={<div className="text-sm text-gray-500 text-center py-4">Loading…</div>}>
        <ResetContent />
      </Suspense>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">Back to login</Link>
      </p>
    </div>
  )
}
