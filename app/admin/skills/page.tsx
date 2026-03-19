import { db } from '@/lib/db'
import { skills, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { AdminSkillActions } from './actions'

export default async function AdminSkillsPage() {
  const allSkills = await db
    .select({
      id: skills.id,
      name: skills.name,
      slug: skills.slug,
      category: skills.category,
      priceCents: skills.priceCents,
      isPublished: skills.isPublished,
      isFeatured: skills.isFeatured,
      isSuspended: skills.isSuspended,
      scanStatus: skills.scanStatus,
      adminNote: skills.adminNote,
      createdAt: skills.createdAt,
      authorUsername: users.username,
    })
    .from(skills)
    .leftJoin(users, eq(skills.authorId, users.id))
    .orderBy(desc(skills.createdAt))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Skills Moderation</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {allSkills.length} total skill{allSkills.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Skill</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Author</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {allSkills.map((skill) => (
                <tr key={skill.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <Link
                        href={`/skills/${skill.slug}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {skill.name}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5">{skill.slug}</p>
                      {skill.adminNote && (
                        <p className="text-xs text-muted-foreground mt-1 italic">
                          Note: {skill.adminNote}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {skill.authorUsername ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {skill.category}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {skill.priceCents === 0
                      ? 'Free'
                      : `$${(skill.priceCents / 100).toFixed(2)}`}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant={skill.isPublished ? 'default' : 'secondary'}>
                        {skill.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                      {skill.isSuspended && (
                        <Badge variant="destructive">Suspended</Badge>
                      )}
                      {skill.isFeatured && (
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                          Featured
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={
                          skill.scanStatus === 'clean'
                            ? 'text-green-400 border-green-500/30'
                            : skill.scanStatus === 'flagged'
                            ? 'text-red-400 border-red-500/30'
                            : 'text-yellow-400 border-yellow-500/30'
                        }
                      >
                        {skill.scanStatus}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <AdminSkillActions
                      skillId={skill.id}
                      skillSlug={skill.slug}
                      isSuspended={skill.isSuspended}
                      isFeatured={skill.isFeatured}
                      isPublished={skill.isPublished}
                      adminNote={skill.adminNote}
                    />
                  </td>
                </tr>
              ))}
              {allSkills.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No skills found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
