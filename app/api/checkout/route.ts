import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, users, purchases } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { stripe, calculateFees } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const { skillId } = await req.json()

  const skill = await db.query.skills.findFirst({
    where: and(eq(skills.id, skillId), eq(skills.isPublished, true)),
  })
  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  if (skill.priceCents === 0) {
    return NextResponse.json({ error: 'This skill is free' }, { status: 400 })
  }

  // Check already purchased
  const existing = await db.query.purchases.findFirst({
    where: and(
      eq(purchases.userId, user.id),
      eq(purchases.skillId, skill.id),
      eq(purchases.status, 'completed')
    ),
  })
  if (existing) {
    return NextResponse.json({ error: 'Already purchased' }, { status: 400 })
  }

  // Get author for Stripe Connect
  const author = await db.query.users.findFirst({
    where: eq(users.id, skill.authorId),
  })

  const { platformFeeCents, creatorEarningsCents } = calculateFees(skill.priceCents)

  // Create pending purchase record
  const [purchase] = await db
    .insert(purchases)
    .values({
      userId: user.id,
      skillId: skill.id,
      amountCents: skill.priceCents,
      platformFeeCents,
      creatorEarningsCents,
      status: 'pending',
    })
    .returning()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Create Stripe Checkout session
  const sessionParams: any = {
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: skill.name,
            description: skill.description,
          },
          unit_amount: skill.priceCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${appUrl}/skills/${skill.slug}?success=true`,
    cancel_url: `${appUrl}/skills/${skill.slug}`,
    metadata: {
      purchaseId: purchase.id,
      skillId: skill.id,
      userId: user.id,
    },
    payment_intent_data: {
      metadata: {
        purchaseId: purchase.id,
      },
    },
  }

  // Use Stripe Connect if author has connected account
  if (author?.stripeAccountId && author.stripeAccountEnabled) {
    sessionParams.payment_intent_data.application_fee_amount = platformFeeCents
    sessionParams.payment_intent_data.transfer_data = {
      destination: author.stripeAccountId,
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return NextResponse.json({ url: session.url })
}
