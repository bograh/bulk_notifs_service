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
import { Users, Plus, Trash2, Upload, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default function ContactsPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

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
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contactListAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
      toast({ title: 'Contact list deleted' })
    },
    onError: (err: any) => toast({ title: 'Error', description: err.response?.data || 'Failed to delete', variant: 'destructive' }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage your contact lists</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New List
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Contact List</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <Button type="submit" disabled={createMutation.isPending || !newName}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : data?.contact_lists && data.contact_lists.length > 0 ? (
            <div className="divide-y">
              {data.contact_lists.map((list) => (
                <div key={list.id} className="flex items-center justify-between p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <Link href={`/contacts/${list.id}`} className="font-medium hover:underline">
                        {list.name}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {list.description || 'No description'} &middot; Created {format(new Date(list.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary">{list.active_count} active</Badge>
                    <Badge variant="outline">{list.total_count} total</Badge>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(list.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No contact lists yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
