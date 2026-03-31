'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { LoginSchema, type LoginInput } from '@valuation-os/utils'

const DEMO_PASSWORD = 'DemoPass123!'

const DEMO_ACCOUNTS = [
  { role: 'Managing Partner', email: 'mp.demo@taiwoandco.com', tint: 'bg-brand-50 border-brand-100 text-brand-900' },
  { role: 'Reviewer', email: 'reviewer.demo@taiwoandco.com', tint: 'bg-emerald-50 border-emerald-100 text-emerald-900' },
  { role: 'Valuer', email: 'valuer.demo@taiwoandco.com', tint: 'bg-lime-50 border-lime-100 text-lime-900' },
  { role: 'Finance', email: 'finance.demo@taiwoandco.com', tint: 'bg-amber-50 border-amber-100 text-amber-900' },
  { role: 'Field Officer', email: 'field.demo@taiwoandco.com', tint: 'bg-teal-50 border-teal-100 text-teal-900' },
] as const

export function LoginForm({ showDemoAccounts = false }: { showDemoAccounts?: boolean }) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) })

  async function signIn(data: LoginInput) {
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

  async function onSubmit(data: LoginInput) {
    await signIn(data)
  }

  async function quickSignIn(email: string) {
    setValue('email', email, { shouldValidate: true })
    setValue('password', DEMO_PASSWORD, { shouldValidate: true })
    await signIn({ email, password: DEMO_PASSWORD })
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
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
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
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
          <div className="rounded-lg border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in →'}
        </button>
      </form>

      {showDemoAccounts ? (
        <div className="rounded-2xl border border-brand-100/80 bg-brand-50/60 p-4 shadow-[0_18px_40px_-34px_rgba(11,106,56,0.28)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-700">Demo Access</p>
              <h3 className="mt-2 text-base font-bold tracking-[-0.02em] text-slate-900">Enter a seeded workspace instantly</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Use one-click access for pilot walkthroughs, stakeholder reviews, and QA without typing demo credentials manually.
              </p>
            </div>
            <span className="rounded-full border border-brand-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-700">
              Test only
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                disabled={isSubmitting}
                onClick={() => quickSignIn(account.email)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white px-3.5 py-3 text-left shadow-[0_12px_30px_-26px_rgba(15,23,42,0.18)] transition hover:border-brand-200 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${account.tint}`}>
                      {account.role}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-slate-900">{account.email}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">
                  {isSubmitting ? 'Please wait' : 'Sign in'}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
