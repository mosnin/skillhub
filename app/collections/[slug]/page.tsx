import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { collections, users, collectionSkills, skills } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { SkillCard } from '@/components/skill-card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { FolderOpen } from 'lucide-react'

interface CollectionPageProps {
  params: { slug: string }
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.slug, params.slug), eq(collections.isPublished, true)),
  })

  if (!collection) notFound()

  const author = await db.query.users.findFirst({
    where: eq(users.id, collection.authorId),
  })

  const collectionSkillRows = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      category: skills.category,
      tags: skills.tags,
      priceCents: skills.priceCents,
      downloads: skills.downloads,
      version: skills.version,
      authorUsername: users.username,
      authorAvatarUrl: users.avatarUrl,
      position: collectionSkills.position,
    })
    .from(collectionSkills)
    .innerJoin(skills, eq(collectionSkills.skillId, skills.id))
    .leftJoin(users, eq(skills.authorId, users.id))
    .where(eq(collectionSkills.collectionId, collection.id))
    .orderBy(asc(collectionSkills.position))

  return (
    <div className="container max-w-5xl py-10 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <FolderOpen className="h-4 w-4" />
          <span>Collection</span>
        </div>
        <h1 className="text-3xl font-bold">{collection.name}</h1>
        {collection.description && (
          <p className="text-muted-foreground text-lg">{collection.description}</p>
        )}
        <div className="flex items-center gap-3">
          {author && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={author.avatarUrl || undefined} />
                <AvatarFallback className="text-[10px]">
                  {author.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">{author.username}</span>
            </div>
          )}
          <Badge variant="secondary" className="text-xs">
            {collectionSkillRows.length} skill{collectionSkillRows.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Skills Grid */}
      {collectionSkillRows.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>This collection has no skills yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collectionSkillRows.map((skill) => (
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
                username: skill.authorUsername ?? 'unknown',
                avatarUrl: skill.authorAvatarUrl,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
