'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { templateAPI, type Template } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { FileText, Plus, Trash2, Mail, MessageSquare, Search, Globe, Lock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

const TYPE_FILTERS = ['all', 'email', 'sms']

export default function TemplatesPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

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
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message || 'Failed to delete', variant: 'destructive' }),
  })

  const filtered = data?.templates?.filter((t) => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || t.type === typeFilter
    return matchesSearch && matchesType
  }) ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.total ?? 0} templates total
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/templates/new">
            <Plus className="h-4 w-4" />
            New Template
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                typeFilter === t
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-background hover:bg-accent text-muted-foreground'
              }`}
            >
              {t === 'all' ? 'All types' : t === 'email' ? 'Email' : 'SMS'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                <div className="h-4 w-36 bg-muted animate-pulse rounded" />
                <div className="h-8 w-full bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id} className="group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${template.type === 'email' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                    {template.type === 'email'
                      ? <Mail className="h-4.5 w-4.5 text-blue-600" />
                      : <MessageSquare className="h-4.5 w-4.5 text-green-600" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {template.is_public
                      ? <Globe className="h-3.5 w-3.5 text-muted-foreground/60" />
                      : <Lock className="h-3.5 w-3.5 text-muted-foreground/60" />}
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete "${template.name}"?`)) deleteMutation.mutate(template.id)
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>

                <Link href={`/templates/${template.id}`} className="block flex-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors line-clamp-1">
                    {template.name}
                  </h3>
                  {template.subject && (
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{template.subject}</p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {template.content}
                  </p>
                </Link>

                <div className="flex items-center justify-between mt-4 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Badge variant={template.type === 'email' ? 'default' : 'secondary'} className="text-[10px] py-0">
                      {template.type}
                    </Badge>
                    {template.is_public && (
                      <Badge variant="outline" className="text-[10px] py-0">Public</Badge>
                    )}
                  </div>
                  <Link
                    href={`/templates/${template.id}`}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                  >
                    Edit <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                <p className="text-[10px] text-muted-foreground mt-2">
                  {format(new Date(template.created_at), 'MMM d, yyyy')}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="font-medium mb-1">
            {search || typeFilter !== 'all' ? 'No templates match your filters' : 'No templates yet'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {search || typeFilter !== 'all' ? 'Try adjusting your search' : 'Create reusable templates for your campaigns'}
          </p>
          {!search && typeFilter === 'all' && (
            <Button asChild size="sm" className="gap-2">
              <Link href="/templates/new">
                <Plus className="h-4 w-4" />
                Create template
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
