import { NextResponse } from 'next/server'

/**
 * GET /api/v1/openapi.json
 * OpenAPI 3.1 specification for the SkillHub API.
 * Used by AI agents and tools to discover and use the API.
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skillhub.dev'

  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'SkillHub API',
      version: '1.0.0',
      description:
        'The SkillHub API for discovering, downloading, and publishing AI agent skills. Compatible with OpenClaw registry format.',
      contact: {
        url: appUrl,
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [{ url: `${appUrl}/api/v1`, description: 'SkillHub API v1' }],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'SkillHub API key (format: sh_xxx). Get one at /dashboard/api-keys',
        },
      },
      schemas: {
        Skill: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            slug: { type: 'string', example: 'code-reviewer' },
            name: { type: 'string', example: 'Code Reviewer' },
            description: { type: 'string' },
            version: { type: 'string', example: '1.0.0' },
            category: { type: 'string', example: 'development' },
            tags: { type: 'array', items: { type: 'string' } },
            price: {
              type: 'object',
              properties: {
                cents: { type: 'integer' },
                currency: { type: 'string' },
                free: { type: 'boolean' },
                formatted: { type: 'string' },
              },
            },
            downloads: { type: 'integer' },
            compatible_with: { type: 'array', items: { type: 'string' } },
            'user-invocable': { type: 'boolean' },
            security: {
              type: 'object',
              properties: {
                scan_status: {
                  type: 'string',
                  enum: ['pending', 'clean', 'flagged', 'error'],
                },
              },
            },
            author: {
              type: 'object',
              properties: {
                username: { type: 'string' },
                avatar_url: { type: 'string' },
              },
            },
            install: {
              type: 'object',
              properties: {
                command: { type: 'string', example: 'npx skillhub@latest install code-reviewer' },
                path: { type: 'string' },
                agent_ref: { type: 'string' },
              },
            },
          },
        },
        ValidationResult: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                  code: { type: 'string' },
                },
              },
            },
            warnings: { type: 'array', items: { type: 'object' } },
            meta: { type: 'object', nullable: true },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/skills': {
        get: {
          summary: 'List skills',
          description: 'Browse and search published skills in the marketplace.',
          operationId: 'listSkills',
          security: [],
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search query' },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'compatible_with', in: 'query', schema: { type: 'string' }, example: 'claude-code' },
            { name: 'price', in: 'query', schema: { type: 'string', enum: ['free', 'paid'] } },
            { name: 'sort', in: 'query', schema: { type: 'string', enum: ['downloads', 'updated', 'trending'] } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': {
              description: 'List of skills',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Skill' } },
                      meta: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          limit: { type: 'integer' },
                          offset: { type: 'integer' },
                          hasMore: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/skills/{slug}': {
        get: {
          summary: 'Get skill details',
          operationId: 'getSkill',
          security: [],
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Skill details',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Skill' } },
              },
            },
            '404': {
              description: 'Not found',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/Error' } },
              },
            },
          },
        },
      },
      '/skills/{slug}/content': {
        get: {
          summary: 'Download skill content (SKILL.md)',
          description:
            'Download the raw SKILL.md content. Free skills require no auth. Paid skills require a Bearer API key with a valid purchase.',
          operationId: 'getSkillContent',
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Skill content',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      slug: { type: 'string' },
                      name: { type: 'string' },
                      version: { type: 'string' },
                      content: { type: 'string', description: 'Raw SKILL.md content' },
                      install_path: { type: 'string' },
                      agent_ref: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': { description: 'Auth required (paid skill)' },
            '402': { description: 'Purchase required' },
          },
        },
      },
      '/skills/{slug}/scan': {
        get: {
          summary: 'Get security scan results',
          operationId: 'getSkillScan',
          security: [],
          parameters: [
            { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
              description: 'Scan results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      slug: { type: 'string' },
                      scan_status: { type: 'string', enum: ['pending', 'clean', 'flagged', 'error'] },
                      stats: { type: 'object', nullable: true },
                      permalink: { type: 'string', nullable: true },
                      completed_at: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/validate': {
        post: {
          summary: 'Validate a SKILL.md before uploading',
          operationId: 'validateSkill',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['content'],
                  properties: {
                    content: { type: 'string', description: 'Raw SKILL.md content' },
                    slug: { type: 'string', description: 'Intended slug (optional)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Validation result',
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/ValidationResult' } },
              },
            },
          },
        },
      },
      '/whoami': {
        get: {
          summary: 'Get authenticated user profile',
          operationId: 'whoami',
          responses: {
            '200': {
              description: 'Authenticated user info',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      authenticated: { type: 'boolean' },
                      user: { type: 'object' },
                      key: { type: 'object' },
                    },
                  },
                },
              },
            },
            '401': { description: 'Not authenticated' },
          },
        },
      },
    },
    'x-skillhub': {
      discovery: `${appUrl}/.well-known/skillhub.json`,
      cli: 'npx skillhub@latest',
      compatible_with_openclaw: true,
    },
  }

  return NextResponse.json(spec, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
