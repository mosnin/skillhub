'use client'

import { useState, useCallback, useEffect } from 'react'
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
import { GitHubImport } from '@/components/github-import'
import { ValidationDisplay } from '@/components/validation-display'
import { toast } from 'sonner'
import {
  Loader2,
  Upload,
  X,
  Eye,
  Code,
  Shield,
  CheckCircle,
  Info,
  Zap,
} from 'lucide-react'
import {
  slugify,
  SKILL_CATEGORIES,
  CATEGORY_LABELS,
  COMPATIBLE_FRAMEWORKS,
  type SkillCategory,
} from '@/lib/utils'
import type { ValidationResult } from '@/lib/skill-validator'

const DEFAULT_SKILL_CONTENT = `---
name: My Skill
slug: my-skill
version: 1.0.0
description: A brief description of what this skill does (minimum 20 characters)
author: your-username
category: productivity
tags: [automation, workflow]
compatible_with: [claude-code, cursor, openclaw]
user-invocable: true
---

# My Skill

## Overview

Describe what your skill does here. This content is used by AI agents as instructions.

## Instructions

When asked to help with [task], you should:

1. [Step one — be specific]
2. [Step two]
3. [Step three]

Always explain your reasoning and consider edge cases.

## Usage

Install this skill:
\`\`\`bash
npx skillhub@latest install my-skill
\`\`\`

Then reference in CLAUDE.md:
\`\`\`
@.skillhub/skills/my-skill/SKILL.md
\`\`\`

## Examples

### Example 1
**User:** [Example prompt]
**Assistant:** [Expected response]

## Notes

- [Any requirements or limitations]
`

