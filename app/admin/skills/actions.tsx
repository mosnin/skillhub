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
  isPublished: boolean
  adminNote?: string | null
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
  const [rejectLoading, setRejectLoading] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

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

  async function handleRejectConfirm() {
    setRejectLoading(true)
    try {
      await fetch(`/api/admin/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: true, adminNote: rejectNote }),
      })
      setShowRejectModal(false)
      setRejectNote('')
      router.refresh()
    } finally {
      setRejectLoading(false)
    }
  }

  return (
    <>
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
          variant="destructive"
          onClick={() => setShowRejectModal(true)}
          className="h-7 text-xs px-2 bg-red-900/60 hover:bg-red-800/80 border border-red-700/50"
        >
          Reject
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

      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-2">Reject Skill</h2>
            <p className="text-sm text-gray-400 mb-4">
              This will suspend the skill and send the note below to the author via email.
            </p>
            <textarea
              className="w-full rounded-md border border-[#2a2a2a] bg-[#111111] text-sm text-white placeholder-gray-500 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              rows={4}
              maxLength={500}
              placeholder="Explain why this skill is being rejected…"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1 mb-4 text-right">
              {rejectNote.length}/500
            </p>
            <div className="flex justify-end gap-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectNote('')
                }}
                disabled={rejectLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleRejectConfirm}
                disabled={rejectLoading || rejectNote.trim().length === 0}
              >
                {rejectLoading ? 'Rejecting…' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
