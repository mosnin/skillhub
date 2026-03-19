import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'SkillHub — The AI Agent Skills Marketplace',
    template: '%s | SkillHub',
  },
  description:
    'Discover, buy, and sell AI agent skills. The npm for AI agents — install any skill in one command.',
  keywords: ['AI agent', 'skills', 'marketplace', 'Claude', 'LLM tools', 'AI automation'],
  openGraph: {
    title: 'SkillHub — The AI Agent Skills Marketplace',
    description: 'Discover, buy, and sell AI agent skills.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body>
          <Navbar />
          <main className="min-h-[calc(100vh-4rem)]">{children}</main>
          <Footer />
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  )
}