export default function UploadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validationDebounce, setValidationDebounce] = useState<NodeJS.Timeout | null>(null)

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
    readme: '',
    compatibleWith: ['claude-code', 'openclaw'] as string[],
    userInvocable: true,
    homepage: '',
    githubRepo: '',
    githubPath: '',
    githubRef: '',
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
    if (tag && !form.tags.includes(tag) && form.tags.length < 10) {
      updateField('tags', [...form.tags, tag])
      updateField('tagInput', '')
    }
  }

  function removeTag(tag: string) {
    updateField('tags', form.tags.filter((t) => t !== tag))
  }

  function toggleFramework(fw: string) {
    setForm((prev) => ({
      ...prev,
      compatibleWith: prev.compatibleWith.includes(fw)
        ? prev.compatibleWith.filter((f) => f !== fw)
        : [...prev.compatibleWith, fw],
    }))
  }

  // Auto-validate content after typing stops
  function scheduleValidation(content: string) {
    if (validationDebounce) clearTimeout(validationDebounce)
    const t = setTimeout(async () => {
      if (content.trim().length < 50) return
      setValidating(true)
      try {
        const res = await fetch('/api/v1/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, slug: form.slug || undefined }),
        })
        const data = await res.json()
        setValidationResult(data)
      } catch {
        // Ignore validation errors
      } finally {
        setValidating(false)
      }
    }, 800)
    setValidationDebounce(t)
  }

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const content = e.target.value
    updateField('content', content)
    scheduleValidation(content)
  }

  // Handle GitHub import
  function handleGitHubImport(data: {
    content: string
    repo: string
    path: string
    ref: string
    validation: {
      valid: boolean
      errors: ValidationResult['errors']
      warnings: ValidationResult['warnings']
      meta: ValidationResult['meta']
    }
  }) {
    updateField('content', data.content)
    updateField('githubRepo', data.repo)
    updateField('githubPath', data.path)
    updateField('githubRef', data.ref)

    // Pre-fill from parsed metadata
    if (data.validation.meta) {
      const meta = data.validation.meta
      if (meta.name && !form.name) updateField('name', meta.name)
      if (meta.slug && !form.slug) updateField('slug', meta.slug)
      if (meta.description && !form.description) updateField('description', meta.description)
      if (meta.version) updateField('version', meta.version)
      if (meta.category) updateField('category', meta.category as SkillCategory)
      if (meta.tags?.length) updateField('tags', meta.tags)
      if (meta.compatibleWith?.length) updateField('compatibleWith', meta.compatibleWith)
    }

    setValidationResult({
      valid: data.validation.valid,
      errors: data.validation.errors,
      warnings: data.validation.warnings,
      meta: data.validation.meta,
      contentLines: 0,
      hasSystemPrompt: false,
      hasUsageSection: false,
      hasExamplesSection: false,
    })
  }

  async function handleSubmit(publish: boolean) {
    if (!form.name || !form.slug || !form.description || !form.category) {
      toast.error('Fill in all required fields')
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
          compatibleWith: form.compatibleWith,
          userInvocable: form.userInvocable,
          homepage: form.homepage || undefined,
          githubRepo: form.githubRepo || undefined,
          githubPath: form.githubPath || undefined,
          githubRef: form.githubRef || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(publish ? 'Skill published!' : 'Draft saved!')
        router.push(`/skills/${data.slug}`)
      } else if (res.status === 422 && data.validation) {
        toast.error('Fix validation errors before publishing')
        setValidationResult({
          valid: false,
          errors: data.validation.errors,
          warnings: data.validation.warnings,
          meta: null,
          contentLines: 0,
          hasSystemPrompt: false,
          hasUsageSection: false,
          hasExamplesSection: false,
        })
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publish a Skill</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create an AI agent skill compatible with Claude Code, Cursor, OpenClaw, and more
          </p>
        </div>
        <GitHubImport onImport={handleGitHubImport} />
      </div>

      {/* GitHub source badge */}
      {form.githubRepo && (
        <div className="flex items-center gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm">
          <CheckCircle className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="text-blue-400">Imported from</span>
          <a
            href={`https://github.com/${form.githubRepo}`}
            target="_blank"
            rel="noreferrer"
            className="text-blue-300 hover:underline font-mono text-xs"
          >
            {form.githubRepo}/{form.githubPath}
          </a>
          <button
            className="ml-auto text-muted-foreground hover:text-foreground"
            onClick={() => { updateField('githubRepo', ''); updateField('githubPath', ''); updateField('githubRef', '') }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input id="name" value={form.name} onChange={handleNameChange} placeholder="My Awesome Skill" className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="slug">Slug <span className="text-destructive">*</span></Label>
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
                <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="A short description (min. 20 characters) of what your skill does..."
                  className="mt-1.5 resize-none"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select value={form.category} onValueChange={(v) => updateField('category', v as SkillCategory)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {SKILL_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="version">Version</Label>
                  <Input id="version" value={form.version} onChange={(e) => updateField('version', e.target.value)} placeholder="1.0.0" className="mt-1.5 font-mono text-sm" />
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
                    placeholder="Add tag..."
                    className="text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}><X className="h-2.5 w-2.5" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              {/* Homepage */}
              <div>
                <Label htmlFor="homepage">Homepage URL (optional)</Label>
                <Input
                  id="homepage"
                  type="url"
                  value={form.homepage}
                  onChange={(e) => updateField('homepage', e.target.value)}
                  placeholder="https://github.com/you/your-repo"
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Skill Content */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Skill Content (SKILL.md)</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">YAML frontmatter + markdown instructions for AI agents</p>
                </div>
                <div className="flex gap-1">
                  <Button variant={!previewMode ? 'default' : 'ghost'} size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setPreviewMode(false)}>
                    <Code className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant={previewMode ? 'default' : 'ghost'} size="sm" className="gap-1.5 h-7 text-xs" onClick={() => setPreviewMode(true)}>
                    <Eye className="h-3 w-3" /> Preview
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {previewMode ? (
                <div className="min-h-[400px] rounded-md border border-border bg-muted/30 p-4">
                  <MarkdownRenderer content={form.content} />
                </div>
              ) : (
                <Textarea
                  value={form.content}
                  onChange={handleContentChange}
                  className="min-h-[400px] font-mono text-xs resize-y"
                  placeholder="Enter your SKILL.md content..."
                />
              )}

              {/* Validation results */}
              <ValidationDisplay result={validationResult} loading={validating} />
            </CardContent>
          </Card>

          {/* README */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">README (Documentation)</CardTitle>
              <p className="text-xs text-muted-foreground">Shown on the skill page. Supports markdown.</p>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.readme}
                onChange={(e) => updateField('readme', e.target.value)}
                className="min-h-[200px] font-mono text-xs resize-y"
                placeholder="Write documentation for your skill..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Compatible Frameworks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                Compatible With
              </CardTitle>
              <p className="text-xs text-muted-foreground">Select all frameworks this skill supports</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {COMPATIBLE_FRAMEWORKS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleFramework(value)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-md border transition-colors flex items-center justify-between ${
                    form.compatibleWith.includes(value)
                      ? 'border-primary/50 bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                  }`}
                >
                  {label}
                  {form.compatibleWith.includes(value) && (
                    <CheckCircle className="h-3.5 w-3.5" />
                  )}
                </button>
              ))}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user-invocable"
                  checked={form.userInvocable}
                  onChange={(e) => updateField('userInvocable', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="user-invocable" className="text-sm cursor-pointer">
                  User-invocable (slash command)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader><CardTitle className="text-base">Pricing</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button variant={!form.isPaid ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => updateField('isPaid', false)}>Free</Button>
                <Button variant={form.isPaid ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => updateField('isPaid', true)}>Paid</Button>
              </div>
              {form.isPaid && (
                <div>
                  <Label htmlFor="price">Price (USD)</Label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
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

          {/* Security info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground mb-1">Security Scanning</p>
                  <p>All skills are scanned with VirusTotal after upload. Skills flagged by multiple engines are automatically suspended pending review.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Publish */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Button className="w-full gap-2" onClick={() => handleSubmit(true)} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Publish Skill
              </Button>
              <Button variant="outline" className="w-full" onClick={() => handleSubmit(false)} disabled={loading}>
                Save as Draft
              </Button>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Published skills appear in marketplace immediately</p>
                <p>• Security scan runs automatically after publish</p>
                <p>• OpenClaw-compatible format is required for cross-platform support</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
