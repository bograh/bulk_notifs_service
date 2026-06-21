'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authAPI, type User } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  User as UserIcon, Lock, Bell, Key, Save, Loader2, Eye, EyeOff, Shield, CheckCircle, AlertCircle, Copy, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function ProfileTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    company: user?.company || '',
    phone_number: '',
  })

  const mutation = useMutation({
    mutationFn: () => authAPI.updateProfile(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast({ title: 'Profile updated' })
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message || 'Failed to update profile', variant: 'destructive' }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal information</CardTitle>
        <CardDescription>Update your name, company, and contact details</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
          className="space-y-5 max-w-lg"
        >
          <div className="flex items-center gap-4 pb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white text-xl font-bold">
              {[user?.first_name?.[0], user?.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-semibold">{user?.first_name} {user?.last_name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 text-xs capitalize">{user?.role || 'user'}</Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                placeholder="Jane"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email address</Label>
            <Input value={user?.email || ''} disabled className="opacity-60 cursor-not-allowed" />
            <p className="text-xs text-muted-foreground">Email cannot be changed. Contact support for assistance.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Company</Label>
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Acme Inc."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Phone number</Label>
            <Input
              value={form.phone_number}
              onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              placeholder="+1 555 000 0000"
            />
          </div>

          <Button type="submit" className="gap-2" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function SecurityTab() {
  const { toast } = useToast()
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)

  const mutation = useMutation({
    mutationFn: () => authAPI.changePassword({
      current_password: form.current_password,
      new_password: form.new_password,
    }),
    onSuccess: () => {
      setForm({ current_password: '', new_password: '', confirm_password: '' })
      toast({ title: 'Password changed successfully' })
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message || 'Failed to change password', variant: 'destructive' }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (form.new_password !== form.confirm_password) {
      toast({ title: 'Passwords do not match', variant: 'destructive' })
      return
    }
    if (form.new_password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' })
      return
    }
    mutation.mutate()
  }

  const strength = (pwd: string) => {
    if (!pwd) return 0
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const pwdStrength = strength(form.new_password)
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][pwdStrength]
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-emerald-500'][pwdStrength]

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>Use a strong password with letters, numbers, and symbols</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? 'text' : 'password'}
                  value={form.current_password}
                  onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowCurrent(!showCurrent)}
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>New password</Label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={form.new_password}
                  onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNew(!showNew)}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.new_password && (
                <div className="space-y-1.5 mt-2">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn('h-1 flex-1 rounded-full transition-colors', i <= pwdStrength ? strengthColor : 'bg-muted')}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{strengthLabel}</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Confirm new password</Label>
              <Input
                type="password"
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                placeholder="••••••••"
                required
              />
              {form.confirm_password && form.new_password !== form.confirm_password && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Passwords do not match
                </p>
              )}
            </div>

            <Button type="submit" className="gap-2" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Account security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Email verified', ok: true, desc: 'Your email address has been confirmed' },
            { label: 'Two-factor auth', ok: false, desc: '2FA is not enabled. Add an extra layer of security.' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-start gap-3">
                {item.ok
                  ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  : <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />}
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              {!item.ok && (
                <Button variant="outline" size="sm" className="h-7 text-xs shrink-0" disabled>
                  Enable
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    campaign_completed: true,
    campaign_failed: true,
    quota_warning: true,
    weekly_report: false,
    marketing: false,
  })

  const { toast } = useToast()

  const items = [
    { key: 'campaign_completed', label: 'Campaign completed', desc: 'Get notified when a campaign finishes sending' },
    { key: 'campaign_failed', label: 'Campaign failed', desc: 'Alert when a campaign encounters errors' },
    { key: 'quota_warning', label: 'Quota warnings', desc: 'Notify when you reach 80% of your monthly quota' },
    { key: 'weekly_report', label: 'Weekly digest', desc: 'Receive a weekly summary of your campaign performance' },
    { key: 'marketing', label: 'Product updates', desc: 'Hear about new features and improvements' },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email notifications</CardTitle>
        <CardDescription>Choose which emails you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3 border-b last:border-0">
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <button
              role="switch"
              aria-checked={prefs[item.key as keyof typeof prefs]}
              onClick={() => setPrefs((p) => ({ ...p, [item.key]: !p[item.key as keyof typeof prefs] }))}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                prefs[item.key as keyof typeof prefs] ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  prefs[item.key as keyof typeof prefs] ? 'translate-x-4' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        ))}
        <div className="pt-4">
          <Button
            size="sm"
            className="gap-2"
            onClick={() => toast({ title: 'Preferences saved' })}
          >
            <Save className="h-4 w-4" />
            Save preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ApiKeysTab() {
  const { toast } = useToast()
  const [apiKey] = useState('bn_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
  const [showKey, setShowKey] = useState(false)

  const masked = 'bn_live_' + '•'.repeat(32)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API keys</CardTitle>
          <CardDescription>
            Use API keys to authenticate requests from your application. Keep them secret.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Live API key</p>
              <Badge variant="success" className="text-xs">Active</Badge>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs bg-background rounded px-3 py-2 border overflow-hidden truncate">
                {showKey ? apiKey : masked}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(apiKey)
                  toast({ title: 'Copied to clipboard' })
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <RefreshCw className="h-3.5 w-3.5" />
              Rotate key
            </Button>
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <Key className="h-3.5 w-3.5" />
              Create new key
            </Button>
          </div>

          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium mb-1">Important</p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Never share your API keys or commit them to source control. Rotate them immediately if you suspect they have been compromised.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API documentation</CardTitle>
          <CardDescription>Learn how to integrate BulkNotifs into your application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4 font-mono text-xs space-y-2">
            <p className="text-muted-foreground"># Example request</p>
            <p><span className="text-blue-500">curl</span> -X POST https://api.bulknotifs.com/v1/campaigns \</p>
            <p className="pl-4">-H <span className="text-green-600">"Authorization: Bearer YOUR_API_KEY"</span> \</p>
            <p className="pl-4">-H <span className="text-green-600">"Content-Type: application/json"</span> \</p>
            <p className="pl-4">-d <span className="text-green-600">{'\'{"name":"My Campaign","type":"sms"}\''}</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full sm:w-auto sm:inline-grid grid-cols-4 sm:grid-cols-4 h-auto gap-1 p-1">
          <TabsTrigger value="profile" className="gap-2 text-xs sm:text-sm">
            <UserIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-xs sm:text-sm">
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 text-xs sm:text-sm">
            <Bell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2 text-xs sm:text-sm">
            <Key className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">API Keys</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
        <TabsContent value="api">
          <ApiKeysTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
