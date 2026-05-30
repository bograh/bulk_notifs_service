'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignAPI, type Campaign } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useParams, useRouter } from 'next/navigation'
import { Mail, MessageSquare, Send, XCircle, ArrowLeft, CheckCircle, Eye, MousePointer } from 'lucide-react'
import { format } from 'date-fns'

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
      toast({ title: 'Campaign sent' })
    },
    onError: () => toast({ title: 'Error', description: 'Failed to send', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => campaignAPI.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', id] })
      toast({ title: 'Campaign cancelled' })
    },
  })

  if (isLoading) return <div className="p-8 text-center">Loading...</div>
  if (!campaign) return <div className="p-8 text-center">Campaign not found</div>

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

  const stats = [
    { label: 'Recipients', value: campaign.total_recipients, icon: Mail },
    { label: 'Sent', value: campaign.sent_count, icon: Send },
    { label: 'Delivered', value: campaign.delivered_count, icon: CheckCircle },
    { label: 'Failed', value: campaign.failed_count, icon: XCircle },
    { label: 'Opened', value: campaign.open_count || 0, icon: Eye },
    { label: 'Clicked', value: campaign.click_count || 0, icon: MousePointer },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight">{campaign.name}</h1>
            <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {campaign.type === 'email' ? 'Email' : 'SMS'} campaign &middot; Created {format(new Date(campaign.created_at), 'MMM d, yyyy HH:mm')}
          </p>
        </div>
        {campaign.status === 'draft' && (
          <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
            <Send className="mr-2 h-4 w-4" /> Send Now
          </Button>
        )}
        {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
          <Button variant="destructive" onClick={() => cancelMutation.mutate()}>
            <XCircle className="mr-2 h-4 w-4" /> Cancel
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.subject && (
            <div className="mb-4">
              <span className="text-sm font-medium text-muted-foreground">Subject: </span>
              <span className="text-sm">{campaign.subject}</span>
            </div>
          )}
          <div className="bg-muted rounded-lg p-4 whitespace-pre-wrap text-sm">
            {campaign.content}
          </div>
        </CardContent>
      </Card>

      {campaign.scheduled_at && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Scheduled for: <span className="font-medium text-foreground">{format(new Date(campaign.scheduled_at), 'PPpp')}</span>
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
