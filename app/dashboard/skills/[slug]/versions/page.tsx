import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { skills, skillVersions, users } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { timeAgo } from '@/lib/utils'
import { GitBranch, Clock } from 'lucide-react'
import { PublishVersionForm } from './publish-version-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Version History',
}

async function getSkillWithVersions(slug: string, clerkId: string) {
  // Get the current user
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })
  if (!user) return null

  // Get the skill and verify ownership
  const skill = await db.query.skills.findFirst({
    where: and(eq(skills.slug, slug), eq(skills.authorId, user.id)),
  })
  if (!skill) return null

  // Get all versions ordered by newest first
  const versions = await db
    .select()
    .from(skillVersions)
    .where(eq(skillVersions.skillId, skill.id))
    .orderBy(desc(skillVersions.createdAt))

  return { skill, versions }
}

export default async function VersionsPage({
  params,
}: {
  params: { slug: string }
}) {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const data = await getSkillWithVersions(params.slug, userId)
  if (!data) notFound()

  const { skill, versions } = data

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{skill.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Version history and publishing</p>
        </div>
        <Badge variant="secondary" className="shrink-0 gap-1.5 text-sm">
          <GitBranch className="h-3.5 w-3.5" />
          Current: v{skill.version}
        </Badge>
      </div>

      {/* Version history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Version History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {versions.length === 0 ? (
            <div className="text-center py-8">
              <GitBranch className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No version history yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Publish a new version below to start tracking changes.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((v, index) => (
                <div
                  key={v.id}
                  className="flex items-start gap-4 rounded-lg border border-border p-4"
                >
                  <div className="flex flex-col items-center gap-1 pt-0.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        index === 0 ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                    {index < versions.length - 1 && (
                      <div className="w-px flex-1 bg-border min-h-[20px]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-semibold text-foreground">
                        v{v.version}
                      </span>
                      {index === 0 && (
                        <Badge className="text-xs h-5 px-1.5">Current</Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {timeAgo(v.createdAt)}
                      </span>
                    </div>
                    {v.changelog ? (
                      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                        {v.changelog}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50 mt-1 italic">
                        No changelog provided
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publish new version form (client component) */}
      <PublishVersionForm
        slug={params.slug}
        currentVersion={skill.version}
        currentContent={skill.content}
      />
    </div>
  )
}
