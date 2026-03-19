import { NextResponse } from 'next/server'

/**
 * SkillHub Discovery Endpoint
 *
 * Compatible with OpenClaw's /.well-known/clawhub.json format.
 * Used by CLI tools and AI agents to discover platform capabilities.
 *
 * GET /.well-known/skillhub.json
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skillhub.dev'

  return NextResponse.json({
    platform: 'SkillHub',
    version: '1.0.0',
    description: 'The marketplace for AI agent skills — browse, buy, and sell custom AI agent tools.',
    homepage: appUrl,
    minCliVersion: '0.1.0',

    registry: {
      apiVersion: 'v1',
      baseUrl: `${appUrl}/api/v1`,
      openapi: `${appUrl}/api/v1/openapi.json`,
    },

    endpoints: {
      skills: `${appUrl}/api/v1/skills`,
      search: `${appUrl}/api/v1/skills?q={query}`,
      skillDetail: `${appUrl}/api/v1/skills/{slug}`,
      skillContent: `${appUrl}/api/v1/skills/{slug}/content`,
      skillVersions: `${appUrl}/api/v1/skills/{slug}/versions`,
      skillScan: `${appUrl}/api/v1/skills/{slug}/scan`,
      validate: `${appUrl}/api/v1/validate`,
      whoami: `${appUrl}/api/v1/whoami`,
    },

    cli: {
      installCommand: 'npx skillhub@latest install {slug}',
      publishCommand: 'npx skillhub@latest publish ./SKILL.md',
      searchCommand: 'npx skillhub@latest search {query}',
      npmPackage: 'skillhub',
      installDir: '.skillhub/skills/{slug}/SKILL.md',
      globalInstallDir: '~/.skillhub/skills/{slug}/SKILL.md',
    },

    skillFormat: {
      filename: 'SKILL.md',
      schema: `${appUrl}/api/v1/schema/skill`,
      version: '1.0',
      requiredFields: ['name', 'description', 'version'],
      recommendedFields: ['category', 'tags', 'compatible_with', 'author'],
      compatibleFrameworks: [
        'claude-code',
        'cursor',
        'windsurf',
        'openclaw',
        'aider',
        'continue',
        'generic',
      ],
      maxFileSizeBytes: 524288,
    },

    monetization: {
      enabled: true,
      revenueShare: {
        creator: 0.8,
        platform: 0.2,
      },
      currency: 'USD',
      payoutProvider: 'stripe',
    },

    auth: {
      type: 'bearer',
      headerName: 'Authorization',
      prefix: 'Bearer',
      keyPrefix: 'sh_',
      apiKeysUrl: `${appUrl}/dashboard/api-keys`,
    },

    rateLimits: {
      read: { requestsPerMinute: 120 },
      write: { requestsPerMinute: 30 },
      download: { requestsPerMinute: 20 },
    },

    // OpenClaw compatibility alias
    clawHub: false,
    opensourceRegistry: true,
  })
}
