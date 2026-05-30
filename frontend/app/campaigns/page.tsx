'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignAPI, type Campaign } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, MessageSquare, Plus, Send, XCircle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'

export default function CampaignsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery<{ campaigns: Campaign[]; total: number }>({
    queryKey: ['campaigns'],
    queryFn: () => campaignAPI.getAll(1).then((r) => r.data),
  })

  const sendMutation = useMutation({
    mutationFn: (id: number) => campaignAPI.send(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign sent', description: 'Campaign is now being processed' })
    },
    onError: () => toast({ title: 'Error', description: 'Failed to send campaign', variant: 'destructive' }),
  })

  const cancelMutation = useMutation({
    mutationFn: (id: number) => campaignAPI.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      toast({ title: 'Campaign cancelled' })
    },
  })

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground">Manage your email and SMS campaigns</p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : data?.campaigns && data.campaigns.length > 0 ? (
            <div className="divide-y">
              {data.campaigns.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    {campaign.type === 'email' ? (
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <Mail className="h-5 w-5 text-blue-600" />
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                        <MessageSquare className="h-5 w-5 text-green-600" />
                      </div>
                    )}
                    <div>
                      <Link href={`/campaigns/${campaign.id}`} className="font-medium hover:underline">
                        {campaign.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(campaign.created_at), 'MMM d, yyyy HH:mm')} &middot; {campaign.total_recipients} recipients
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right text-sm text-muted-foreground">
                      {campaign.sent_count} sent / {campaign.failed_count} failed
                    </div>
                    <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
                    {campaign.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={() => sendMutation.mutate(campaign.id)}>
                        <Send className="h-3 w-3 mr-1" /> Send
                      </Button>
                    )}
                    {(campaign.status === 'scheduled' || campaign.status === 'sending') && (
                      <Button size="sm" variant="destructive" onClick={() => cancelMutation.mutate(campaign.id)}>
                        <XCircle className="h-3 w-3 mr-1" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Mail className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No campaigns yet</p>
              <Button asChild className="mt-4">
                <Link href="/campaigns/new">Create your first campaign</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
