import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, users, purchases } from '@/lib/db/schema'
import { eq, sum, count, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Download,
  DollarSign,
  TrendingUp,
  Upload,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react'
import { formatPrice } from '@/lib/stripe'
import { formatNumber, timeAgo } from '@/lib/utils'

async function getDashboardData(clerkId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })

  if (!user) return null

  const [mySkills, earningsResult] = await Promise.all([
    db
      .select()
      .from(skills)
      .where(eq(skills.authorId, user.id))
      .orderBy(sql`${skills.createdAt} desc`)
      .limit(5),
    db
      .select({
        total: sum(purchases.creatorEarningsCents),
        count: count(),
      })
      .from(purchases)
      .leftJoin(skills, eq(purchases.skillId, skills.id))
      .where(eq(skills.authorId, user.id)),
  ])

  const totalDownloads = mySkills.reduce((sum, s) => sum + s.downloads, 0)
  const publishedCount = mySkills.filter((s) => s.isPublished).length

  return {
    user,
    mySkills,
    totalDownloads,
    publishedCount,
    totalEarnings: Number(earningsResult[0]?.total || 0),
    totalSales: Number(earningsResult[0]?.count || 0),
  }
}

export default async function DashboardPage() {
  const { userId } = auth()
  const data = await getDashboardData(userId!)

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Setting up your account...</p>
      </div>
    )
  }

  const { mySkills, totalDownloads, publishedCount, totalEarnings, totalSales } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {data.user.username}
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Publish Skill
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Skills',
            value: mySkills.length,
            sub: `${publishedCount} published`,
            icon: Package,
            color: 'text-primary',
          },
          {
            label: 'Total Downloads',
            value: formatNumber(totalDownloads),
            sub: 'all time',
            icon: Download,
            color: 'text-blue-400',
          },
          {
            label: 'Total Earnings',
            value: formatPrice(totalEarnings),
            sub: `${totalSales} sales`,
            icon: DollarSign,
            color: 'text-emerald-400',
          },
          {
            label: 'Revenue Share',
            value: '80%',
            sub: 'you keep',
            icon: TrendingUp,
            color: 'text-yellow-400',
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

      {/* My Skills */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">My Skills</CardTitle>
            <Link href="/dashboard/skills">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {mySkills.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                You haven&apos;t published any skills yet
              </p>
              <Link href="/dashboard/upload">
                <Button size="sm" className="gap-2">
                  <Upload className="h-3.5 w-3.5" />
                  Publish Your First Skill
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {mySkills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{skill.name}</span>
                      <Badge
                        variant={skill.isPublished ? 'success' : 'secondary'}
                        className="text-xs shrink-0"
                      >
                        {skill.isPublished ? (
                          <><Eye className="mr-1 h-2.5 w-2.5" />Published</>
                        ) : (
                          <><EyeOff className="mr-1 h-2.5 w-2.5" />Draft</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Download className="h-3 w-3" />
                        {formatNumber(skill.downloads)}
                      </span>
                      <span>{formatPrice(skill.priceCents)}</span>
                      <span>{timeAgo(skill.createdAt)}</span>
                    </div>
                  </div>
                  <Link href={`/dashboard/skills/${skill.slug}/edit`}>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Edit
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
