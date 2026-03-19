'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
<parameter name="content">'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Github, Loader2, AlertCircle, CheckCircle, FileText, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import type { ValidationResult } from '@/lib/skill-validator'

interface ImportedSkill {
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
}

interface GitHubImportProps {
  onImport: (data: ImportedSkill) => void
}

interface SkillFile {
  path: string
  name: string
  size: number
  url: string
}

export function GitHubImport({ onImport }: GitHubImportProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [skillFiles, setSkillFiles] = useState<SkillFile[] | null>(null)
  const [listingRepo, setListingRepo] = useState('')
  const [step, setStep] = useState<'input' | 'select' | 'preview'>('input')
  const [preview, setPreview] = useState<ImportedSkill | null>(null)

  async function handleList() {
    if (!url.trim()) return
    setLoading(true)
    setSkillFiles(null)
    setListingRepo('')

    try {
      const res = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, listOnly: true }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to fetch repository')
        return
      }
      if (data.files.length === 0) {
        toast.error('No SKILL.md files found in this repository')
        return
      }
      setListingRepo(data.repo)
      setSkillFiles(data.files)
      setStep('select')
    } catch {
      toast.error('Failed to connect to GitHub')
    } finally {
      setLoading(false)
    }
  }

  async function handleImport(fileUrl?: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: fileUrl || url }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Import failed')
        return
      }
      setPreview(data)
      setStep('preview')
    } catch {
      toast.error('Import failed')
    } finally {
      setLoading(false)
    }
  }

  function handleConfirm() {
    if (!preview) return
    onImport(preview)
    setOpen(false)
    setStep('input')
    setUrl('')
    setPreview(null)
    setSkillFiles(null)
    toast.success(`Imported ${preview.validation.meta?.name || 'skill'} from GitHub`)
  }

  function reset() {
    setStep('input')
    setSkillFiles(null)
    setPreview(null)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Github className="h-4 w-4" />
          Import from GitHub
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Import from GitHub
          </DialogTitle>
          <DialogDescription>
            Import a SKILL.md from any public GitHub repository
          </DialogDescription>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="github-url">Repository URL or shorthand</Label>
              <Input
                id="github-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleList()}
                placeholder="e.g. user/repo or https://github.com/user/repo/blob/main/SKILL.md"
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Supported formats:</p>
              <p><code className="bg-muted px-1 rounded">user/repo</code> — auto-detects SKILL.md</p>
              <p><code className="bg-muted px-1 rounded">user/repo/skills/</code> — lists all skills</p>
              <p><code className="bg-muted px-1 rounded">https://github.com/user/repo/blob/main/SKILL.md</code></p>
            </div>
            <DialogFooter>
              <Button onClick={handleList} disabled={loading || !url.trim()} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
                Browse Repository
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'select' && skillFiles && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Github className="h-4 w-4" />
              <span className="font-medium text-foreground">{listingRepo}</span>
              <span>— {skillFiles.length} skill{skillFiles.length !== 1 ? 's' : ''} found</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillFiles.map((file) => (
                <button
                  key={file.path}
                  className="w-full text-left flex items-center justify-between rounded-md border border-border p-3 hover:bg-accent transition-colors group"
                  onClick={() => handleImport(file.url)}
                  disabled={loading}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{file.path}</p>
                    </div>
                  </div>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  )}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={reset}>Back</Button>
            </DialogFooter>
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            {preview.validation.meta && (
              <div className="rounded-md border border-border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{preview.validation.meta.name}</p>
                    <p className="text-sm text-muted-foreground">{preview.validation.meta.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                    v{preview.validation.meta.version}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {preview.repo}/{preview.path}
                </p>
              </div>
            )}

            {/* Validation results */}
            {preview.validation.errors.length > 0 && (
              <div className="space-y-1">
                {preview.validation.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-red-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{e.field}: {e.message}</span>
                  </div>
                ))}
              </div>
            )}

            {preview.validation.warnings.length > 0 && (
              <div className="space-y-1">
                {preview.validation.warnings.slice(0, 3).map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-yellow-400">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{w.field}: {w.message}</span>
                  </div>
                ))}
              </div>
            )}

            {preview.validation.valid && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" />
                Skill content is valid
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={reset}>Back</Button>
              <Button onClick={handleConfirm} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Use This Skill
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
