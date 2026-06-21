'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { campaignAPI, contactListAPI, templateAPI } from '@/lib/api'
import type { ContactList, Template } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Mail, MessageSquare, Send, Clock, Users, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

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
      toast({ title: 'Campaign created', description: 'Ready to send when you are' })
      router.push(`/campaigns/${data.data.id}`)
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message || 'Failed to create campaign', variant: 'destructive' }),
  })

  const selectedList = listsData?.contact_lists?.find((l) => String(l.id) === contactListId)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Campaign</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Set up your email or SMS campaign</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-5">
        {/* Type selector */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'email', label: 'Email', icon: Mail, desc: 'HTML & text emails', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
            { value: 'sms', label: 'SMS', icon: MessageSquare, desc: 'Text messages', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
          ].map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value as 'sms' | 'email')}
              className={cn(
                'flex items-center gap-3 rounded-xl border-2 p-4 transition-all text-left',
                type === t.value
                  ? `${t.border} ${t.bg}`
                  : 'border-border hover:border-border/80 hover:bg-accent'
              )}
            >
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', type === t.value ? t.bg : 'bg-muted')}>
                <t.icon className={cn('h-5 w-5', type === t.value ? t.color : 'text-muted-foreground')} />
              </div>
              <div>
                <p className={cn('font-semibold text-sm', type === t.value ? 'text-foreground' : 'text-muted-foreground')}>
                  {t.label}
                </p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Campaign details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Campaign name <span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Black Friday 2024 Newsletter"
                required
              />
            </div>

            {type === 'email' && (
              <div className="space-y-1.5">
                <Label>Subject line <span className="text-destructive">*</span></Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your email subject line"
                  required={type === 'email'}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Message content <span className="text-destructive">*</span></Label>
              <textarea
                className="flex min-h-[180px] w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Write your ${type === 'email' ? 'email body' : 'SMS message'}...\n\nUse {{first_name}}, {{last_name}}, {{email}} for personalization.`}
                required
              />
              {type === 'sms' && (
                <p className="text-xs text-muted-foreground">
                  {content.length} / 160 chars
                  {content.length > 160 && <span className="text-orange-500"> — will be split into {Math.ceil(content.length / 153)} messages</span>}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Audience & template
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Contact list <span className="text-destructive">*</span></Label>
              <Select value={contactListId} onValueChange={setContactListId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a contact list" />
                </SelectTrigger>
                <SelectContent>
                  {listsData?.contact_lists?.map((list) => (
                    <SelectItem key={list.id} value={String(list.id)}>
                      {list.name}
                      <span className="text-muted-foreground ml-2">({list.active_count.toLocaleString()} active)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedList && (
                <p className="text-xs text-muted-foreground">
                  This campaign will be sent to {selectedList.active_count.toLocaleString()} active contacts
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Template
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Start from scratch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No template</SelectItem>
                  {templatesData?.templates?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Scheduling
            </CardTitle>
            <CardDescription>Leave empty to save as draft and send manually later</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label>Send at <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || !name || !content || !contactListId || (type === 'email' && !subject)}
            className="gap-2"
          >
            {mutation.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Send className="h-4 w-4" />}
            Create campaign
          </Button>
        </div>
      </form>
    </div>
  )
}
