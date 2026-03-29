import type { Metadata } from 'next'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Sign In' }

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-sm text-gray-500">Sign in to your firm account to continue</p>
      </div>

      <LoginForm />

      <div className="mt-5 flex items-center justify-between text-sm">
        <Link href="/signup" className="text-gray-500 hover:text-gray-700">
          Create an account
        </Link>
        <Link href="/reset-password" className="text-blue-600 hover:text-blue-700">
          Forgot password?
        </Link>
      </div>
    </div>
  )
}
