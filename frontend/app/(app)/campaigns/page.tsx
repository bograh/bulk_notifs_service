'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignAPI, type Campaign } from '@/lib/api'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Mail, MessageSquare, Plus, Send, XCircle, Search, Filter, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; dot: string }> = {
  completed: { variant: 'success', dot: 'bg-green-500' },
  sending: { variant: 'default', dot: 'bg-blue-500 animate-pulse' },
  failed: { variant: 'destructive', dot: 'bg-red-500' },
  cancelled: { variant: 'outline', dot: 'bg-gray-400' },
  scheduled: { variant: 'warning', dot: 'bg-yellow-500' },
  draft: { variant: 'secondary', dot: 'bg-gray-400' },
}

const STATUS_TABS = ['all', 'draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled']

export default function CampaignsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, isLoading } = useQuery<{ campaigns: Campaign[]; total: number }>({
    queryKey: ['campaigns'],
    queryFn: () => campaignAPI.getAll(1).then((r) => r.data),
  })

  const sendMutation = useMutation({
    mutationFn: (id: number) => campaignAPI.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign queued', description: 'Your campaign is being processed' })
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message || 'Failed to send', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => campaignAPI.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign cancelled' })
    },
  })

  const filtered = data?.campaigns?.filter((c) => {
    const matchesSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  }) ?? []

  const counts = data?.campaigns?.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} campaigns total
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors capitalize',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-background hover:bg-accent text-muted-foreground'
              )}
            >
              {s}
              {s !== 'all' && counts[s] ? (
                <span className={cn('rounded-full px-1.5 py-0 text-[10px] font-bold', statusFilter === s ? 'bg-white/20' : 'bg-muted')}>
                  {counts[s]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4">
                  <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                </div>
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <div className="divide-y">
              {filtered.map((campaign) => {
                const st = statusStyles[campaign.status] || statusStyles.draft
                const deliveryRate = campaign.sent_count > 0
                  ? ((campaign.delivered_count / campaign.sent_count) * 100).toFixed(0)
                  : null

                return (
                  <div key={campaign.id} className="flex items-center gap-4 px-6 py-4 hover:bg-accent/30 transition-colors">
                    <div className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                      campaign.type === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                    )}>
                      {campaign.type === 'email'
                        ? <Mail className="h-5 w-5 text-blue-600" />
                        : <MessageSquare className="h-5 w-5 text-green-600" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/campaigns/${campaign.id}`} className="font-medium text-sm hover:underline truncate">
                          {campaign.name}
                        </Link>
                        <span className="hidden sm:inline text-xs text-muted-foreground">
                          {campaign.type === 'email' ? 'Email' : 'SMS'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                        {campaign.scheduled_at && (
                          <> &bull; Scheduled {format(new Date(campaign.scheduled_at), 'MMM d HH:mm')}</>
                        )}
                      </p>
                    </div>

                    <div className="hidden md:flex items-center gap-6 text-xs text-muted-foreground">
                      <div className="text-right">
                        <span className="font-medium text-foreground">{campaign.total_recipients.toLocaleString()}</span>
                        <span className="block">recipients</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-foreground">{campaign.sent_count.toLocaleString()}</span>
                        <span className="block">sent</span>
                      </div>
                      {deliveryRate && (
                        <div className="text-right">
                          <span className="font-medium text-green-600">{deliveryRate}%</span>
                          <span className="block">delivery</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={st.variant} className="hidden sm:flex items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
                        {campaign.status}
                      </Badge>
                      {campaign.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => sendMutation.mutate(campaign.id)}
                          disabled={sendMutation.isPending}
                        >
                          <Send className="h-3 w-3" /> Send
                        </Button>
                      )}
                      {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                          onClick={() => cancelMutation.mutate(campaign.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="h-3 w-3" /> Cancel
                        </Button>
                      )}
                      <Link href={`/campaigns/${campaign.id}`} className="rounded p-1 hover:bg-accent text-muted-foreground transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="font-medium mb-1">
                {search || statusFilter !== 'all' ? 'No campaigns match your filters' : 'No campaigns yet'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {search || statusFilter !== 'all' ? 'Try adjusting your search or filters' : 'Create your first campaign to get started'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button asChild size="sm" className="gap-2">
                  <Link href="/campaigns/new">
                    <Plus className="h-4 w-4" />
                    Create campaign
                  </Link>
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
