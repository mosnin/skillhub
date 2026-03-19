'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, timeAgo } from '@/lib/utils'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  isRead: boolean
  createdAt: string
}

export function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
      setUnreadCount(data.unreadCount ?? 0)
    } catch {
      // silently ignore network errors
    }
  }, [])

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function markAllRead() {
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch {
      // silently ignore
    }
  }

  async function handleNotificationClick(notification: Notification) {
    if (!notification.isRead) {
      try {
        await fetch(`/api/notifications/${notification.id}`, { method: 'PATCH' })
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch {
        // silently ignore
      }
    }
    setOpen(false)
    if (notification.href) {
      router.push(notification.href)
    }
  }

  const badgeLabel = unreadCount > 9 ? '9+' : unreadCount.toString()

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none">
            {badgeLabel}
          </span>
        )}
      </Button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 z-50 w-80 rounded-lg border border-border bg-background shadow-lg"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-border/50 last:border-0 transition-colors hover:bg-accent/50',
                    notification.isRead ? 'opacity-60' : 'opacity-100'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!notification.isRead && (
                      <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                    )}
                    {notification.isRead && <span className="mt-1.5 h-2 w-2 flex-shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {timeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
