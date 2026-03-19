import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, skills, skillViews, purchases } from '@/lib/db/schema'
import { eq, and, count, gte, sql } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Eye, ShoppingBag, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface SkillAnalytics {
  id: string
  name: string
  slug: string
  totalViews: number
  views30d: number
  purchases: number
  conversionRate: number
}

async function getAnalyticsData(clerkId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })
  if (!user) return null

  const userSkills = await db
    .select({ id: skills.id, name: skills.name, slug: skills.slug })
    .from(skills)
    .where(eq(skills.authorId, user.id))

  if (userSkills.length === 0) {
    return { skillRows: [], totalViews: 0, totalPurchases: 0 }
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const skillRows: SkillAnalytics[] = await Promise.all(
    userSkills.map(async (skill) => {
      const [totalViewsResult, views30dResult, purchasesResult] = await Promise.all([
        db
          .select({ count: count() })
          .from(skillViews)
          .where(eq(skillViews.skillId, skill.id)),
        db
          .select({ count: count() })
          .from(skillViews)
          .where(and(eq(skillViews.skillId, skill.id), gte(skillViews.createdAt, thirtyDaysAgo))),
        db
          .select({ count: count() })
          .from(purchases)
          .where(and(eq(purchases.skillId, skill.id), eq(purchases.status, 'completed'))),
      ])

      const totalViews = Number(totalViewsResult[0]?.count ?? 0)
      const views30d = Number(views30dResult[0]?.count ?? 0)
      const totalPurchases = Number(purchasesResult[0]?.count ?? 0)
      const conversionRate = totalViews > 0 ? totalPurchases / totalViews : 0

      return {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        totalViews,
        views30d,
        purchases: totalPurchases,
        conversionRate,
      }
    })
  )

  const totalViews = skillRows.reduce((sum, r) => sum + r.totalViews, 0)
  const totalPurchases = skillRows.reduce((sum, r) => sum + r.purchases, 0)

  return { skillRows, totalViews, totalPurchases }
}

export default async function AnalyticsPage() {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const data = await getAnalyticsData(userId)
  if (!data) redirect('/sign-in')

  const { skillRows, totalViews, totalPurchases } = data
  const overallConversion = totalViews > 0 ? totalPurchases / totalViews : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Views, purchases, and conversion rates across your skills
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold mt-1">{totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">across all skills</p>
              </div>
              <Eye className="h-5 w-5 text-blue-400 mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold mt-1">{totalPurchases.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">completed purchases</p>
              </div>
              <ShoppingBag className="h-5 w-5 text-emerald-400 mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Overall Conversion</p>
                <p className="text-2xl font-bold mt-1">
                  {(overallConversion * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">views to purchases</p>
              </div>
              <TrendingUp className="h-5 w-5 text-primary mt-1" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Skills Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Per-Skill Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {skillRows.length === 0 ? (
            <div className="text-center py-10">
              <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-2">No skills yet</p>
              <p className="text-xs text-muted-foreground">
                Publish a skill to start seeing analytics here.
              </p>
              <Link
                href="/dashboard/upload"
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                Publish a skill
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="text-left py-2 pr-4 font-medium">Skill Name</th>
                    <th className="text-right py-2 px-4 font-medium">Total Views</th>
                    <th className="text-right py-2 px-4 font-medium">Views (30d)</th>
                    <th className="text-right py-2 px-4 font-medium">Purchases</th>
                    <th className="text-right py-2 pl-4 font-medium">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {skillRows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/skills/${row.slug}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums">
                        {row.totalViews.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-blue-400">
                        {row.views30d.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-emerald-400">
                        {row.purchases.toLocaleString()}
                      </td>
                      <td className="py-3 pl-4 text-right tabular-nums">
                        {(row.conversionRate * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
