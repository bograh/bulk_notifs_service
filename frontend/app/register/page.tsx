'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Zap, Mail, Lock, User, Building2, Phone, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import { useState } from 'react'

const schema = z.object({
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  company: z.string().optional(),
  phone_number: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const perks = [
  'Free plan — no credit card required',
  '100 SMS and 500 emails per month',
  'Real-time delivery analytics',
  'Upgrade anytime as you grow',
]

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    try {
      await registerUser(data)
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand side */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-10" />
        <Link href="/" className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
            <Zap className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-bold text-xl text-white">BulkNotifs</span>
        </Link>
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold text-white leading-snug">
            Start sending campaigns in minutes
          </h2>
          <ul className="space-y-3">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3 text-indigo-100">
                <CheckCircle className="h-5 w-5 text-indigo-300 shrink-0" />
                <span className="text-sm">{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-indigo-300">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-white dark:bg-gray-950 overflow-y-auto">
        <div className="w-full max-w-sm py-4">
          <div className="mb-7">
            <Link href="/" className="flex items-center gap-2 lg:hidden mb-8">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 dark:text-white">BulkNotifs</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Free forever. No credit card needed.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">First name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <Input {...register('first_name')} className="pl-9" placeholder="Jane" />
                </div>
                {errors.first_name && <p className="text-xs text-red-500">{errors.first_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-gray-300">Last name</Label>
                <Input {...register('last_name')} placeholder="Doe" />
                {errors.last_name && <p className="text-xs text-red-500">{errors.last_name.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input type="email" {...register('email')} className="pl-10" placeholder="you@example.com" />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input type="password" {...register('password')} className="pl-10" placeholder="8+ characters" />
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">
                Company <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input {...register('company')} className="pl-10" placeholder="Acme Inc." />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-gray-700 dark:text-gray-300">
                Phone <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input {...register('phone_number')} className="pl-10" placeholder="+1 555 000 0000" />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 h-10 text-sm font-semibold" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
