import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, purchases, skills } from '@/lib/db/schema'
import { eq, desc, sum, count, and, gte, sql } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, ArrowUpRight, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/stripe'
import { timeAgo } from '@/lib/utils'
import Link from 'next/link'
import { ConnectStripeButton } from './connect-stripe'

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

export default async function EarningsPage() {
  const { userId } = auth()
  const data = await getEarningsData(userId!)

  if (!data) return null

  const { user, allTimeEarnings, allTimeSales, thisMonthEarnings, thisMonthSales, recentSales } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Track your revenue and manage payouts
        </p>
      </div>

      {/* Stripe Connect Banner */}
      {!user.stripeAccountEnabled && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-400">Connect Stripe to receive payouts</p>
            <p className="text-xs text-muted-foreground mt-1">
              Connect your Stripe account to receive 80% of every sale directly to your bank.
            </p>
          </div>
          <ConnectStripeButton />
        </div>
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
              {recentSales.map(({ purchase, skill }) => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{skill?.name || 'Unknown skill'}</p>
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
