'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { toast } from 'sonner'
import { Loader2, Save, Eye, EyeOff, Trash2, Code, ExternalLink } from 'lucide-react'
import { SKILL_CATEGORIES, CATEGORY_LABELS, type SkillCategory } from '@/lib/utils'
import Link from 'next/link'

export default function EditSkillPage({ params }: { params: { slug: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [previewMode, setPreviewMode] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '' as SkillCategory | '',
    version: '',
    content: '',
    readme: '',
    priceCents: 0,
    priceInput: '0',
    isPaid: false,
    isPublished: false,
  })

  useEffect(() => {
    async function loadSkill() {
      try {
        const res = await fetch(`/api/skills/${params.slug}`)
        if (!res.ok) {
          toast.error('Skill not found')
          router.push('/dashboard/skills')
          return
        }
        const data = await res.json()
        setForm({
          name: data.name || '',
          description: data.description || '',
          category: data.category || '',
          version: data.version || '1.0.0',
          content: data.content || '',
          readme: data.readme || '',
          priceCents: data.priceCents || 0,
          priceInput: ((data.priceCents || 0) / 100).toFixed(2),
          isPaid: (data.priceCents || 0) > 0,
          isPublished: data.isPublished || false,
        })
      } catch {
        toast.error('Failed to load skill')
      } finally {
        setFetching(false)
      }
    }
    loadSkill()
  }, [params.slug, router])

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave(publish?: boolean) {
    setLoading(true)
    try {
      const updates: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        category: form.category,
        version: form.version,
        content: form.content,
        readme: form.readme,
        priceCents: form.isPaid ? Math.round(parseFloat(form.priceInput) * 100) : 0,
      }
      if (publish !== undefined) {
        updates.isPublished = publish
      }

      const res = await fetch(`/api/skills/${params.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        toast.success(publish !== undefined ? (publish ? 'Published!' : 'Unpublished') : 'Saved!')
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to save')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this skill? This cannot be undone.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/skills/${params.slug}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Skill deleted')
        router.push('/dashboard/skills')
      } else {
        toast.error('Failed to delete skill')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setDeleting(false)
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Skill</h1>
          <p className="text-muted-foreground text-sm mt-1">{params.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/skills/${params.slug}`} target="_blank">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> View
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => updateField('name', e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} className="mt-1.5 resize-none" rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => updateField('category', v as SkillCategory)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SKILL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Version</Label>
                  <Input value={form.version} onChange={(e) => updateField('version', e.target.value)} className="mt-1.5 font-mono text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Skill Content</CardTitle>
                <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setPreviewMode(!previewMode)}>
                  {previewMode ? <><Code className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {previewMode ? (
                <div className="min-h-[400px] rounded-md border border-border bg-muted/30 p-4">
                  <MarkdownRenderer content={form.content} />
                </div>
              ) : (
                <Textarea value={form.content} onChange={(e) => updateField('content', e.target.value)} className="min-h-[400px] font-mono text-xs resize-y" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">README</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={form.readme} onChange={(e) => updateField('readme', e.target.value)} className="min-h-[200px] font-mono text-xs resize-y" />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant={!form.isPaid ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => updateField('isPaid', false)}>Free</Button>
                <Button variant={form.isPaid ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => updateField('isPaid', true)}>Paid</Button>
              </div>
              {form.isPaid && (
                <div>
                  <Label>Price (USD)</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                    <Input type="number" min="0.99" step="0.01" value={form.priceInput} onChange={(e) => updateField('priceInput', e.target.value)} className="pl-7" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button className="w-full gap-2" onClick={() => handleSave()} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
              {form.isPublished ? (
                <Button variant="outline" className="w-full gap-2" onClick={() => handleSave(false)} disabled={loading}>
                  <EyeOff className="h-4 w-4" /> Unpublish
                </Button>
              ) : (
                <Button variant="outline" className="w-full gap-2" onClick={() => handleSave(true)} disabled={loading}>
                  <Eye className="h-4 w-4" /> Publish
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Status: <span className={form.isPublished ? 'text-emerald-400' : 'text-muted-foreground'}>
                  {form.isPublished ? 'Published' : 'Draft'}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
