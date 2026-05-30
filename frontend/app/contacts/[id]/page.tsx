'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactListAPI, contactAPI, type Contact, type ContactList } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, Upload, Loader2, UserCheck, UserX } from 'lucide-react'
import { format } from 'date-fns'

export default function ContactListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const listId = Number(params.id)

  const [addOpen, setAddOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [search, setSearch] = useState('')

  const { data: list } = useQuery<ContactList>({
    queryKey: ['contact-lists', listId],
    queryFn: () => contactListAPI.getOne(listId).then((r) => r.data),
  })

  const { data: contactsData, isLoading } = useQuery<{ contacts: Contact[]; total: number }>({
    queryKey: ['contacts', listId, search],
    queryFn: () => contactListAPI.getContacts(listId, 1, { search: search || undefined }).then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: () => contactListAPI.createContact(listId, { email, phone_number: phone, first_name: firstName, last_name: lastName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', listId] })
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
      setAddOpen(false)
      setEmail(''); setPhone(''); setFirstName(''); setLastName('')
      toast({ title: 'Contact added' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => contactAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts', listId] })
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
      toast({ title: 'Contact deleted' })
    },
  })

  const importMutation = useMutation({
    mutationFn: (file: File) => contactListAPI.importContacts(listId, file),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts', listId] })
      queryClient.invalidateQueries({ queryKey: ['contact-lists'] })
      toast({ title: 'Import complete', description: `${data.data.imported} imported, ${data.data.skipped} skipped` })
    },
  })

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) importMutation.mutate(file)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/contacts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{list?.name || 'Contact List'}</h1>
          <p className="text-muted-foreground">
            {list?.active_count} active / {list?.total_count} total contacts
          </p>
        </div>
        <label className="cursor-pointer">
          <Button variant="outline" asChild>
            <span>
              <Upload className="mr-2 h-4 w-4" /> Import CSV
            </span>
          </Button>
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate() }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <Button type="submit" disabled={addMutation.isPending || (!email && !phone)}>
                {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Input
        placeholder="Search contacts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : contactsData?.contacts && contactsData.contacts.length > 0 ? (
            <div className="divide-y">
              {contactsData.contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 hover:bg-accent/50">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {contact.first_name?.[0]?.toUpperCase() || contact.email?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium">
                        {contact.first_name} {contact.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contact.email} {contact.phone_number && `· ${contact.phone_number}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {contact.is_subscribed ? (
                      <Badge variant="success"><UserCheck className="h-3 w-3 mr-1" /> Subscribed</Badge>
                    ) : (
                      <Badge variant="outline"><UserX className="h-3 w-3 mr-1" /> Unsubscribed</Badge>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(contact.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {search ? 'No contacts match your search' : 'No contacts yet. Add contacts or import a CSV file.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
