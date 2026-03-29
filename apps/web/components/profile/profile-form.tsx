'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

const ProfileSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
})

const PasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Required'),
    newPassword: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string().min(1, 'Required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

type ProfileInput = z.infer<typeof ProfileSchema>
type PasswordInput = z.infer<typeof PasswordSchema>

interface ProfileFormProps {
  userId: string
  defaultValues: { firstName: string; lastName: string }
}

export function ProfileForm({ userId, defaultValues }: ProfileFormProps) {
  const router = useRouter()
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileInput>({ resolver: zodResolver(ProfileSchema), defaultValues })

  const {
    register: regPassword,
    handleSubmit: handlePassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm<PasswordInput>({ resolver: zodResolver(PasswordSchema) })

  async function onProfileSubmit(data: ProfileInput) {
    setProfileMsg(null)
    const res = await fetch(`/api/v1/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      setProfileMsg({ type: 'success', text: 'Profile updated.' })
      router.refresh()
    } else {
      const json = await res.json().catch(() => ({}))
      setProfileMsg({ type: 'error', text: json?.error?.message ?? 'Failed to update profile' })
    }
  }

  async function onPasswordSubmit(data: PasswordInput) {
    setPasswordMsg(null)
    const res = await fetch('/api/v1/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    })
    if (res.ok) {
      setPasswordMsg({ type: 'success', text: 'Password changed.' })
      resetPassword()
    } else {
      const json = await res.json().catch(() => ({}))
      setPasswordMsg({ type: 'error', text: json?.error?.message ?? 'Failed to change password' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Name update */}
      <form onSubmit={handleProfile(onProfileSubmit)} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Update Name</h2>
        <div className="grid grid-cols-2 gap-4">
          {(['firstName', 'lastName'] as const).map((f) => (
            <div key={f}>
              <label htmlFor={f} className="block text-xs font-medium text-gray-700 mb-1">
                {f === 'firstName' ? 'First Name' : 'Last Name'}
              </label>
              <input
                {...regProfile(f)}
                id={f}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {profileErrors[f] && (
                <p className="mt-1 text-xs text-red-600">{profileErrors[f]?.message}</p>
              )}
            </div>
          ))}
        </div>
        {profileMsg && (
          <p className={`text-sm ${profileMsg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {profileMsg.text}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={profileSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {profileSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </form>

      {/* Password change */}
      <form onSubmit={handlePassword(onPasswordSubmit)} className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Change Password</h2>
        {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((f) => (
          <div key={f}>
            <label htmlFor={f} className="block text-xs font-medium text-gray-700 mb-1">
              {f === 'currentPassword' ? 'Current Password' : f === 'newPassword' ? 'New Password' : 'Confirm New Password'}
            </label>
            <input
              {...regPassword(f)}
              id={f}
              type="password"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {passwordErrors[f] && (
              <p className="mt-1 text-xs text-red-600">{passwordErrors[f]?.message}</p>
            )}
          </div>
        ))}
        {passwordMsg && (
          <p className={`text-sm ${passwordMsg.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {passwordMsg.text}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={passwordSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-60"
          >
            {passwordSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Change Password
          </button>
        </div>
      </form>
    </div>
  )
}
