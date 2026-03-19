'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Zap, Search, LayoutDashboard, Package } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { isSignedIn } = useUser()
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">SkillHub</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/marketplace"
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:text-foreground',
                pathname === '/marketplace'
                  ? 'text-foreground bg-accent'
                  : 'text-muted-foreground'
              )}
            >
              <Package className="h-4 w-4" />
              Marketplace
            </Link>
            {isSignedIn && (
              <Link
                href="/dashboard"
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:text-foreground',
                  pathname?.startsWith('/dashboard')
                    ? 'text-foreground bg-accent'
                    : 'text-muted-foreground'
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/marketplace">
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <Search className="h-4 w-4" />
            </Button>
          </Link>

          {isSignedIn ? (
            <div className="flex items-center gap-3">
              <Link href="/dashboard/upload">
                <Button size="sm" className="hidden sm:flex">
                  Publish Skill
                </Button>
              </Link>
              <UserButton afterSignOutUrl="/" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button size="sm">Get Started</Button>
              </SignUpButton>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
