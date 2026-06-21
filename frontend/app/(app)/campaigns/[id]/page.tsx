'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignAPI, analyticsAPI, type Campaign } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useParams, useRouter } from 'next/navigation'
import {
  Mail, MessageSquare, Send, XCircle, ArrowLeft, CheckCircle, Eye, MousePointer,
  Users, Clock, CalendarCheck, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const statusStyles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; dot: string }> = {
  completed: { variant: 'success', dot: 'bg-green-500' },
  sending: { variant: 'default', dot: 'bg-blue-500 animate-pulse' },
  failed: { variant: 'destructive', dot: 'bg-red-500' },
  cancelled: { variant: 'outline', dot: 'bg-gray-400' },
  scheduled: { variant: 'warning', dot: 'bg-yellow-500' },
  draft: { variant: 'secondary', dot: 'bg-gray-400' },
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const id = Number(params.id)

  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ['campaigns', id],
    queryFn: () => campaignAPI.getOne(id).then((r) => r.data),
  })

  const sendMutation = useMutation({
    mutationFn: () => campaignAPI.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
      toast({ title: 'Campaign queued', description: 'Messages are being delivered' })
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message || 'Failed to send', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => campaignAPI.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
      toast({ title: 'Campaign cancelled' })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                <div className="h-7 w-12 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium">Campaign not found</p>
        <Button variant="ghost" className="mt-4 gap-2" onClick={() => router.push('/campaigns')}>
          <ArrowLeft className="h-4 w-4" />
          Back to campaigns
        </Button>
      </div>
    )
  }

  const st = statusStyles[campaign.status] || statusStyles.draft

  const deliveryRate = campaign.sent_count > 0
    ? ((campaign.delivered_count / campaign.sent_count) * 100).toFixed(1)
    : null

  const openRate = campaign.delivered_count > 0
    ? ((campaign.open_count / campaign.delivered_count) * 100).toFixed(1)
    : null

  const stats = [
    { label: 'Recipients', value: campaign.total_recipients, icon: Users, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
    { label: 'Sent', value: campaign.sent_count, icon: Send, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Delivered', value: campaign.delivered_count, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'Failed', value: campaign.failed_count, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { label: 'Opened', value: campaign.open_count || 0, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'Clicked', value: campaign.click_count || 0, icon: MousePointer, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" className="h-8 w-8 mt-1 shrink-0" onClick={() => router.push('/campaigns')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold truncate">{campaign.name}</h1>
            <Badge variant={st.variant} className="items-center gap-1.5">
              <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
              {campaign.status}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              {campaign.type === 'email'
                ? <Mail className="h-3.5 w-3.5 text-blue-500" />
                : <MessageSquare className="h-3.5 w-3.5 text-green-500" />}
              {campaign.type === 'email' ? 'Email campaign' : 'SMS campaign'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Created {format(new Date(campaign.created_at), 'MMM d, yyyy HH:mm')}
            </span>
            {campaign.scheduled_at && (
              <span className="flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5" />
                Scheduled {format(new Date(campaign.scheduled_at), 'MMM d, yyyy HH:mm')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {campaign.status === 'draft' && (
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending} className="gap-2">
              {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send now
            </Button>
          )}
          {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
            <Button
              variant="outline"
              className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
              onClick={() => {
                if (confirm('Cancel this campaign?')) cancelMutation.mutate()
              }}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg mb-2', stat.bg)}>
                <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
              </div>
              <div className="text-xl font-bold tabular-nums">{stat.value.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rates */}
      {(deliveryRate || openRate) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deliveryRate && (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Delivery rate</p>
                <p className="text-3xl font-bold text-green-600">{deliveryRate}%</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${deliveryRate}%` }} />
                </div>
              </CardContent>
            </Card>
          )}
          {openRate && (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Open rate</p>
                <p className="text-3xl font-bold text-purple-600">{openRate}%</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(parseFloat(openRate), 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            {campaign.type === 'email' ? 'Email content' : 'SMS content'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {campaign.subject && (
            <div className="flex items-start gap-2 pb-3 border-b">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0 mt-0.5">Subject</span>
              <p className="text-sm font-medium">{campaign.subject}</p>
            </div>
          )}
          <div className="rounded-lg bg-muted/50 p-4 whitespace-pre-wrap text-sm leading-relaxed font-mono">
            {campaign.content}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
