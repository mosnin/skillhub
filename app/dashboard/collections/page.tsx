import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, collections, collectionSkills } from '@/lib/db/schema'
import { eq, sql, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderOpen, Plus, Eye, EyeOff, Edit } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export default async function CollectionsPage() {
  const { userId } = auth()
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId!),
  })

  const myCollections = user
    ? await db
        .select({
          id: collections.id,
          slug: collections.slug,
          name: collections.name,
          description: collections.description,
          isPublished: collections.isPublished,
          createdAt: collections.createdAt,
          skillCount: sql<number>`cast(count(${collectionSkills.id}) as int)`,
        })
        .from(collections)
        .leftJoin(collectionSkills, eq(collectionSkills.collectionId, collections.id))
        .where(eq(collections.authorId, user.id))
        .groupBy(collections.id)
        .orderBy(desc(collections.createdAt))
    : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Collections</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {myCollections.length} collection{myCollections.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard/collections/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Collection
          </Button>
        </Link>
      </div>

      {myCollections.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No collections yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Bundle your skills into curated collections for others to discover
            </p>
            <Link href="/dashboard/collections/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Collection
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {myCollections.map((collection) => (
            <div
              key={collection.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{collection.name}</span>
                  <Badge
                    variant={collection.isPublished ? 'success' : 'secondary'}
                    className="text-xs"
                  >
                    {collection.isPublished ? (
                      <><Eye className="mr-1 h-2.5 w-2.5" />Published</>
                    ) : (
                      <><EyeOff className="mr-1 h-2.5 w-2.5" />Draft</>
                    )}
                  </Badge>
                </div>
                {collection.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {collection.description}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <FolderOpen className="h-3 w-3" />
                    {collection.skillCount} skill{collection.skillCount !== 1 ? 's' : ''}
                  </span>
                  <span>{timeAgo(collection.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/collections/${collection.slug}/edit`}>
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
