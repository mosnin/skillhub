import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { users, collections, collectionSkills, skills } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { EditCollectionForm } from './edit-form'

interface EditCollectionPageProps {
  params: { slug: string }
}

export default async function EditCollectionPage({ params }: EditCollectionPageProps) {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  })
  if (!user) redirect('/sign-in')

  const collection = await db.query.collections.findFirst({
    where: and(eq(collections.slug, params.slug), eq(collections.authorId, user.id)),
  })
  if (!collection) notFound()

  // Skills currently in the collection (ordered by position)
  const collectionSkillRows = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      category: skills.category,
      position: collectionSkills.position,
    })
    .from(collectionSkills)
    .innerJoin(skills, eq(collectionSkills.skillId, skills.id))
    .where(eq(collectionSkills.collectionId, collection.id))
    .orderBy(asc(collectionSkills.position))

  const collectionSkillIds = new Set(collectionSkillRows.map((s) => s.id))

  // Creator's published skills not yet in the collection
  const availableSkills = await db
    .select({
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
      description: skills.description,
      category: skills.category,
    })
    .from(skills)
    .where(and(eq(skills.authorId, user.id), eq(skills.isPublished, true)))

  const addableSkills = availableSkills.filter((s) => !collectionSkillIds.has(s.id))

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Collection</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage &quot;{collection.name}&quot;
        </p>
      </div>
      <EditCollectionForm
        collection={collection}
        collectionSkills={collectionSkillRows}
        addableSkills={addableSkills}
      />
    </div>
  )
}
