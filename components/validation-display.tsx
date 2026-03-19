'use client'

import { CheckCircle, XCircle, AlertCircle, Loader2, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ValidationResult } from '@/lib/skill-validator'

interface ValidationDisplayProps {
  result: ValidationResult | null
  loading?: boolean
  className?: string
}

export function ValidationDisplay({ result, loading, className }: ValidationDisplayProps) {
  if (loading) {
    return (
      <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Validating skill content...
        </div>
      </div>
    )
  }

  if (!result) return null

  const statusColor = result.valid
    ? 'border-emerald-500/30 bg-emerald-500/5'
    : 'border-red-500/30 bg-red-500/5'

  return (
    <div className={cn('rounded-lg border p-4 space-y-3', statusColor, className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {result.valid ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400" />
          )}
          <span className="text-sm font-medium">
            {result.valid ? 'Validation passed' : `${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {result.warnings.length > 0 && (
            <Badge variant="warning" className="text-xs">
              {result.warnings.length} warning{result.warnings.length !== 1 ? 's' : ''}
            </Badge>
          )}
          {result.valid && (
            <Badge variant="success" className="text-xs">Ready to publish</Badge>
          )}
        </div>
      </div>

      {/* Errors */}
      {result.errors.length > 0 && (
        <div className="space-y-1.5">
          {result.errors.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-red-400 font-medium">{e.field}</span>
                <span className="text-muted-foreground ml-1">{e.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="space-y-1.5">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <AlertCircle className="h-3.5 w-3.5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-yellow-400 font-medium">{w.field}</span>
                <span className="text-muted-foreground ml-1">{w.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Checklist */}
      {result.valid && (
        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/30">
          {[
            { label: 'Valid frontmatter', ok: !!result.meta },
            { label: 'Required fields', ok: result.errors.filter(e => e.code.startsWith('MISSING')).length === 0 },
            { label: 'Valid semver', ok: !result.errors.find(e => e.code === 'INVALID_VERSION') },
            { label: 'Sufficient content', ok: !result.errors.find(e => e.code === 'CONTENT_TOO_SHORT') },
            { label: 'Usage section', ok: result.hasUsageSection },
            { label: 'Examples section', ok: result.hasExamplesSection },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              {ok ? (
                <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-3 w-3 text-yellow-400 shrink-0" />
              )}
              <span className={ok ? 'text-muted-foreground' : 'text-yellow-400/80'}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* OpenClaw compatibility note */}
      {result.valid && result.meta?.compatibleWith && result.meta.compatibleWith.includes('openclaw') && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/30">
          <Shield className="h-3.5 w-3.5 text-primary" />
          OpenClaw compatible skill detected
        </div>
      )}
    </div>
  )
}
