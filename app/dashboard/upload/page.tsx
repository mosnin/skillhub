'use client'

import { useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { toast } from 'sonner'
import { Loader2, Upload, X, Eye, Code } from 'lucide-react'
import { slugify, SKILL_CATEGORIES, CATEGORY_LABELS, type SkillCategory } from '@/lib/utils'

const DEFAULT_SKILL_CONTENT = `---
name: My Awesome Skill
slug: my-awesome-skill
version: 1.0.0
description: A brief description of what this skill does
author: your-username
category: productivity
tags: [automation, workflow]
---

# My Awesome Skill

## Description

Describe what your skill does here. This content will be used by AI agents.

## Instructions

When asked to help with [task], you should:

1. First, [step one]
2. Then, [step two]
3. Finally, [step three]

## Examples

### Example 1
**User:** Do X
**Assistant:** [expected behavior]

## Notes

- Any important caveats
- Required API keys or tools
- Limitations
`

const DEFAULT_README = `# My Awesome Skill

A brief description of your skill.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
npx skillhub@latest install my-awesome-skill
\`\`\`

## Usage

Explain how to use your skill here.

## Requirements

List any requirements or dependencies.
`

export default function UploadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    category: '' as SkillCategory | '',
    tags: [] as string[],
    tagInput: '',
    priceCents: 0,
    priceInput: '0',
    isPaid: false,
    version: '1.0.0',
    content: DEFAULT_SKILL_CONTENT,
    readme: DEFAULT_README,
  })

  function updateField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const name = e.target.value
    updateField('name', name)
    if (!form.slug || form.slug === slugify(form.name)) {
      updateField('slug', slugify(name))
    }
  }

  function addTag() {
    const tag = form.tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (tag && !form.tags.includes(tag) && form.tags.length < 8) {
      updateField('tags', [...form.tags, tag])
      updateField('tagInput', '')
    }
  }

  function removeTag(tag: string) {
    updateField('tags', form.tags.filter((t) => t !== tag))
  }

  async function handleSubmit(publish: boolean) {
    if (!form.name || !form.slug || !form.description || !form.category) {
      toast.error('Please fill in all required fields')
      return
    }
    if (!form.content.trim()) {
      toast.error('Skill content is required')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          description: form.description,
          category: form.category,
          tags: form.tags,
          priceCents: form.isPaid ? Math.round(parseFloat(form.priceInput) * 100) : 0,
          version: form.version,
          content: form.content,
          readme: form.readme,
          isPublished: publish,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(publish ? 'Skill published!' : 'Draft saved!')
        router.push(`/skills/${data.slug}`)
      } else {
        toast.error(data.error || 'Failed to create skill')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Publish a Skill</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create and publish your AI agent skill to the marketplace
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={handleNameChange}
                  placeholder="My Awesome Skill"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="slug">
                  Slug <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => updateField('slug', e.target.value)}
                  placeholder="my-awesome-skill"
                  className="mt-1.5 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Install: <code className="text-primary">npx skillhub@latest install {form.slug || 'your-slug'}</code>
                </p>
              </div>

              <div>
                <Label htmlFor="description">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="A short description of what your skill does..."
                  className="mt-1.5 resize-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => updateField('category', v as SkillCategory)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {CATEGORY_LABELS[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={form.version}
                    onChange={(e) => updateField('version', e.target.value)}
                    placeholder="1.0.0"
                    className="mt-1.5 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={form.tagInput}
                    onChange={(e) => updateField('tagInput', e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add a tag..."
                    className="text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Skill Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Skill Content (SKILL.md)</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant={activeTab === 'edit' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-1.5 h-7 text-xs"
                    onClick={() => setActiveTab('edit')}
                  >
                    <Code className="h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant={activeTab === 'preview' ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-1.5 h-7 text-xs"
                    onClick={() => setActiveTab('preview')}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === 'edit' ? (
                <Textarea
                  value={form.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  className="min-h-[400px] font-mono text-xs resize-y"
                  placeholder="Enter your SKILL.md content..."
                />
              ) : (
                <div className="min-h-[400px] rounded-md border border-border bg-muted/30 p-4">
                  <MarkdownRenderer content={form.content} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* README */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">README (Documentation)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.readme}
                onChange={(e) => updateField('readme', e.target.value)}
                className="min-h-[300px] font-mono text-xs resize-y"
                placeholder="Write documentation for your skill..."
              />
              <p className="text-xs text-muted-foreground mt-2">
                Markdown is supported. This is shown on the skill page.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={!form.isPaid ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => updateField('isPaid', false)}
                >
                  Free
                </Button>
                <Button
                  variant={form.isPaid ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => updateField('isPaid', true)}
                >
                  Paid
                </Button>
              </div>

              {form.isPaid && (
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="price"
                      type="number"
                      min="0.99"
                      step="0.01"
                      value={form.priceInput}
                      onChange={(e) => updateField('priceInput', e.target.value)}
                      className="pl-7"
                      placeholder="9.99"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    You earn 80% — ${form.priceInput ? (parseFloat(form.priceInput) * 0.8).toFixed(2) : '0.00'} per sale
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Publish */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button
                className="w-full gap-2"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Publish Skill
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                Save as Draft
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Published skills appear in the marketplace immediately
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
