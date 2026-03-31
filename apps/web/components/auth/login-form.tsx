'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { LoginSchema, type LoginInput } from '@valuation-os/utils'

export function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) })

  async function onSubmit(data: LoginInput) {
    setServerError(null)
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!json.success) {
        setServerError(json.error?.message ?? 'Sign in failed')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setServerError('Network error — please try again')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
          Work email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          placeholder="you@yourfirm.com"
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50"
          placeholder="••••••••••"
        />
        {errors.password && (
          <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Signing in…' : 'Sign in →'}
      </button>
    </form>
  )
}
