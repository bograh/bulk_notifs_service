'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateAPI, type Template } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { FileText, Plus, Trash2, Mail, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function TemplatesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery<{ templates: Template[]; total: number }>({
    queryKey: ['templates'],
    queryFn: () => templateAPI.getAll(1).then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => templateAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast({ title: 'Template deleted' })
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data || 'Failed to delete', variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">Manage your message templates</p>
        </div>
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="mr-2 h-4 w-4" /> New Template
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : data?.templates && data.templates.length > 0 ? (
            <div className="divide-y">
              {data.templates.map((template) => (
                <div key={template.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      {template.type === 'email' ? (
                        <Mail className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <MessageSquare className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <Link href={`/templates/${template.id}`} className="font-medium hover:underline">
                        {template.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {template.type} &middot; Created {format(new Date(template.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {template.is_public && <Badge variant="secondary">Public</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(template.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No templates yet</p>
              <Button asChild className="mt-4">
                <Link href="/templates/new">Create your first template</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
