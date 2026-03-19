'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ChevronDown, ChevronUp, Upload } from 'lucide-react'

interface PublishVersionFormProps {
  slug: string
  currentVersion: string
  currentContent: string
}

function bumpPatch(version: string): string {
  const parts = version.split('.').map(Number)
  if (parts.length === 3 && parts.every((n) => !isNaN(n))) {
    parts[2] += 1
    return parts.join('.')
  }
  return version
}

const SEMVER_RE = /^\d+\.\d+\.\d+$/

export function PublishVersionForm({
  slug,
  currentVersion,
  currentContent,
}: PublishVersionFormProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [version, setVersion] = useState(bumpPatch(currentVersion))
  const [content, setContent] = useState(currentContent)
  const [changelog, setChangelog] = useState('')

  const versionError = version && !SEMVER_RE.test(version)
    ? 'Must be in semver format (e.g. 1.2.3)'
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (versionError) {
      toast.error('Please fix validation errors before submitting.')
      return
    }
    if (!content.trim() || content.trim().length < 10) {
      toast.error('Content must be at least 10 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/skills/${slug}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: version.trim(),
          content: content.trim(),
          changelog: changelog.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const message =
          data?.issues?.[0]?.message || data?.error || 'Failed to publish version'
        toast.error(message)
        return
      }

      toast.success(`Version v${data.version.version} published successfully!`)
      setOpen(false)
      setChangelog('')
      router.refresh()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Publish New Version
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              current: v{currentVersion}
            </Badge>
            {open ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>

      {open && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Version number */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="new-version">
                New Version Number
              </label>
              <input
                id="new-version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.2.3"
                required
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-mono"
              />
              {versionError && (
                <p className="text-xs text-destructive">{versionError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Use semantic versioning: MAJOR.MINOR.PATCH
              </p>
            </div>

            {/* Updated content */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="skill-content">
                Updated Content
              </label>
              <textarea
                id="skill-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={12}
                required
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm font-mono resize-y"
              />
              <p className="text-xs text-muted-foreground">
                {content.trim().length} characters (minimum 10)
              </p>
            </div>

            {/* Changelog */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="changelog">
                Changelog{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                id="changelog"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Describe what changed in this version..."
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm resize-y"
              />
              <p className="text-xs text-muted-foreground">
                {changelog.length}/1000 characters
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <Button
                type="submit"
                disabled={loading || !!versionError}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {loading ? 'Publishing...' : 'Publish Version'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  )
}
