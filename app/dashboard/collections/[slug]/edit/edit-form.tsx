'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Trash2, Plus, GripVertical } from 'lucide-react'

interface CollectionSkill {
  id: string
  slug: string
  name: string
  description: string
  category: string
  position: number
}

interface AddableSkill {
  id: string
  slug: string
  name: string
  description: string
  category: string
}

interface CollectionData {
  id: string
  slug: string
  name: string
  description: string | null
  isPublished: boolean
}

interface EditCollectionFormProps {
  collection: CollectionData
  collectionSkills: CollectionSkill[]
  addableSkills: AddableSkill[]
}

export function EditCollectionForm({
  collection,
  collectionSkills: initialSkills,
  addableSkills: initialAddable,
}: EditCollectionFormProps) {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: collection.name,
    description: collection.description ?? '',
    isPublished: collection.isPublished,
  })

  const [currentSkills, setCurrentSkills] = useState<CollectionSkill[]>(initialSkills)
  const [addableSkills, setAddableSkills] = useState<AddableSkill[]>(initialAddable)
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [removingSkillId, setRemovingSkillId] = useState<string | null>(null)

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (form.name.trim().length < 3) {
      toast.error('Name must be at least 3 characters')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/collections/${collection.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          isPublished: form.isPublished,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        toast.success('Collection updated!')
        // If slug changed, navigate to new edit URL
        if (updated.slug !== collection.slug) {
          router.push(`/dashboard/collections/${updated.slug}/edit`)
        } else {
          router.refresh()
        }
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update collection')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function handleAddSkill() {
    if (!selectedSkillId) return
    setAddingSkill(true)
    try {
      const res = await fetch(`/api/collections/${collection.slug}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId: selectedSkillId }),
      })
      if (res.ok) {
        const skill = addableSkills.find((s) => s.id === selectedSkillId)!
        const newSkill: CollectionSkill = {
          ...skill,
          position: currentSkills.length,
        }
        setCurrentSkills((prev) => [...prev, newSkill])
        setAddableSkills((prev) => prev.filter((s) => s.id !== selectedSkillId))
        setSelectedSkillId('')
        toast.success('Skill added to collection')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to add skill')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setAddingSkill(false)
    }
  }

  async function handleRemoveSkill(skillId: string) {
    setRemovingSkillId(skillId)
    try {
      const res = await fetch(
        `/api/collections/${collection.slug}/skills?skillId=${skillId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        const removed = currentSkills.find((s) => s.id === skillId)!
        setCurrentSkills((prev) => prev.filter((s) => s.id !== skillId))
        setAddableSkills((prev) => [
          ...prev,
          { id: removed.id, slug: removed.slug, name: removed.name, description: removed.description, category: removed.category },
        ])
        toast.success('Skill removed from collection')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to remove skill')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setRemovingSkillId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Collection Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
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
            <div className="flex items-center gap-3">
              <Switch
                id="isPublished"
                checked={form.isPublished}
                onCheckedChange={(val) => updateField('isPublished', val)}
              />
              <Label htmlFor="isPublished" className="cursor-pointer">
                Published
              </Label>
              {form.isPublished ? (
                <Badge variant="success" className="text-xs">Public</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">Draft</Badge>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/collections')}
              >
                Back
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Skills in Collection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Skills in Collection
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({currentSkills.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {currentSkills.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No skills added yet. Add skills below.
            </p>
          ) : (
            currentSkills.map((skill) => (
              <div
                key={skill.id}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{skill.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{skill.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 shrink-0"
                  disabled={removingSkillId === skill.id}
                  onClick={() => handleRemoveSkill(skill.id)}
                >
                  {removingSkillId === skill.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Add Skill */}
      {addableSkills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a Skill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <select
                value={selectedSkillId}
                onChange={(e) => setSelectedSkillId(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select a skill to add...</option>
                {addableSkills.map((skill) => (
                  <option key={skill.id} value={skill.id}>
                    {skill.name}
                  </option>
                ))}
              </select>
              <Button
                onClick={handleAddSkill}
                disabled={!selectedSkillId || addingSkill}
                className="gap-2 shrink-0"
              >
                {addingSkill ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {addableSkills.length === 0 && currentSkills.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          All your published skills are already in this collection.
        </p>
      )}
    </div>
  )
}
