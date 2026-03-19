import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PLATFORM_FEE_PERCENT = parseInt(
  process.env.PLATFORM_FEE_PERCENT || '20'
)

export function calculateFees(amountCents: number) {
  const platformFeeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100))
  const creatorEarningsCents = amountCents - platformFeeCents
  return { platformFeeCents, creatorEarningsCents }
}

export function formatPrice(cents: number): string {
  if (cents === 0) return 'Free'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}
