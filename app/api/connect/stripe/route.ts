import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Create or get existing Stripe Connect account
  let accountId = user.stripeAccountId

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    })
    accountId = account.id

    await db
      .update(users)
      .set({ stripeAccountId: accountId })
      .where(eq(users.id, user.id))
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/dashboard/earnings?error=stripe_refresh`,
    return_url: `${appUrl}/dashboard/earnings?success=stripe_connected`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}

export async function GET(req: NextRequest) {
  const { userId } = auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) })
  if (!user?.stripeAccountId) {
    return NextResponse.json({ connected: false })
  }

  const account = await stripe.accounts.retrieve(user.stripeAccountId)
  return NextResponse.json({
    connected: account.details_submitted && account.charges_enabled,
    accountId: user.stripeAccountId,
  })
}
