# SkillHub — The AI Agent Skills Marketplace

A marketplace for discovering, buying, and selling AI agent skills. Similar to ClawHub but with full monetization support for creators.

## Features

- **Browse & Search** — Find skills by category, price, and keyword
- **Install via CLI** — `npx skillhub@latest install <slug>`
- **Creator Monetization** — Sell skills and receive 80% of every sale
- **Stripe Connect** — Direct payouts to creators' bank accounts
- **API Keys** — CLI authentication for paid skill downloads
- **Reviews & Ratings** — Community trust signals
- **Works with** — Claude Code, Cursor, Windsurf, and any AI agent

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Auth**: Clerk
- **Database**: Neon (PostgreSQL) + Drizzle ORM
- **Payments**: Stripe + Stripe Connect
- **Styling**: Tailwind CSS
- **Hosting**: Vercel

## Getting Started

### 1. Clone and install dependencies

```bash
git clone <repo>
cd skillhub
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` — From [clerk.com](https://clerk.com)
- `CLERK_WEBHOOK_SECRET` — For user sync webhook
- `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — From [stripe.com](https://stripe.com)
- `STRIPE_WEBHOOK_SECRET` — For payment webhooks
- `NEXT_PUBLIC_APP_URL` — Your app URL (e.g. `https://yourdomain.com`)

### 3. Set up the database

```bash
# Run the initial migration against your Neon database
psql $DATABASE_URL < drizzle/0000_initial_schema.sql

# Or use Drizzle Kit
npm run db:push
```

### 4. Configure Clerk Webhooks

In the Clerk dashboard, add a webhook pointing to:
`https://yourdomain.com/api/webhooks/clerk`

Events to subscribe to:
- `user.created`
- `user.updated`
- `user.deleted`

### 5. Configure Stripe Webhooks

In the Stripe dashboard, add a webhook pointing to:
`https://yourdomain.com/api/webhooks/stripe`

Events to subscribe to:
- `checkout.session.completed`
- `account.updated`

### 6. Run the development server

```bash
npm run dev
```

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/skillhub)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy!

## CLI Usage

The SkillHub CLI can be used without installation via `npx`:

```bash
# Install a skill
npx skillhub@latest install code-reviewer

# Search for skills
npx skillhub@latest search "code review"

# List installed skills
npx skillhub@latest list

# Inspect a skill
npx skillhub@latest inspect code-reviewer

# Publish a skill
SKILLHUB_API_KEY=sh_xxx npx skillhub@latest publish ./SKILL.md
```

### Using with Claude Code

After installing a skill, reference it in your `CLAUDE.md`:

```markdown
@.skillhub/skills/code-reviewer/SKILL.md
```

### Using with Cursor/Windsurf

Add the skill file to your project rules/instructions.

## Skill Format (SKILL.md)

```markdown
---
name: My Skill
slug: my-skill
version: 1.0.0
description: A brief description
author: your-username
category: development
tags: [code-review, automation]
---

# My Skill

Instructions for the AI agent go here...
```

## Revenue Share

- **Creators receive 80%** of every sale
- **Platform fee: 20%**
- Payouts via Stripe Connect directly to your bank account
- No monthly fees — only pay when you earn

## License

MIT
