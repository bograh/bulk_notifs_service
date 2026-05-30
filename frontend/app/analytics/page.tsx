'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsAPI, type AnalyticsSummary, type DailyStat } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Mail, MessageSquare, Send, CheckCircle, XCircle, Eye, MousePointer, Users, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, AreaChart, Area } from 'recharts'

export default function AnalyticsPage() {
  const { data: summary } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsAPI.getSummary().then((r) => r.data),
  })

  const { data: dailyStats } = useQuery<DailyStat[]>({
    queryKey: ['analytics', 'daily'],
    queryFn: () => analyticsAPI.getDailyStats().then((r) => r.data),
  })

  const kpis = [
    { title: 'Total Sent', value: summary?.total_sent ?? 0, icon: Send, color: 'text-blue-600' },
    { title: 'Delivered', value: summary?.total_delivered ?? 0, icon: CheckCircle, color: 'text-green-600' },
    { title: 'Failed', value: summary?.total_failed ?? 0, icon: XCircle, color: 'text-red-600' },
    { title: 'Opened', value: summary?.total_opened ?? 0, icon: Eye, color: 'text-purple-600' },
    { title: 'Clicked', value: summary?.total_clicked ?? 0, icon: MousePointer, color: 'text-indigo-600' },
    { title: 'Emails', value: summary?.email_sent ?? 0, icon: Mail, color: 'text-cyan-600' },
    { title: 'SMS', value: summary?.sms_sent ?? 0, icon: MessageSquare, color: 'text-orange-600' },
    { title: 'Contacts', value: summary?.total_contacts ?? 0, icon: Users, color: 'text-pink-600' },
  ]

  const deliveryRate = summary && summary.total_sent > 0
    ? ((summary.total_delivered / summary.total_sent) * 100).toFixed(1)
    : '0'

  const openRate = summary && summary.total_delivered > 0
    ? ((summary.total_opened / summary.total_delivered) * 100).toFixed(1)
    : '0'

  const clickRate = summary && summary.total_delivered > 0
    ? ((summary.total_clicked / summary.total_delivered) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Insights into your messaging performance</p>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{deliveryRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{openRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-600">{clickRate}%</div>
          </CardContent>
        </Card>
      </div>

      {dailyStats && dailyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Messages Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="email" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Email" />
                <Area type="monotone" dataKey="sms" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name="SMS" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {(!dailyStats || dailyStats.length === 0) && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No data yet. Send some campaigns to see analytics.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
