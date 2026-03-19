import { db } from '@/lib/db'
import { users, skills, purchases } from '@/lib/db/schema'
import { count, sum, eq, and, gte } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Package,
  DollarSign,
  ShoppingCart,
  Shield,
  TrendingUp,
} from 'lucide-react'

async function getStats() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    totalUsersResult,
    totalSkillsResult,
    publishedSkillsResult,
    draftSkillsResult,
    suspendedSkillsResult,
    revenueResult,
    totalSalesResult,
    scanCleanResult,
    scanPendingResult,
    scanFlaggedResult,
    newUsersResult,
    newSkillsResult,
  ] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(skills),
    db.select({ value: count() }).from(skills).where(
      and(eq(skills.isPublished, true), eq(skills.isSuspended, false))
    ),
    db.select({ value: count() }).from(skills).where(
      and(eq(skills.isPublished, false), eq(skills.isSuspended, false))
    ),
    db.select({ value: count() }).from(skills).where(eq(skills.isSuspended, true)),
    db
      .select({
        totalRevenue: sum(purchases.amountCents),
        totalPlatformFee: sum(purchases.platformFeeCents),
      })
      .from(purchases)
      .where(eq(purchases.status, 'completed')),
    db.select({ value: count() }).from(purchases).where(eq(purchases.status, 'completed')),
    db.select({ value: count() }).from(skills).where(eq(skills.scanStatus, 'clean')),
    db.select({ value: count() }).from(skills).where(eq(skills.scanStatus, 'pending')),
    db.select({ value: count() }).from(skills).where(eq(skills.scanStatus, 'flagged')),
    db.select({ value: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
    db.select({ value: count() }).from(skills).where(gte(skills.createdAt, thirtyDaysAgo)),
  ])

  return {
    totalUsers: Number(totalUsersResult[0]?.value ?? 0),
    totalSkills: Number(totalSkillsResult[0]?.value ?? 0),
    publishedSkills: Number(publishedSkillsResult[0]?.value ?? 0),
    draftSkills: Number(draftSkillsResult[0]?.value ?? 0),
    suspendedSkills: Number(suspendedSkillsResult[0]?.value ?? 0),
    totalRevenueCents: Number(revenueResult[0]?.totalRevenue ?? 0),
    totalPlatformFeeCents: Number(revenueResult[0]?.totalPlatformFee ?? 0),
    totalSales: Number(totalSalesResult[0]?.value ?? 0),
    scanClean: Number(scanCleanResult[0]?.value ?? 0),
    scanPending: Number(scanPendingResult[0]?.value ?? 0),
    scanFlagged: Number(scanFlaggedResult[0]?.value ?? 0),
    newUsersLast30Days: Number(newUsersResult[0]?.value ?? 0),
    newSkillsLast30Days: Number(newSkillsResult[0]?.value ?? 0),
  }
}

export default async function AdminStatsPage() {
  const stats = await getStats()

  const mainCards = [
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      sub: `+${stats.newUsersLast30Days} last 30 days`,
      icon: Users,
      color: 'text-blue-400',
    },
    {
      label: 'Total Skills',
      value: stats.totalSkills.toLocaleString(),
      sub: `+${stats.newSkillsLast30Days} last 30 days`,
      icon: Package,
      color: 'text-primary',
    },
    {
      label: 'Total Revenue',
      value: `$${(stats.totalRevenueCents / 100).toFixed(2)}`,
      sub: `Platform fee: $${(stats.totalPlatformFeeCents / 100).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-emerald-400',
    },
    {
      label: 'Total Sales',
      value: stats.totalSales.toLocaleString(),
      sub: 'completed purchases',
      icon: ShoppingCart,
      color: 'text-amber-400',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Stats</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Overview of all platform activity
        </p>
      </div>

      {/* Main stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map(({ label, value, sub, icon: Icon, color }) => (
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

      {/* Skills breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Skills by Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Published</span>
              <Badge variant="default">{stats.publishedSkills}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Draft</span>
              <Badge variant="secondary">{stats.draftSkills}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Suspended</span>
              <Badge variant="destructive">{stats.suspendedSkills}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Skills by Scan Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clean</span>
              <Badge
                variant="outline"
                className="text-green-400 border-green-500/30"
              >
                {stats.scanClean}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <Badge
                variant="outline"
                className="text-yellow-400 border-yellow-500/30"
              >
                {stats.scanPending}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Flagged</span>
              <Badge
                variant="outline"
                className="text-red-400 border-red-500/30"
              >
                {stats.scanFlagged}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Growth last 30 days */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Growth (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">New Users</p>
              <p className="text-2xl font-bold text-blue-400">
                {stats.newUsersLast30Days}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">New Skills</p>
              <p className="text-2xl font-bold text-primary">
                {stats.newSkillsLast30Days}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
