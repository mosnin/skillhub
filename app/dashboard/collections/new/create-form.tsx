'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function CreateCollectionForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
  })

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.name.trim().length < 3) {
      toast.error('Name must be at least 3 characters')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Collection created!')
        router.push(`/dashboard/collections/${data.slug}/edit`)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create collection')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="My Awesome Collection"
              className="mt-1.5"
              required
              minLength={3}
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe what this collection is about..."
              className="mt-1.5 resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Collection
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/collections')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
