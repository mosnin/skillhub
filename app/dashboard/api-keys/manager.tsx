'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Copy, Trash2, Plus, Loader2, Eye, EyeOff, Key } from 'lucide-react'
import { timeAgo } from '@/lib/utils'
import type { ApiKey } from '@/lib/db/schema'

interface ApiKeysManagerProps {
  keys: ApiKey[]
}

export function ApiKeysManager({ keys }: ApiKeysManagerProps) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleCreate() {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName }),
      })
      const data = await res.json()
      if (res.ok) {
        setNewlyCreatedKey(data.key)
        setNewKeyName('')
        setShowCreate(false)
        router.refresh()
        toast.success('API key created')
      } else {
        toast.error(data.error || 'Failed to create key')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/keys/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
        toast.success('API key deleted')
      } else {
        toast.error('Failed to delete key')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Newly created key alert */}
      {newlyCreatedKey && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3">
          <p className="text-xs text-emerald-400 mb-2 font-medium">
            Save this key — it won&apos;t be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 font-mono text-xs bg-background rounded px-2 py-1.5 truncate">
              {showKey ? newlyCreatedKey : '•'.repeat(40)}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => {
                navigator.clipboard.writeText(newlyCreatedKey)
                toast.success('Copied!')
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate ? (
        <div className="rounded-md border border-border p-3 space-y-3">
          <Label htmlFor="keyName" className="text-sm">Key Name</Label>
          <Input
            id="keyName"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="e.g. Development, CI/CD"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={creating} className="gap-1.5">
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create Key
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          New API Key
        </Button>
      )}

      {/* Keys list */}
      {keys.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          <Key className="h-8 w-8 mx-auto mb-2 opacity-30" />
          No API keys yet
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium">{key.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Created {timeAgo(key.createdAt)}
                  {key.lastUsedAt && ` · Last used ${timeAgo(key.lastUsedAt)}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive/70 hover:text-destructive"
                onClick={() => handleDelete(key.id)}
                disabled={deletingId === key.id}
              >
                {deletingId === key.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
