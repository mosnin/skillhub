'use client'

import { useSearchParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { useState } from 'react'

export default function CliAuthPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { isLoaded, isSignedIn } = useUser()

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'expired'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isSignedIn) {
    const redirectUrl = `/cli-auth?token=${token}`
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-auto p-8 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">SkillHub</h1>
            <p className="text-muted-foreground">AI Agent Skills Marketplace</p>
          </div>
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold">Sign In Required</h2>
            <p className="text-muted-foreground text-sm">
              Please sign in to authorize CLI access.
            </p>
            <a
              href={`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
              className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90 transition-colors w-full"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-auto p-8 text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">SkillHub</h1>
          <div className="border rounded-lg p-6 space-y-2">
            <h2 className="text-xl font-semibold text-destructive">Invalid Link</h2>
            <p className="text-muted-foreground text-sm">
              No authorization token found. Please run <code className="font-mono bg-muted px-1 py-0.5 rounded">skillhub login</code> again.
            </p>
          </div>
        </div>
      </div>
    )
  }

  async function handleAuthorize() {
    setStatus('loading')
    try {
      const res = await fetch('/api/auth/cli-authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      if (res.ok) {
        setStatus('success')
      } else if (res.status === 404) {
        setStatus('expired')
      } else {
        const data = await res.json()
        setErrorMessage(data?.error || 'Authorization failed')
        setStatus('error')
      }
    } catch {
      setErrorMessage('Network error. Please try again.')
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-auto p-8 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">SkillHub</h1>
            <p className="text-muted-foreground">AI Agent Skills Marketplace</p>
          </div>
          <div className="border rounded-lg p-6 space-y-4">
            <div className="text-4xl">✓</div>
            <h2 className="text-xl font-semibold text-green-600">CLI Authorized!</h2>
            <p className="text-muted-foreground text-sm">
              You can close this tab and return to your terminal.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full mx-auto p-8 text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">SkillHub</h1>
            <p className="text-muted-foreground">AI Agent Skills Marketplace</p>
          </div>
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-xl font-semibold text-destructive">Link Expired</h2>
            <p className="text-muted-foreground text-sm">
              This authorization link has expired or has already been used. Please run{' '}
              <code className="font-mono bg-muted px-1 py-0.5 rounded">skillhub login</code> again.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto p-8 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">SkillHub</h1>
          <p className="text-muted-foreground">AI Agent Skills Marketplace</p>
        </div>
        <div className="border rounded-lg p-6 space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Authorize CLI Access</h2>
            <p className="text-muted-foreground text-sm">
              The SkillHub CLI is requesting access to your account.
            </p>
          </div>
          <div className="bg-muted rounded-md p-4 text-left space-y-2">
            <p className="text-sm font-medium">This will:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Create an API key for CLI access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Allow the CLI to install and publish skills on your behalf</span>
              </li>
            </ul>
          </div>
          {status === 'error' && (
            <p className="text-destructive text-sm">{errorMessage}</p>
          )}
          <button
            onClick={handleAuthorize}
            disabled={status === 'loading'}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-2 text-sm font-medium hover:bg-primary/90 transition-colors w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Authorizing...' : 'Authorize'}
          </button>
        </div>
      </div>
    </div>
  )
}
