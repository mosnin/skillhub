'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'

interface AdminSkillActionsProps {
  skillId: string
  skillSlug: string
  isSuspended: boolean
  isFeatured: boolean
}

export function AdminSkillActions({
  skillId,
  skillSlug,
  isSuspended,
  isFeatured,
}: AdminSkillActionsProps) {
  const router = useRouter()
  const [suspendLoading, setSuspendLoading] = useState(false)
  const [featureLoading, setFeatureLoading] = useState(false)

  async function handleSuspend() {
    setSuspendLoading(true)
    try {
      await fetch(`/api/admin/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: !isSuspended }),
      })
      router.refresh()
    } finally {
      setSuspendLoading(false)
    }
  }

  async function handleFeature() {
    setFeatureLoading(true)
    try {
      await fetch(`/api/admin/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !isFeatured }),
      })
      router.refresh()
    } finally {
      setFeatureLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        size="sm"
        variant={isSuspended ? 'outline' : 'destructive'}
        onClick={handleSuspend}
        disabled={suspendLoading}
        className="h-7 text-xs px-2"
      >
        {suspendLoading ? '…' : isSuspended ? 'Unsuspend' : 'Suspend'}
      </Button>
      <Button
        size="sm"
        variant={isFeatured ? 'outline' : 'secondary'}
        onClick={handleFeature}
        disabled={featureLoading}
        className="h-7 text-xs px-2"
      >
        {featureLoading ? '…' : isFeatured ? 'Unfeature' : 'Feature'}
      </Button>
      <Link href={`/skills/${skillSlug}`} target="_blank" rel="noopener noreferrer">
        <Button size="sm" variant="ghost" className="h-7 text-xs px-2">
          <ExternalLink className="h-3 w-3" />
        </Button>
      </Link>
    </div>
  )
}
