'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SignInButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Download, ShoppingCart, Loader2, CheckCircle, Settings } from 'lucide-react'
import { toast } from 'sonner'

interface PurchaseButtonProps {
  skillId: string
  slug: string
  priceCents: number
  hasPurchased: boolean
  isOwner: boolean
}

export function PurchaseButton({
  skillId,
  slug,
  priceCents,
  hasPurchased,
  isOwner,
}: PurchaseButtonProps) {
  const { isSignedIn } = useUser()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  if (isOwner) {
    return (
      <Button variant="outline" className="w-full gap-2" asChild>
        <a href={`/dashboard/skills/${slug}/edit`}>
          <Settings className="h-4 w-4" />
          Edit Skill
        </a>
      </Button>
    )
  }

  if (hasPurchased) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm mb-3">
          <CheckCircle className="h-4 w-4" />
          {priceCents === 0 ? 'Free to install' : 'Purchased'}
        </div>
        <Button className="w-full gap-2" variant="outline">
          <Download className="h-4 w-4" />
          View Install Command
        </Button>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <Button className="w-full gap-2">
          <ShoppingCart className="h-4 w-4" />
          {priceCents === 0 ? 'Install for Free' : `Buy for $${(priceCents / 100).toFixed(2)}`}
        </Button>
      </SignInButton>
    )
  }

  async function handlePurchase() {
    if (priceCents === 0) {
      // Free skill — just track install
      router.refresh()
      toast.success('Skill added to your library!')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to start checkout')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      className="w-full gap-2"
      onClick={handlePurchase}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ShoppingCart className="h-4 w-4" />
      )}
      {priceCents === 0 ? 'Install for Free' : `Buy for $${(priceCents / 100).toFixed(2)}`}
    </Button>
  )
}
