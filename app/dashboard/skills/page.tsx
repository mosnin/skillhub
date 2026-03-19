import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, skills } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Eye, EyeOff, Upload, Edit, Package } from 'lucide-react'
import { formatPrice } from '@/lib/stripe'
import { formatNumber, timeAgo } from '@/lib/utils'

export default async function MySkillsPage() {
  const { userId } = auth()
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId!),
  })

  const mySkills = user
    ? await db
        .select()
        .from(skills)
        .where(eq(skills.authorId, user.id))
        .orderBy(desc(skills.createdAt))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Skills</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mySkills.length} skill{mySkills.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/upload">
          <Button className="gap-2">
            <Upload className="h-4 w-4" />
            Publish New
          </Button>
        </Link>
      </div>

      {mySkills.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No skills yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Publish your first AI agent skill to the marketplace
            </p>
            <Link href="/dashboard/upload">
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Publish Your First Skill
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {mySkills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{skill.name}</span>
                  <Badge
                    variant={skill.isPublished ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {skill.isPublished ? (
                      <><Eye className="mr-1 h-2.5 w-2.5" />Published</>
                    ) : (
                      <><EyeOff className="mr-1 h-2.5 w-2.5" />Draft</>
                    )}
                  </Badge>
                  {skill.isFeatured && (
                    <Badge className="text-xs">Featured</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {skill.description}
                </p>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Download className="h-3 w-3" />
                    {formatNumber(skill.downloads)} downloads
                  </span>
                  <span>{formatPrice(skill.priceCents)}</span>
                  <span>v{skill.version}</span>
                  <span>{timeAgo(skill.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/skills/${skill.slug}`}>
                  <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                    <Eye className="h-3 w-3" />
                    View
                  </Button>
                </Link>
                <Link href={`/dashboard/skills/${skill.slug}/edit`}>
                  <Button variant="outline" size="sm" className="text-xs gap-1.5">
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
