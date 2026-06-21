'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminAPI, type User, type AdminStats } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  Users, Mail, BarChart3, DollarSign, Search, Trash2, ShieldCheck, ShieldX, Loader2, TrendingUp, MessageSquare,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function AdminPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminAPI.getStats().then((r) => r.data),
    enabled: user?.role === 'admin',
  })

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: User[]; total: number }>({
    queryKey: ['admin', 'users', search],
    queryFn: () => adminAPI.getUsers(1, search || undefined).then((r) => r.data),
    enabled: user?.role === 'admin',
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminAPI.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: 'User deleted' })
    },
    onError: () => toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => adminAPI.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast({ title: 'User updated' })
    },
  })

  if (user?.role !== 'admin') return null

  const statCards = [
    { label: 'Total users', value: stats?.total_users ?? 0, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { label: 'Active users', value: stats?.active_users ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Total campaigns', value: stats?.total_campaigns ?? 0, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Messages sent', value: stats?.total_messages ?? 0, icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { label: 'Total contacts', value: stats?.total_contacts ?? 0, icon: Users, color: 'text-violet-600', bg: 'bg-violet-100 dark:bg-violet-900/30' },
    { label: 'Revenue', value: `$${(stats?.revenue ?? 0).toFixed(2)}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', isString: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">System overview and user management</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg mb-3', s.bg)}>
                <s.icon className={cn('h-4 w-4', s.color)} />
              </div>
              <p className="text-xl font-bold tabular-nums">
                {s.isString ? s.value : (s.value as number).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">
            Users
            {usersData?.total != null && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({usersData.total.toLocaleString()} total)</span>
            )}
          </CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="divide-y">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-40 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : usersData?.users && usersData.users.length > 0 ? (
            <div className="divide-y">
              {usersData.users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-accent/30 transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white text-xs font-semibold">
                    {[u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join('').toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {u.first_name} {u.last_name}
                      {u.company && <span className="text-muted-foreground font-normal"> &bull; {u.company}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {u.role}
                    </Badge>
                    <Badge variant={u.is_active ? 'success' : 'outline'} className="text-xs">
                      {u.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    {u.subscription?.plan_name && (
                      <Badge variant="outline" className="text-xs capitalize hidden md:flex">
                        {u.subscription.plan_name}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      title={u.is_active ? 'Deactivate user' : 'Activate user'}
                      onClick={() => updateMutation.mutate({ id: u.id, data: { is_active: !u.is_active } })}
                      disabled={updateMutation.isPending}
                    >
                      {u.is_active
                        ? <ShieldX className="h-3.5 w-3.5" />
                        : <ShieldCheck className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete user ${u.email}? This cannot be undone.`)) {
                          deleteMutation.mutate(u.id)
                        }
                      }}
                      disabled={deleteMutation.isPending || u.id === user?.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No users found matching your search' : 'No users found'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
