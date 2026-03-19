import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { purchases, users, skills } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'
import type Stripe from 'stripe'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { purchaseId } = session.metadata || {}

    if (!purchaseId) return NextResponse.json({ received: true })

    const purchase = await db.query.purchases.findFirst({
      where: eq(purchases.id, purchaseId),
    })

    if (!purchase) return NextResponse.json({ received: true })

    try {
      // Mark purchase as completed
      await db
        .update(purchases)
        .set({
          status: 'completed',
          stripePaymentIntentId: session.payment_intent as string,
        })
        .where(eq(purchases.id, purchaseId))

      // Update creator earnings
      const skill = await db.query.skills.findFirst({
        where: eq(skills.id, purchase.skillId),
      })

      if (skill) {
        await db
          .update(users)
          .set({
            totalEarningsCents: sql`${users.totalEarningsCents} + ${purchase.creatorEarningsCents}`,
          })
          .where(eq(users.id, skill.authorId))

        createNotification(
          skill.authorId,
          'new_sale',
          'New Sale',
          `Someone purchased ${skill.name}`,
          '/dashboard/earnings'
        ).catch(() => {})
      }
    } catch (err) {
      console.error('[stripe webhook] checkout.session.completed error:', err)
      // still return 200 so Stripe doesn't retry - the webhook was received
    }
  }

  if (event.type === 'account.updated') {
    const account = event.data.object as Stripe.Account
    try {
      if (account.details_submitted && account.charges_enabled) {
        await db
          .update(users)
          .set({ stripeAccountEnabled: true })
          .where(eq(users.stripeAccountId, account.id))
      }
    } catch (err) {
      console.error('[stripe webhook] account.updated error:', err)
      // still return 200 so Stripe doesn't retry - the webhook was received
    }
  }

  return NextResponse.json({ received: true })
}
