import Link from 'next/link'
import { Download, Star, Tag } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { formatNumber, CATEGORY_LABELS, CATEGORY_ICONS, type SkillCategory } from '@/lib/utils'
import { formatPrice } from '@/lib/stripe'

interface SkillCardProps {
  id: string
  slug: string
  name: string
  description: string
  category: string
  tags?: string[]
  priceCents: number
  downloads: number
  version: string
  author: {
    username: string
    avatarUrl?: string | null
  }
  rating?: number
  reviewCount?: number
}

export function SkillCard({
  slug,
  name,
  description,
  category,
  tags,
  priceCents,
  downloads,
  version,
  author,
  rating,
  reviewCount,
}: SkillCardProps) {
  const categoryLabel = CATEGORY_LABELS[category as SkillCategory] || category
  const categoryIcon = CATEGORY_ICONS[category as SkillCategory] || '📦'

  return (
    <Link href={`/skills/${slug}`}>
      <Card className="group h-full flex flex-col transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:shadow-primary/5 cursor-pointer">
        <CardContent className="flex-1 p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{categoryIcon}</span>
              <Badge variant="secondary" className="text-xs">
                {categoryLabel}
              </Badge>
            </div>
            <span
              className={
                priceCents === 0
                  ? 'text-emerald-400 font-semibold text-sm'
                  : 'text-primary font-semibold text-sm'
              }
            >
              {formatPrice(priceCents)}
            </span>
          </div>

          <h3 className="font-semibold text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
            {name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {description}
          </p>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="px-5 py-3 border-t border-border/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={author.avatarUrl || undefined} />
              <AvatarFallback className="text-[10px]">
                {author.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
              {author.username}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {rating !== undefined && reviewCount !== undefined && reviewCount > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {rating.toFixed(1)}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Download className="h-3 w-3" />
              {formatNumber(downloads)}
            </span>
            <span className="text-muted-foreground/50">v{version}</span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
