import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

export function timeAgo(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(32)
  if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(bytes)
  }
  return 'sh_' + Array.from(bytes).map((b) => chars[b % chars.length]).join('')
}

export const SKILL_CATEGORIES = [
  'productivity',
  'development',
  'data-analytics',
  'communication',
  'ai-ml',
  'automation',
  'research',
  'writing',
  'security',
  'finance',
  'devops',
  'testing',
] as const

export type SkillCategory = (typeof SKILL_CATEGORIES)[number]

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  productivity: 'Productivity',
  development: 'Development',
  'data-analytics': 'Data & Analytics',
  communication: 'Communication',
  'ai-ml': 'AI & ML',
  automation: 'Automation',
  research: 'Research',
  writing: 'Writing',
  security: 'Security',
  finance: 'Finance',
  devops: 'DevOps',
  testing: 'Testing',
}

export const CATEGORY_ICONS: Record<SkillCategory, string> = {
  productivity: '⚡',
  development: '💻',
  'data-analytics': '📊',
  communication: '💬',
  'ai-ml': '🤖',
  automation: '🔄',
  research: '🔍',
  writing: '✍️',
  security: '🔒',
  finance: '💰',
  devops: '🚀',
  testing: '🧪',
}
