'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { campaignAPI, contactListAPI, templateAPI } from '@/lib/api'
import type { ContactList, Template } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function NewCampaignPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [type, setType] = useState<'sms' | 'email'>('email')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [contactListId, setContactListId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  const { data: listsData } = useQuery<{ contact_lists: ContactList[] }>({
    queryKey: ['contact-lists'],
    queryFn: () => contactListAPI.getAll(1).then((r) => r.data),
  })

  const { data: templatesData } = useQuery<{ templates: Template[] }>({
    queryKey: ['templates', type],
    queryFn: () => templateAPI.getAll(1, type).then((r) => r.data),
  })

  const mutation = useMutation({
    mutationFn: () =>
      campaignAPI.create({
        name,
        type,
        subject: type === 'email' ? subject : undefined,
        content,
        contact_list_id: parseInt(contactListId),
        template_id: templateId ? parseInt(templateId) : undefined,
        scheduled_at: scheduledAt || undefined,
      }),
    onSuccess: (data) => {
      toast({ title: 'Campaign created' })
      router.push(`/campaigns/${data.data.id}`)
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create campaign', variant: 'destructive' }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Campaign</h1>
        <p className="text-muted-foreground">Create a new email or SMS campaign</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as 'sms' | 'email')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {type === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <textarea
                id="content"
                className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Use {{first_name}}, {{last_name}} for personalization..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact List</Label>
                <Select value={contactListId} onValueChange={setContactListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a list" />
                  </SelectTrigger>
                  <SelectContent>
                    {listsData?.contact_lists?.map((list) => (
                      <SelectItem key={list.id} value={String(list.id)}>
                        {list.name} ({list.active_count} contacts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template (optional)</Label>
                <Select value={templateId} onValueChange={setTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {templatesData?.templates?.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduled">Schedule (optional)</Label>
              <Input
                id="scheduled"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || !name || !content || !contactListId}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Campaign
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
