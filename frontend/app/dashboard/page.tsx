'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsAPI, campaignAPI } from '@/lib/api'
import type { AnalyticsSummary, Campaign } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, MessageSquare, Users, Send, CheckCircle, XCircle, Eye, MousePointer } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function DashboardPage() {
  const { data: summary } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsAPI.getSummary().then((r) => r.data),
  })

  const { data: campaignsData } = useQuery<{ campaigns: Campaign[] }>({
    queryKey: ['campaigns', 'recent'],
    queryFn: () => campaignAPI.getAll(1).then((r) => r.data),
  })

  const kpis = [
    {
      title: 'Total Campaigns',
      value: summary?.total_campaigns ?? 0,
      icon: Send,
      color: 'text-blue-600',
    },
    {
      title: 'Messages Sent',
      value: summary?.total_sent ?? 0,
      icon: Mail,
      color: 'text-green-600',
    },
    {
      title: 'Delivered',
      value: summary?.total_delivered ?? 0,
      icon: CheckCircle,
      color: 'text-emerald-600',
    },
    {
      title: 'Failed',
      value: summary?.total_failed ?? 0,
      icon: XCircle,
      color: 'text-red-600',
    },
    {
      title: 'Emails Sent',
      value: summary?.email_sent ?? 0,
      icon: Mail,
      color: 'text-indigo-600',
    },
    {
      title: 'SMS Sent',
      value: summary?.sms_sent ?? 0,
      icon: MessageSquare,
      color: 'text-orange-600',
    },
    {
      title: 'Total Contacts',
      value: summary?.total_contacts ?? 0,
      icon: Users,
      color: 'text-purple-600',
    },
    {
      title: 'Opens',
      value: summary?.total_opened ?? 0,
      icon: Eye,
      color: 'text-cyan-600',
    },
  ]

  const statusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success' as const
      case 'sending': return 'default' as const
      case 'failed': return 'destructive' as const
      case 'cancelled': return 'outline' as const
      case 'scheduled': return 'warning' as const
      default: return 'secondary' as const
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your campaigns and messaging activity</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignsData?.campaigns && campaignsData.campaigns.length > 0 ? (
            <div className="space-y-4">
              {campaignsData.campaigns.slice(0, 5).map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {campaign.type === 'email' ? (
                      <Mail className="h-5 w-5 text-blue-500" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-muted-foreground">
                      {campaign.sent_count}/{campaign.total_recipients} sent
                    </span>
                    <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No campaigns yet. Create your first campaign to get started.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
