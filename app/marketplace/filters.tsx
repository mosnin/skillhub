'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { SKILL_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS, type SkillCategory } from '@/lib/utils'

interface FiltersProps {
  searchParams: {
    q?: string
    category?: string
    price?: string
    sort?: string
  }
}

export function MarketplaceFilters({ searchParams }: FiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function updateParams(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { ...searchParams, ...updates, page: undefined }
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v)
    })
    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function clearAll() {
    startTransition(() => router.push(pathname))
  }

  const hasFilters = searchParams.q || searchParams.category || searchParams.price

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search skills..."
          className="pl-9"
          defaultValue={searchParams.q}
          onChange={(e) => {
            const value = e.target.value
            const timer = setTimeout(() => {
              updateParams({ q: value || undefined })
            }, 300)
            return () => clearTimeout(timer)
          }}
        />
      </div>

      <Separator />

      {/* Sort */}
      <div>
        <h3 className="text-sm font-medium mb-3">Sort by</h3>
        <div className="space-y-1">
          {[
            { value: 'popular', label: 'Most Popular' },
            { value: 'newest', label: 'Newest First' },
            { value: 'price-asc', label: 'Price: Low to High' },
            { value: 'price-desc', label: 'Price: High to Low' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateParams({ sort: value })}
              className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
                (searchParams.sort || 'popular') === value
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price */}
      <div>
        <h3 className="text-sm font-medium mb-3">Price</h3>
        <div className="flex gap-2">
          {['all', 'free', 'paid'].map((p) => (
            <Button
              key={p}
              size="sm"
              variant={
                (searchParams.price || 'all') === p ? 'default' : 'outline'
              }
              className="flex-1 text-xs capitalize"
              onClick={() =>
                updateParams({ price: p === 'all' ? undefined : p })
              }
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Categories */}
      <div>
        <h3 className="text-sm font-medium mb-3">Category</h3>
        <div className="space-y-1">
          <button
            onClick={() => updateParams({ category: undefined })}
            className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors ${
              !searchParams.category
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            All Categories
          </button>
          {SKILL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => updateParams({ category: cat })}
              className={`w-full text-left text-sm px-3 py-2 rounded-md transition-colors flex items-center gap-2 ${
                searchParams.category === cat
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <span>{CATEGORY_ICONS[cat as SkillCategory]}</span>
              <span>{CATEGORY_LABELS[cat as SkillCategory]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
