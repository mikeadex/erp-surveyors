'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { LoginSchema, type LoginInput } from '@valuation-os/utils'

const DEMO_PASSWORD = 'DemoPass123!'

const DEMO_ACCOUNTS = [
  { role: 'Managing Partner', email: 'mp.demo@taiwoandco.com', initials: 'MP', accent: 'from-brand-500/18 to-brand-400/8', chip: 'bg-brand-50 border-brand-100 text-brand-900' },
  { role: 'Reviewer', email: 'reviewer.demo@taiwoandco.com', initials: 'RV', accent: 'from-emerald-500/16 to-emerald-400/8', chip: 'bg-emerald-50 border-emerald-100 text-emerald-900' },
  { role: 'Valuer', email: 'valuer.demo@taiwoandco.com', initials: 'VL', accent: 'from-lime-500/16 to-lime-400/8', chip: 'bg-lime-50 border-lime-100 text-lime-900' },
  { role: 'Finance', email: 'finance.demo@taiwoandco.com', initials: 'FN', accent: 'from-amber-500/16 to-amber-400/8', chip: 'bg-amber-50 border-amber-100 text-amber-900' },
  { role: 'Field Officer', email: 'field.demo@taiwoandco.com', initials: 'FO', accent: 'from-teal-500/16 to-teal-400/8', chip: 'bg-teal-50 border-teal-100 text-teal-900' },
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
        <div className="overflow-hidden rounded-[2rem] border border-brand-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,249,244,0.98))] shadow-[0_28px_55px_-40px_rgba(11,106,56,0.36)]">
          <div className="border-b border-brand-100/70 bg-[radial-gradient(circle_at_top_left,rgba(35,131,74,0.16),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,250,246,0.92))] px-5 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-700">Demo Workspace</p>
                <h3 className="mt-2 text-lg font-black tracking-[-0.03em] text-slate-950">
                  Choose a role and step straight into the seeded firm
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">
                  Great for stakeholder walkthroughs, QA, and pilot demos without typing test credentials each time.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-brand-200 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700 shadow-sm">
                Test only
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-white/80 bg-white/85 px-3.5 py-3 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.18)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Firm</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">Taiwo & Co Demo</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 px-3.5 py-3 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.18)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Access</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">5 demo roles</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/85 px-3.5 py-3 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.18)]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Mode</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">One-click sign in</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="grid gap-3">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => quickSignIn(account.email)}
                  className="group relative overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white px-4 py-4 text-left shadow-[0_18px_34px_-28px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_24px_42px_-30px_rgba(11,106,56,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <div className={`absolute inset-0 bg-gradient-to-r ${account.accent} opacity-90`} />
                  <div className="relative flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/80 bg-white/88 text-sm font-bold tracking-[0.08em] text-slate-900 shadow-[0_10px_20px_-18px_rgba(15,23,42,0.28)]">
                        {account.initials}
                      </div>
                      <div className="min-w-0">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${account.chip}`}>
                          {account.role}
                        </span>
                        <p className="mt-2 truncate text-sm font-semibold text-slate-900">{account.email}</p>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center rounded-full border border-brand-200 bg-white/92 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700 transition group-hover:border-brand-300 group-hover:text-brand-800">
                        {isSubmitting ? 'Please wait' : 'Enter'}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-4 px-1 text-xs leading-5 text-slate-500">
              Each shortcut uses the seeded demo password automatically and signs you into the matching role workspace.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
