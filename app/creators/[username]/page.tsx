import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { skills, users, reviews } from '@/lib/db/schema'
import { eq, and, desc, count, sum, avg } from 'drizzle-orm'
import { SkillCard } from '@/components/skill-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Package, Download, Star, Calendar } from 'lucide-react'
import { formatNumber, timeAgo } from '@/lib/utils'
import type { Metadata } from 'next'

interface Props {
  params: { username: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await db.query.users.findFirst({
    where: eq(users.username, params.username),
  })

  if (!user) {
    return {
      title: 'Creator Not Found — SkillHub',
    }
  }

  return {
    title: `${user.username} — SkillHub Creator`,
    description: user.bio || `Browse skills by ${user.username} on SkillHub.`,
  }
}

export default async function CreatorProfilePage({ params }: Props) {
  const user = await db.query.users.findFirst({
    where: eq(users.username, params.username),
  })

  if (!user) {
    notFound()
  }

  // Fetch published, non-suspended skills for this creator ordered by downloads
  const publishedSkills = await db
    .select()
    .from(skills)
    .where(
      and(
        eq(skills.authorId, user.id),
        eq(skills.isPublished, true),
        eq(skills.isSuspended, false),
      ),
    )
    .orderBy(desc(skills.downloads))

  // Compute aggregate stats across all the creator's skills
  const [stats] = await db
    .select({
      totalDownloads: sum(skills.downloads),
      skillCount: count(skills.id),
    })
    .from(skills)
    .where(
      and(
        eq(skills.authorId, user.id),
        eq(skills.isPublished, true),
        eq(skills.isSuspended, false),
      ),
    )

  // Compute average rating across all reviews for this creator's skills
  const [ratingStats] = await db
    .select({
      avgRating: avg(reviews.rating),
      reviewCount: count(reviews.id),
    })
    .from(reviews)
    .innerJoin(skills, eq(reviews.skillId, skills.id))
    .where(
      and(
        eq(skills.authorId, user.id),
        eq(skills.isPublished, true),
        eq(skills.isSuspended, false),
      ),
    )

  const totalDownloads = Number(stats?.totalDownloads ?? 0)
  const skillCount = Number(stats?.skillCount ?? 0)
  const avgRating = ratingStats?.avgRating ? Number(ratingStats.avgRating) : null
  const reviewCount = Number(ratingStats?.reviewCount ?? 0)

  const initials = user.username.slice(0, 2).toUpperCase()

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row gap-6 items-start mb-10">
        <Avatar className="h-20 w-20 shrink-0">
          <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
          <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{user.username}</h1>
            <Badge variant="secondary" className="text-xs">Creator</Badge>
          </div>

          {user.bio && (
            <p className="text-muted-foreground text-sm leading-relaxed mb-4 max-w-xl">
              {user.bio}
            </p>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              <span>
                <span className="font-medium text-foreground">{skillCount}</span>{' '}
                {skillCount === 1 ? 'skill' : 'skills'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Download className="h-4 w-4" />
              <span>
                <span className="font-medium text-foreground">{formatNumber(totalDownloads)}</span>{' '}
                downloads
              </span>
            </div>

            {avgRating !== null && reviewCount > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span>
                  <span className="font-medium text-foreground">{avgRating.toFixed(1)}</span>
                  <span className="text-muted-foreground/60 ml-1">({formatNumber(reviewCount)})</span>
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Joined {timeAgo(user.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-5">
          Published Skills
          {skillCount > 0 && (
            <span className="text-muted-foreground font-normal text-sm ml-2">
              ({skillCount})
            </span>
          )}
        </h2>

        {publishedSkills.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Package className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground">No published skills yet.</p>
              <p className="text-sm text-muted-foreground/60">
                Check back later — skills published by{' '}
                <span className="font-medium">{user.username}</span> will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publishedSkills.map((skill) => (
              <SkillCard
                key={skill.id}
                id={skill.id}
                slug={skill.slug}
                name={skill.name}
                description={skill.description}
                category={skill.category}
                tags={skill.tags ?? []}
                priceCents={skill.priceCents}
                downloads={skill.downloads}
                version={skill.version}
                author={{
                  username: user.username,
                  avatarUrl: user.avatarUrl,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Back to marketplace */}
      <div className="mt-10 pt-6 border-t border-border">
        <Link
          href="/marketplace"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to Marketplace
        </Link>
      </div>
    </div>
  )
}
