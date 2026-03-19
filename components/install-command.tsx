'use client'

import { useState } from 'react'
import { Copy, Check, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InstallCommandProps {
  slug: string
  className?: string
  variant?: 'default' | 'compact'
}

export function InstallCommand({ slug, className, variant = 'default' }: InstallCommandProps) {
  const [copied, setCopied] = useState(false)
  const command = `npx skillhub@latest install ${slug}`

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center justify-between rounded-md bg-muted/50 border border-border/50 px-3 py-2 font-mono text-sm',
          className
        )}
      >
        <span className="text-muted-foreground truncate">{command}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 ml-2"
          onClick={copyToClipboard}
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">Install</span>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <code className="font-mono text-sm text-foreground">{command}</code>
        <Button
          variant="ghost"
          size="sm"
          className="ml-3 shrink-0 h-8 gap-1.5"
          onClick={copyToClipboard}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
