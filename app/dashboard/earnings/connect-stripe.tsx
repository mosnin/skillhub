'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Link as LinkIcon } from 'lucide-react'
import { toast } from 'sonner'

export function ConnectStripeButton() {
  const [loading, setLoading] = useState(false)

  async function handleConnect() {
    setLoading(true)
    try {
      const res = await fetch('/api/connect/stripe', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to connect Stripe')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      className="shrink-0 gap-1.5"
      onClick={handleConnect}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <LinkIcon className="h-3.5 w-3.5" />
      )}
      Connect Stripe
    </Button>
  )
}
