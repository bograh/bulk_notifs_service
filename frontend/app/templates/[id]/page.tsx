'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateAPI, type Template } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Trash2, Mail, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const id = Number(params.id)

  const { data: template, isLoading } = useQuery<Template>({
    queryKey: ['templates', id],
    queryFn: () => templateAPI.getOne(id).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: () => templateAPI.delete(id),
    onSuccess: () => {
      toast({ title: 'Template deleted' })
      router.push('/templates')
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data || 'Failed to delete', variant: 'destructive' }),
  })

  if (isLoading) return <div className="p-8 text-center">Loading...</div>
  if (!template) return <div className="p-8 text-center">Template not found</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/templates')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold tracking-tight">{template.name}</h1>
            <Badge variant="secondary">{template.type}</Badge>
            {template.is_public && <Badge>Public</Badge>}
          </div>
          <p className="text-muted-foreground">
            Created {format(new Date(template.created_at), 'MMM d, yyyy')}
          </p>
        </div>
        <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>

      {template.subject && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{template.subject}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 whitespace-pre-wrap text-sm">
            {template.content}
          </div>
        </CardContent>
      </Card>

      {template.html_content && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">HTML Content</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">
              {template.html_content}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
