'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

const schema = z.object({
  firm: z.object({
    name: z.string().min(2, 'Firm name is required'),
    slug: z
      .string()
      .min(2, 'Slug is required')
      .max(60)
      .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
    rcNumber: z.string().optional(),
    esvarNumber: z.string().optional(),
    address: z.string().min(1, 'Address is required'),
    city: z.string().optional(),
    state: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
  }),
  user: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Valid email required'),
    password: z.string().min(10, 'At least 10 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    phone: z.string().optional(),
    verificationCode: z.string().optional(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
})

type FormData = z.infer<typeof schema>

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
]

export default function SignupPage() {
  const router = useRouter()
  const [apiError, setApiError] = useState('')
  const [step, setStep] = useState<'firm' | 'user' | 'verify'>('firm')
  const [isSendingCode, setIsSendingCode] = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firm: { name: '', slug: '', rcNumber: '', esvarNumber: '', address: '', city: '', state: '', phone: '', email: '' },
      user: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', verificationCode: '' },
    },
  })

  const firmName = watch('firm.name')
  const password = watch('user.password') || ''

  // Password strength logic
  const hasLength = password.length >= 10
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const strengthScore = [hasLength, hasUpper, hasLower, hasNumber].filter(Boolean).length

  useEffect(() => {
    const slug = toSlug(firmName ?? '')
    if (slug) setValue('firm.slug', slug, { shouldValidate: false })
  }, [firmName, setValue])

  const goToStep2 = async () => {
    const valid = await trigger(['firm.name', 'firm.slug', 'firm.address'])
    if (valid) setStep('user')
  }

  const sendVerificationCode = async () => {
    const valid = await trigger(['user.firstName', 'user.lastName', 'user.email', 'user.password', 'user.confirmPassword'])
    if (!valid) return

    setApiError('')
    setIsSendingCode(true)
    const email = watch('user.email')
    
    const res = await fetch('/api/v1/auth/signup/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    
    setIsSendingCode(false)
    const json = await res.json().catch(() => ({}))
    
    if (!res.ok) {
      setApiError(json.error?.message ?? json.message ?? 'Failed to send verification code')
      return
    }
    
    setStep('verify')
  }

  const onSubmit = async (data: FormData) => {
    if (!data.user.verificationCode || data.user.verificationCode.length !== 6) {
      setApiError('Please enter a valid 6-digit code')
      return
    }

    setApiError('')
    const payload = {
      firm: {
        ...data.firm,
        email: data.firm.email || undefined,
        rcNumber: data.firm.rcNumber || undefined,
        esvarNumber: data.firm.esvarNumber || undefined,
        phone: data.firm.phone || undefined,
        city: data.firm.city || undefined,
        state: data.firm.state || undefined,
      },
      user: {
        ...data.user,
        phone: data.user.phone || undefined,
      },
    }

    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      setApiError(json.error?.message ?? json.message ?? 'Registration failed')
      return
    }

    router.push('/dashboard')
  }

  const inputCls = 'block w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20'
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5'

  return (
    <div className="w-full max-w-xl">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create your firm account</h1>
        <p className="mt-1.5 text-sm text-gray-500">Set up Valuation OS for your practice</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {(['firm', 'user'] as const).map((s, i) => {
          const done = s === 'firm' && step === 'user'
          const active = step === s
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2.5 shrink-0">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors
                  ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {done ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wide ${active ? 'text-gray-900' : done ? 'text-blue-600' : 'text-gray-400'}`}>
                  {s === 'firm' ? 'Firm Details' : 'Admin Account'}
                </span>
              </div>
              {i < 1 && (
                <div className="flex-1 mx-4 h-px bg-gray-200" />
              )}
            </div>
          )
        })}
      </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 'firm' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Firm Name <span className="text-red-500 normal-case">*</span></label>
                    <input {...register('firm.name')} placeholder="e.g. Adeyemi & Partners" className={inputCls} />
                    {errors.firm?.name && <p className="mt-1 text-xs text-red-600">{errors.firm.name.message}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelCls}>
                      Firm URL <span className="text-red-500 normal-case">*</span>
                      <span className="ml-1 normal-case font-normal text-gray-400">— auto-generated, editable</span>
                    </label>
                    <div className="flex rounded-lg border border-gray-200 bg-gray-50 overflow-hidden transition focus-within:border-blue-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20">
                      <span className="flex items-center px-3 text-xs text-gray-400 border-r border-gray-200 shrink-0">
                        valuationos.app/
                      </span>
                      <input {...register('firm.slug')} placeholder="adeyemi-partners" className="flex-1 px-3 py-2.5 text-sm bg-transparent focus:outline-none" />
                    </div>
                    {errors.firm?.slug && <p className="mt-1 text-xs text-red-600">{errors.firm.slug.message}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelCls}>Address <span className="text-red-500 normal-case">*</span></label>
                    <input {...register('firm.address')} placeholder="e.g. 12 Adeola Odeku Street, Victoria Island" className={inputCls} />
                    {errors.firm?.address && <p className="mt-1 text-xs text-red-600">{errors.firm.address.message}</p>}
                  </div>

                  <div>
                    <label className={labelCls}>City</label>
                    <input {...register('firm.city')} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <select {...register('firm.state')} className={inputCls}>
                      <option value="">Select state…</option>
                      {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className={labelCls}>CAC Number</label>
                    <input {...register('firm.rcNumber')} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>ESVARBON Number</label>
                    <input {...register('firm.esvarNumber')} className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Firm Phone</label>
                    <input {...register('firm.phone')} type="tel" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Firm Email</label>
                    <input {...register('firm.email')} type="email" className={inputCls} />
                    {errors.firm?.email && <p className="mt-1 text-xs text-red-600">{errors.firm.email.message}</p>}
                  </div>
                </div>

                <button type="button" onClick={goToStep2}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Continue →
                </button>
              </div>
            )}

            {step === 'user' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>First Name <span className="text-red-500 normal-case">*</span></label>
                    <input {...register('user.firstName')} className={inputCls} />
                    {errors.user?.firstName && <p className="mt-1 text-xs text-red-600">{errors.user.firstName.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Last Name <span className="text-red-500 normal-case">*</span></label>
                    <input {...register('user.lastName')} className={inputCls} />
                    {errors.user?.lastName && <p className="mt-1 text-xs text-red-600">{errors.user.lastName.message}</p>}
                  </div>

                  <div>
                    <label className={labelCls}>Work Email <span className="text-red-500 normal-case">*</span></label>
                    <input {...register('user.email')} type="email" className={inputCls} />
                    {errors.user?.email && <p className="mt-1 text-xs text-red-600">{errors.user.email.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input {...register('user.phone')} type="tel" className={inputCls} />
                  </div>

                  <div>
                    <label className={labelCls}>Password <span className="text-red-500 normal-case">*</span></label>
                    <input {...register('user.password')} type="password" autoComplete="new-password" className={inputCls} />
                    
                    {/* Password Strength Meter */}
                    {password && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex gap-1 h-1.5">
                          {[1, 2, 3, 4].map((s) => (
                            <div key={s} className={`flex-1 rounded-full ${
                              strengthScore >= s 
                                ? strengthScore <= 2 ? 'bg-red-400' : strengthScore === 3 ? 'bg-amber-400' : 'bg-green-500'
                                : 'bg-gray-200'
                            }`} />
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-500 flex justify-between">
                          <span>Must contain: 10+ chars, A-Z, a-z, 0-9</span>
                          <span className={strengthScore === 4 ? 'text-green-600 font-medium' : ''}>
                            {strengthScore === 4 ? 'Strong' : strengthScore === 3 ? 'Good' : 'Weak'}
                          </span>
                        </p>
                      </div>
                    )}
                    {errors.user?.password && <p className="mt-1 text-xs text-red-600">{errors.user.password.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Confirm Password <span className="text-red-500 normal-case">*</span></label>
                    <input {...register('user.confirmPassword')} type="password" autoComplete="new-password" className={inputCls} />
                    {errors.user?.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.user.confirmPassword.message}</p>}
                  </div>
                </div>

                {apiError && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-700">{apiError}</div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setStep('firm')}
                    className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                    ← Back
                  </button>
                  <button type="button" onClick={sendVerificationCode} disabled={isSendingCode}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50">
                    {isSendingCode ? 'Sending Code…' : 'Send Verification Code →'}
                  </button>
                </div>
              </div>
            )}

            {step === 'verify' && (
              <div className="space-y-5">
                <div className="rounded-lg bg-blue-50 p-4 border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-900 mb-1">Check your email</h3>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    We've sent a 6-digit verification code to <strong>{watch('user.email')}</strong>.<br/>
                    <span className="opacity-75">(Check your terminal console in development mode)</span>
                  </p>
                </div>

                <div>
                  <label className={labelCls}>6-Digit Code <span className="text-red-500 normal-case">*</span></label>
                  <input {...register('user.verificationCode')} placeholder="123456" maxLength={6} className={`${inputCls} text-center tracking-[0.5em] text-lg font-mono`} />
                </div>

                {apiError && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-700">{apiError}</div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button type="button" onClick={() => setStep('user')}
                    className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50">
                    ← Back
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50">
                    {isSubmitting ? 'Creating account…' : 'Verify & Create Account →'}
                  </button>
                </div>
              </div>
            )}
          </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign in</Link>
        </p>
      </div>
  )
}
