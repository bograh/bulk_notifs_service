'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactListAPI, type ContactList } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Users, Plus, Trash2, Loader2, Search, UserCheck, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function ContactsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<{ contact_lists: ContactList[]; total: number }>({
    queryKey: ['contact-lists'],
    queryFn: () => contactListAPI.getAll(1).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: () => contactListAPI.create({ name: newName, description: newDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
      setDialogOpen(false)
      setNewName('')
      setNewDesc('')
      toast({ title: 'Contact list created' })
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message || 'Failed to create', variant: 'destructive' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contactListAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
      toast({ title: 'List deleted' })
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data?.message || 'Failed to delete', variant: 'destructive' }),
  })

  const filtered = data?.contact_lists?.filter(
    (l) => !search || l.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const totalContacts = data?.contact_lists?.reduce((sum, l) => sum + l.total_count, 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {data?.contact_lists?.length ?? 0} lists &bull; {totalContacts.toLocaleString()} total contacts
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              New List
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create contact list</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Newsletter subscribers"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What is this list for?"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || !newName.trim()} className="gap-2">
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create list
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search lists..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                <div className="h-4 w-36 bg-muted animate-pulse rounded" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((list) => {
            const activePct = list.total_count > 0
              ? Math.round((list.active_count / list.total_count) * 100)
              : 0

            return (
              <Card key={list.id} className="group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
                      <Users className="h-5 w-5 text-violet-600" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${list.name}"? This cannot be undone.`)) {
                          deleteMutation.mutate(list.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <Link href={`/contacts/${list.id}`} className="block group/link">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-white group-hover/link:text-primary transition-colors mb-1 truncate">
                      {list.name}
                    </h3>
                    {list.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{list.description}</p>
                    )}
                  </Link>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {list.total_count.toLocaleString()} total
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <UserCheck className="h-3 w-3" />
                        {list.active_count.toLocaleString()} active
                      </span>
                    </div>
                    <Link
                      href={`/contacts/${list.id}`}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>

                  {list.total_count > 0 && (
                    <div className="mt-3">
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${activePct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{activePct}% subscribed</p>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground mt-2">
                    Created {format(new Date(list.created_at), 'MMM d, yyyy')}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="font-medium mb-1">
            {search ? 'No lists match your search' : 'No contact lists yet'}
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            {search ? 'Try a different search term' : 'Create your first contact list to start adding contacts'}
          </p>
          {!search && (
            <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create list
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
