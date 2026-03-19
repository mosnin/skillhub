import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, purchases, skills } from '@/lib/db/schema'
import { eq, desc, sum, count, and, gte } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
  Wallet,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { formatPrice, stripe } from '@/lib/stripe'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { ConnectStripeButton } from './connect-stripe'
import { PayoutButton } from './payout-button'

async function getEarningsData(clerkId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })
  if (!user) return null

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [allTime, thisMonth, recentSales] = await Promise.all([
    db
      .select({
        total: sum(purchases.creatorEarningsCents),
        count: count(),
      })
      .from(purchases)
      .leftJoin(skills, eq(purchases.skillId, skills.id))
      .where(and(eq(skills.authorId, user.id), eq(purchases.status, 'completed'))),
    db
      .select({
        total: sum(purchases.creatorEarningsCents),
        count: count(),
      })
      .from(purchases)
      .leftJoin(skills, eq(purchases.skillId, skills.id))
      .where(
        and(
          eq(skills.authorId, user.id),
          eq(purchases.status, 'completed'),
          gte(purchases.createdAt, thisMonthStart)
        )
      ),
    db
      .select({
        purchase: purchases,
        skill: skills,
      })
      .from(purchases)
      .leftJoin(skills, eq(purchases.skillId, skills.id))
      .where(and(eq(skills.authorId, user.id), eq(purchases.status, 'completed')))
      .orderBy(desc(purchases.createdAt))
      .limit(20),
  ])

  return {
    user,
    allTimeEarnings: Number(allTime[0]?.total || 0),
    allTimeSales: Number(allTime[0]?.count || 0),
    thisMonthEarnings: Number(thisMonth[0]?.total || 0),
    thisMonthSales: Number(thisMonth[0]?.count || 0),
    recentSales,
  }
}

async function getStripeBalanceData(stripeAccountId: string) {
  try {
    const [balance, payouts] = await Promise.all([
      stripe.balance.retrieve({ stripeAccount: stripeAccountId }),
      stripe.payouts.list({ limit: 5 }, { stripeAccount: stripeAccountId }),
    ])

    const availableUsd = balance.available.find((b) => b.currency === 'usd')
    const pendingUsd = balance.pending.find((b) => b.currency === 'usd')

    return {
      availableCents: availableUsd?.amount ?? 0,
      pendingCents: pendingUsd?.amount ?? 0,
      recentPayouts: payouts.data,
    }
  } catch {
    return null
  }
}

function payoutStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return (
        <Badge className="text-xs gap-1 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">
          <CheckCircle2 className="h-3 w-3" />
          Paid
        </Badge>
      )
    case 'pending':
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      )
    case 'in_transit':
      return (
        <Badge variant="secondary" className="text-xs gap-1">
          <ArrowUpRight className="h-3 w-3" />
          In Transit
        </Badge>
      )
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>
  }
}

export default async function EarningsPage() {
  const { userId } = auth()
  const data = await getEarningsData(userId!)

  if (!data) return null

  const { user, allTimeEarnings, allTimeSales, thisMonthEarnings, thisMonthSales, recentSales } =
    data

  // Only fetch Stripe balance data if the account is connected and enabled
  const stripeData =
    user.stripeAccountEnabled && user.stripeAccountId
      ? await getStripeBalanceData(user.stripeAccountId)
      : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your revenue and manage payouts
        </p>
      </div>

      {/* Stripe Connect Banner — shown only when NOT connected */}
      {!user.stripeAccountEnabled && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-400">
              Connect Stripe to receive payouts
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect your Stripe account to receive 80% of every sale directly to your bank.
            </p>
          </div>
          <ConnectStripeButton />
        </div>
      )}

      {/* Stripe Balance & Payouts — shown only when connected */}
      {user.stripeAccountEnabled && stripeData && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Stripe Balance &amp; Payouts
              </CardTitle>
              <PayoutButton />
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Balance summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {formatPrice(stripeData.availableCents)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Ready to pay out</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground mb-1">Pending Balance</p>
                <p className="text-2xl font-bold">
                  {formatPrice(stripeData.pendingCents)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Processing (2–7 days)</p>
              </div>
            </div>

            {/* Recent payouts */}
            {stripeData.recentPayouts.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">Recent Payouts</p>
                <div className="space-y-2">
                  {stripeData.recentPayouts.map((payout) => (
                    <div
                      key={payout.id}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
                    >
                      <div className="flex items-center gap-3">
                        {payoutStatusBadge(payout.status)}
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(payout.created * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-medium">
                        {formatPrice(payout.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stripeData.recentPayouts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No payouts yet. Request one when your available balance is greater than $0.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'This Month',
            value: formatPrice(thisMonthEarnings),
            sub: `${thisMonthSales} sales`,
            icon: TrendingUp,
            color: 'text-emerald-400',
          },
          {
            label: 'All Time',
            value: formatPrice(allTimeEarnings),
            sub: `${allTimeSales} total sales`,
            icon: DollarSign,
            color: 'text-primary',
          },
          {
            label: 'Revenue Share',
            value: '80%',
            sub: 'you keep',
            icon: ArrowUpRight,
            color: 'text-blue-400',
          },
          {
            label: 'Platform Fee',
            value: '20%',
            sub: 'per transaction',
            icon: DollarSign,
            color: 'text-muted-foreground',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold mt-1">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
                <Icon className={`h-5 w-5 ${color} mt-1`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {recentSales.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No sales yet</p>
              <p className="text-xs text-muted-foreground">
                Publish skills and start earning
              </p>
              <Link href="/dashboard/upload" className="mt-3 inline-block">
                <Button size="sm" variant="outline">
                  Publish a Skill
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map(({ purchase, skill: purchasedSkill }) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {purchasedSkill?.name || 'Unknown skill'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {timeAgo(purchase.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">
                      +{formatPrice(purchase.creatorEarningsCents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Sale: {formatPrice(purchase.amountCents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
