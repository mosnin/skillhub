import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { stripe } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  // 1. Auth check
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get user from DB
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!user.stripeAccountEnabled || !user.stripeAccountId) {
    return NextResponse.json(
      { error: 'Stripe account not connected. Please connect your Stripe account first.' },
      { status: 400 }
    )
  }

  // 3. Get available balance
  let balance: Awaited<ReturnType<typeof stripe.balance.retrieve>>
  try {
    balance = await stripe.balance.retrieve({ stripeAccount: user.stripeAccountId })
  } catch (err: any) {
    console.error('[payouts] Failed to retrieve balance:', err?.message)
    return NextResponse.json(
      { error: 'Failed to retrieve Stripe balance. Please try again.' },
      { status: 502 }
    )
  }

  const availableUsd = balance.available.find((b) => b.currency === 'usd')
  const availableAmount = availableUsd?.amount ?? 0

  // 4. If available USD balance is 0, return error
  if (availableAmount <= 0) {
    return NextResponse.json(
      { error: 'No available balance to pay out.' },
      { status: 400 }
    )
  }

  // 5. Create payout — try instant first, fall back to standard
  let payout: Awaited<ReturnType<typeof stripe.payouts.create>>
  try {
    payout = await stripe.payouts.create(
      { amount: availableAmount, currency: 'usd', method: 'instant' },
      { stripeAccount: user.stripeAccountId }
    )
  } catch (instantErr: any) {
    // Instant payouts may not be available for all accounts/banks
    if (
      instantErr?.code === 'instant_payouts_unsupported' ||
      instantErr?.code === 'instant_payouts_limit_exceeded' ||
      instantErr?.type === 'invalid_request_error'
    ) {
      try {
        payout = await stripe.payouts.create(
          { amount: availableAmount, currency: 'usd', method: 'standard' },
          { stripeAccount: user.stripeAccountId }
        )
      } catch (standardErr: any) {
        console.error('[payouts] Failed to create standard payout:', standardErr?.message)
        return NextResponse.json(
          { error: standardErr?.message || 'Failed to create payout. Please try again.' },
          { status: 502 }
        )
      }
    } else {
      console.error('[payouts] Failed to create instant payout:', instantErr?.message)
      return NextResponse.json(
        { error: instantErr?.message || 'Failed to create payout. Please try again.' },
        { status: 502 }
      )
    }
  }

  // 6. Return success
  return NextResponse.json({ success: true, amount: payout.amount })
}
