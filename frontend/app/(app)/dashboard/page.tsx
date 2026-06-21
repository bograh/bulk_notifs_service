'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsAPI, campaignAPI } from '@/lib/api'
import type { AnalyticsSummary, Campaign } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Mail, MessageSquare, Users, Send, CheckCircle, XCircle, Eye, MousePointer,
  TrendingUp, Plus, ArrowRight, BarChart3, Clock,
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const statusStyles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'; dot: string }> = {
  completed: { variant: 'success', dot: 'bg-green-500' },
  sending: { variant: 'default', dot: 'bg-blue-500 animate-pulse' },
  failed: { variant: 'destructive', dot: 'bg-red-500' },
  cancelled: { variant: 'outline', dot: 'bg-gray-400' },
  scheduled: { variant: 'warning', dot: 'bg-yellow-500' },
  draft: { variant: 'secondary', dot: 'bg-gray-400' },
}

export default function DashboardPage() {
  const { user } = useAuth()

  const { data: summary } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsAPI.getSummary().then((r) => r.data),
  })

  const { data: campaignsData } = useQuery<{ campaigns: Campaign[] }>({
    queryKey: ['campaigns', 'recent'],
    queryFn: () => campaignAPI.getAll(1).then((r) => r.data),
  })

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const kpis = [
    {
      title: 'Total Campaigns',
      value: summary?.total_campaigns ?? 0,
      icon: Send,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
      href: '/campaigns',
    },
    {
      title: 'Messages Sent',
      value: summary?.total_sent ?? 0,
      icon: Mail,
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      href: '/analytics',
    },
    {
      title: 'Delivered',
      value: summary?.total_delivered ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      href: '/analytics',
    },
    {
      title: 'Total Contacts',
      value: summary?.total_contacts ?? 0,
      icon: Users,
      color: 'text-violet-600',
      bg: 'bg-violet-100 dark:bg-violet-900/30',
      href: '/contacts',
    },
    {
      title: 'Opens',
      value: summary?.total_opened ?? 0,
      icon: Eye,
      color: 'text-cyan-600',
      bg: 'bg-cyan-100 dark:bg-cyan-900/30',
      href: '/analytics',
    },
    {
      title: 'Clicks',
      value: summary?.total_clicked ?? 0,
      icon: MousePointer,
      color: 'text-pink-600',
      bg: 'bg-pink-100 dark:bg-pink-900/30',
      href: '/analytics',
    },
    {
      title: 'SMS Sent',
      value: summary?.sms_sent ?? 0,
      icon: MessageSquare,
      color: 'text-orange-600',
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      href: '/analytics',
    },
    {
      title: 'Failed',
      value: summary?.total_failed ?? 0,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900/30',
      href: '/analytics',
    },
  ]

  const deliveryRate = summary && summary.total_sent > 0
    ? ((summary.total_delivered / summary.total_sent) * 100).toFixed(1)
    : null

  const quota = user?.subscription
  const smsUsagePct = quota ? Math.min((quota.sms_used / quota.sms_quota) * 100, 100) : 0
  const emailUsagePct = quota ? Math.min((quota.email_used / quota.email_quota) * 100, 100) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {greeting()}, {user?.first_name || 'there'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/campaigns/new">
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Link key={kpi.title} href={kpi.href}>
            <Card className="hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpi.bg)}>
                    <kpi.icon className={cn('h-4.5 w-4.5', kpi.color)} />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                  {kpi.value.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{kpi.title}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent campaigns */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold">Recent Campaigns</CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs gap-1">
              <Link href="/campaigns">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {campaignsData?.campaigns && campaignsData.campaigns.length > 0 ? (
              <div className="divide-y">
                {campaignsData.campaigns.slice(0, 6).map((campaign) => {
                  const st = statusStyles[campaign.status] || statusStyles.draft
                  return (
                    <Link
                      key={campaign.id}
                      href={`/campaigns/${campaign.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-accent/50 transition-colors"
                    >
                      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', campaign.type === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30')}>
                        {campaign.type === 'email'
                          ? <Mail className="h-4 w-4 text-blue-600" />
                          : <MessageSquare className="h-4 w-4 text-green-600" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate text-gray-900 dark:text-white">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(campaign.created_at), 'MMM d')} &bull; {campaign.total_recipients.toLocaleString()} recipients
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant={st.variant} className="text-xs">
                          <span className={cn('mr-1.5 h-1.5 w-1.5 rounded-full inline-block', st.dot)} />
                          {campaign.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {campaign.sent_count.toLocaleString()} sent
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Send className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">No campaigns yet</p>
                <p className="text-xs text-muted-foreground mb-4">Create your first campaign to start sending</p>
                <Button asChild size="sm" className="gap-2">
                  <Link href="/campaigns/new">
                    <Plus className="h-3.5 w-3.5" />
                    Create campaign
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side panel */}
        <div className="space-y-4">
          {/* Quota usage */}
          {quota && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  Monthly Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="h-3 w-3 text-orange-500" /> SMS
                    </span>
                    <span>{quota.sms_used.toLocaleString()} / {quota.sms_quota.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', smsUsagePct > 85 ? 'bg-red-500' : 'bg-orange-500')}
                      style={{ width: `${smsUsagePct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3 w-3 text-blue-500" /> Email
                    </span>
                    <span>{quota.email_used.toLocaleString()} / {quota.email_quota.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', emailUsagePct > 85 ? 'bg-red-500' : 'bg-blue-500')}
                      style={{ width: `${emailUsagePct}%` }}
                    />
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" asChild>
                  <Link href="/billing">
                    <TrendingUp className="h-3.5 w-3.5" /> Upgrade plan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Delivery rate */}
          {deliveryRate && (
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Delivery rate</p>
                  <p className="text-2xl font-bold text-green-600">{deliveryRate}%</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: 'New campaign', href: '/campaigns/new', icon: Plus },
                { label: 'Import contacts', href: '/contacts', icon: Users },
                { label: 'New template', href: '/templates/new', icon: Mail },
                { label: 'View analytics', href: '/analytics', icon: BarChart3 },
              ].map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-3 hover:bg-accent hover:border-border transition-colors text-center"
                >
                  <q.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{q.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
