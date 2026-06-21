'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { templateAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function NewTemplatePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [type, setType] = useState<'sms' | 'email'>('email')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [htmlContent, setHtmlContent] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      templateAPI.create({
        name,
        type,
        subject: type === 'email' ? subject : undefined,
        content,
        html_content: type === 'email' ? htmlContent : undefined,
        is_public: isPublic,
      }),
    onSuccess: (data) => {
      toast({ title: 'Template created' })
      router.push(`/templates/${data.data.id}`)
    },
    onError: () => toast({ title: 'Error', description: 'Failed to create template', variant: 'destructive' }),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Template</h1>
        <p className="text-muted-foreground">Create a reusable message template</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
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
                <Label>Subject</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} required />
              </div>
            )}

            <div className="space-y-2">
              <Label>Content</Label>
              <textarea
                className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Use {{first_name}}, {{last_name}} for personalization..."
                required
              />
            </div>

            {type === 'email' && (
              <div className="space-y-2">
                <Label>HTML Content (optional)</Label>
                <textarea
                  className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="<h1>Hello {{first_name}}</h1>..."
                />
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_public"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="is_public">Make this template public</Label>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || !name || !content}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Template
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
