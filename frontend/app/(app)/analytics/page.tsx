'use client'

import { useQuery } from '@tanstack/react-query'
import { analyticsAPI, type AnalyticsSummary, type DailyStat } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Mail, MessageSquare, Send, CheckCircle, XCircle, Eye, MousePointer, Users, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'

const formatDate = (d: string) => {
  const dt = new Date(d)
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AnalyticsPage() {
  const { data: summary } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics', 'summary'],
    queryFn: () => analyticsAPI.getSummary().then((r) => r.data),
  })

  const { data: dailyStats } = useQuery<DailyStat[]>({
    queryKey: ['analytics', 'daily'],
    queryFn: () => analyticsAPI.getDailyStats().then((r) => r.data),
  })

  const deliveryRate = summary && summary.total_sent > 0
    ? ((summary.total_delivered / summary.total_sent) * 100)
    : 0

  const openRate = summary && summary.total_delivered > 0
    ? ((summary.total_opened / summary.total_delivered) * 100)
    : 0

  const clickRate = summary && summary.total_delivered > 0
    ? ((summary.total_clicked / summary.total_delivered) * 100)
    : 0

  const failRate = summary && summary.total_sent > 0
    ? ((summary.total_failed / summary.total_sent) * 100)
    : 0

  const rates = [
    { label: 'Delivery rate', value: deliveryRate, color: 'text-green-600', bg: 'bg-green-500', threshold: 95 },
    { label: 'Open rate', value: openRate, color: 'text-blue-600', bg: 'bg-blue-500', threshold: 20 },
    { label: 'Click rate', value: clickRate, color: 'text-violet-600', bg: 'bg-violet-500', threshold: 5 },
    { label: 'Failure rate', value: failRate, color: 'text-red-600', bg: 'bg-red-500', threshold: 5, inverse: true },
  ]

  const kpis = [
    { title: 'Total Sent', value: summary?.total_sent ?? 0, icon: Send, color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
    { title: 'Delivered', value: summary?.total_delivered ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
    { title: 'Failed', value: summary?.total_failed ?? 0, icon: XCircle, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { title: 'Opened', value: summary?.total_opened ?? 0, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { title: 'Clicked', value: summary?.total_clicked ?? 0, icon: MousePointer, color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
    { title: 'Email', value: summary?.email_sent ?? 0, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { title: 'SMS', value: summary?.sms_sent ?? 0, icon: MessageSquare, color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
    { title: 'Contacts', value: summary?.total_contacts ?? 0, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-100 dark:bg-cyan-900/30' },
  ]

  const channelData = summary ? [
    { name: 'Email', value: summary.email_sent, fill: '#3b82f6' },
    { name: 'SMS', value: summary.sms_sent, fill: '#22c55e' },
  ] : []

  const formattedDaily = dailyStats?.map((d) => ({ ...d, date: formatDate(d.date) })) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance overview across all campaigns</p>
      </div>

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', kpi.bg)}>
                  <kpi.icon className={cn('h-4 w-4', kpi.color)} />
                </div>
                <span className="text-xs text-muted-foreground">{kpi.title}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{kpi.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rates */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rates.map((r) => {
          const isGood = r.inverse ? r.value <= r.threshold : r.value >= r.threshold
          return (
            <Card key={r.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">{r.label}</span>
                  {isGood
                    ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                    : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                </div>
                <p className={cn('text-2xl font-bold tabular-nums', r.color)}>
                  {r.value.toFixed(1)}%
                </p>
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', r.bg)}
                      style={{ width: `${Math.min(r.value, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Messages over time</CardTitle>
          </CardHeader>
          <CardContent>
            {formattedDaily.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={formattedDaily} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="smsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: 12,
                    }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="email" stroke="#3b82f6" strokeWidth={2} fill="url(#emailGrad)" name="Email" />
                  <Area type="monotone" dataKey="sms" stroke="#22c55e" strokeWidth={2} fill="url(#smsGrad)" name="SMS" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Send className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">No data yet. Send some campaigns to see trends.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Channel breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {channelData.some((d) => d.value > 0) ? (
              <div className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={channelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-full space-y-2">
                  {channelData.map((d) => {
                    const total = channelData.reduce((s, x) => s + x.value, 0)
                    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0'
                    return (
                      <div key={d.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.fill }} />
                          <span className="text-muted-foreground">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{d.value.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-sm text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily bar chart */}
      {formattedDaily.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Daily send volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={formattedDaily} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem',
                    fontSize: 12,
                  }}
                  cursor={{ fill: 'hsl(var(--accent))' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="email" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Email" />
                <Bar dataKey="sms" fill="#22c55e" radius={[4, 4, 0, 0]} name="SMS" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
