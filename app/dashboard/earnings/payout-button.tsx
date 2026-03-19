'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowUpRight } from 'lucide-react'

export function PayoutButton() {
  const [loading, setLoading] = useState(false)

  async function handlePayout() {
    setLoading(true)
    try {
      const res = await fetch('/api/payouts', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data?.error || 'Failed to request payout')
        return
      }

      const formatted = data.amount
        ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(data.amount / 100)
        : 'your balance'

      toast.success(`Payout of ${formatted} initiated successfully!`)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handlePayout}
      disabled={loading}
      size="sm"
      className="gap-1.5 shrink-0"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ArrowUpRight className="h-3.5 w-3.5" />
      )}
      {loading ? 'Processing...' : 'Request Payout'}
    </Button>
  )
}
