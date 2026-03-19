'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StarRating } from '@/components/star-rating'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function ReviewForm({ skillId }: { skillId: string }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) {
      toast.error('Please select a rating')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/skills/${skillId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      })
      if (res.ok) {
        toast.success('Review submitted!')
        setRating(0)
        setComment('')
        router.refresh()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to submit review')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-card p-4 mb-6">
      <h3 className="text-sm font-semibold mb-3">Write a Review</h3>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Rating</Label>
          <StarRating value={rating} onChange={setRating} size="lg" />
        </div>
        <div>
          <Label htmlFor="comment" className="text-xs text-muted-foreground mb-1.5 block">
            Comment (optional)
          </Label>
          <Textarea
            id="comment"
            placeholder="Share your experience with this skill..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[80px] resize-none text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading || rating === 0}>
          {loading && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
          Submit Review
        </Button>
      </div>
    </form>
  )
}
