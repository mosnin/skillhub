import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { skills, users, reviews, purchases } from '@/lib/db/schema'
import { eq, avg, count, and, sql } from 'drizzle-orm'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { InstallCommand } from '@/components/install-command'
import { StarRating } from '@/components/star-rating'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Download, Calendar, Tag, Shield, ChevronRight } from 'lucide-react'
import { CATEGORY_LABELS, CATEGORY_ICONS, formatNumber, timeAgo, type SkillCategory } from '@/lib/utils'
import { formatPrice } from '@/lib/stripe'
import { PurchaseButton } from './purchase-button'
import { ReviewForm } from './review-form'

interface SkillPageProps {
  params: { slug: string }
}

async function getSkill(slug: string) {
  const result = await db
    .select({
      skill: skills,
      author: users,
    })
    .from(skills)
    .leftJoin(users, eq(skills.authorId, users.id))
    .where(and(eq(skills.slug, slug), eq(skills.isPublished, true)))
    .limit(1)

  return result[0] || null
}

async function getReviews(skillId: string) {
  return db
    .select({
      review: reviews,
      author: users,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.skillId, skillId))
    .orderBy(sql`${reviews.createdAt} desc`)
    .limit(20)
}

async function getRatingStats(skillId: string) {
  const result = await db
    .select({
      avg: avg(reviews.rating),
      count: count(),
    })
    .from(reviews)
    .where(eq(reviews.skillId, skillId))

  return {
    average: parseFloat(result[0]?.avg || '0'),
    count: Number(result[0]?.count || 0),
  }
}

async function getUserPurchase(userId: string | null, skillId: string) {
  if (!userId) return null
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!dbUser) return null
  return db.query.purchases.findFirst({
    where: and(
      eq(purchases.userId, dbUser.id),
      eq(purchases.skillId, skillId),
      eq(purchases.status, 'completed')
    ),
  })
}

export default async function SkillPage({ params }: SkillPageProps) {
  const { userId } = auth()
  const data = await getSkill(params.slug)

  if (!data) notFound()

  const { skill, author } = data
  const [reviewList, ratingStats, userPurchase] = await Promise.all([
    getReviews(skill.id),
    getRatingStats(skill.id),
    getUserPurchase(userId, skill.id),
  ])

  const isFree = skill.priceCents === 0
  const hasPurchased = isFree || !!userPurchase
  const isOwner = author && userId
    ? (await db.query.users.findFirst({ where: eq(users.clerkId, userId) }))?.id === skill.authorId
    : false

  const categoryLabel = CATEGORY_LABELS[skill.category as SkillCategory] || skill.category
  const categoryIcon = CATEGORY_ICONS[skill.category as SkillCategory] || '📦'

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/marketplace" className="hover:text-foreground transition-colors">
          Marketplace
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link
          href={`/marketplace?category=${skill.category}`}
          className="hover:text-foreground transition-colors"
        >
          {categoryLabel}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground">{skill.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{categoryIcon}</span>
              <Badge variant="secondary">{categoryLabel}</Badge>
              {skill.isFeatured && (
                <Badge variant="success">Featured</Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold mb-3">{skill.name}</h1>
            <p className="text-muted-foreground text-lg leading-relaxed">{skill.description}</p>

            {skill.tags && skill.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {skill.tags.map((tag) => (
                  <Link key={tag} href={`/marketplace?q=${tag}`}>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted hover:bg-accent rounded-full px-2.5 py-1 transition-colors">
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Install Command */}
          {hasPurchased && (
            <InstallCommand slug={skill.slug} />
          )}

          {/* README */}
          {skill.readme ? (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Documentation</h2>
              <MarkdownRenderer content={skill.readme} />
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-6">
              <h2 className="text-lg font-semibold mb-4">Skill Content</h2>
              <pre className="text-sm text-muted-foreground bg-muted rounded-md p-4 overflow-auto">
                {hasPurchased ? skill.content : skill.content.split('\n').slice(0, 10).join('\n') + '\n\n[Purchase to view full content]'}
              </pre>
            </div>
          )}

          <Separator />

          {/* Reviews */}
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Reviews
              {ratingStats.count > 0 && (
                <span className="ml-2 text-base font-normal text-muted-foreground">
                  ({ratingStats.count})
                </span>
              )}
            </h2>

            {userId && hasPurchased && !isOwner && (
              <ReviewForm skillId={skill.id} />
            )}

            {reviewList.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">
                No reviews yet. Be the first to review!
              </p>
            ) : (
              <div className="space-y-4">
                {reviewList.map(({ review, author: reviewer }) => (
                  <div
                    key={review.id}
                    className="rounded-lg border border-border bg-card p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={reviewer?.avatarUrl || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {reviewer?.username?.slice(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{reviewer?.username || 'Anonymous'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating value={review.rating} readonly size="sm" />
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(review.createdAt)}
                        </span>
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Purchase Card */}
          <div className="rounded-lg border border-border bg-card p-5 sticky top-24">
            <div className="text-3xl font-bold mb-1">
              {formatPrice(skill.priceCents)}
            </div>
            {skill.priceCents > 0 && (
              <p className="text-xs text-muted-foreground mb-4">One-time purchase</p>
            )}

            {ratingStats.count > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <StarRating value={Math.round(ratingStats.average)} readonly size="sm" />
                <span className="text-sm text-muted-foreground">
                  {ratingStats.average.toFixed(1)} ({ratingStats.count} reviews)
                </span>
              </div>
            )}

            <PurchaseButton
              skillId={skill.id}
              slug={skill.slug}
              priceCents={skill.priceCents}
              hasPurchased={hasPurchased}
              isOwner={!!isOwner}
            />

            {skill.priceCents > 0 && (
              <p className="text-xs text-muted-foreground text-center mt-3 flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" /> Secure checkout via Stripe
              </p>
            )}
          </div>

          {/* Skill Info */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Skill Info</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span>v{skill.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Downloads</span>
                <span className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {formatNumber(skill.downloads)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Published</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {timeAgo(skill.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Author Card */}
          {author && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-sm font-semibold mb-3">Creator</h3>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={author.avatarUrl || undefined} />
                  <AvatarFallback>
                    {author.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm">{author.username}</div>
                  {author.bio && (
                    <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {author.bio}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
