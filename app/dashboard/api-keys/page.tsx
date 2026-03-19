import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { users, apiKeys } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Key } from 'lucide-react'
import { ApiKeysManager } from './manager'

async function getApiKeys(clerkId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkId, clerkId),
  })
  if (!user) return { user: null, keys: [] }

  const keys = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, user.id),
    orderBy: (keys, { desc }) => [desc(keys.createdAt)],
  })

  return { user, keys }
}

export default async function ApiKeysPage() {
  const { userId } = auth()
  const { user, keys } = await getApiKeys(userId!)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Use API keys to access paid skills via the CLI
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="h-4 w-4" /> Your API Keys
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ApiKeysManager keys={keys} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Set your API key as an environment variable:</p>
          <pre className="bg-muted rounded-md p-3 text-xs font-mono">
            export SKILLHUB_API_KEY=sh_your_key_here
          </pre>
          <p>Then install paid skills:</p>
          <pre className="bg-muted rounded-md p-3 text-xs font-mono">
            npx skillhub@latest install skill-slug
          </pre>
          <p>Or pass it inline:</p>
          <pre className="bg-muted rounded-md p-3 text-xs font-mono">
            npx skillhub@latest install skill-slug --key sh_your_key_here
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}
