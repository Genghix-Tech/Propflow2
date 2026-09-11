import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import {
  getNotifications, markNotificationRead, clearNotification,
  markAllNotificationsRead, clearAllNotifications,
} from "../../services/notificationService"
import { useAuth } from "../../context/AuthContext"
import { supabase } from "../../lib/supabase"
import { playNotificationSound } from "../../lib/notificationSound"

const TYPE_ICON = {
  overdue_invoice: (
    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  lease_expiring: (
    <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  open_ticket: (
    <svg className="w-4 h-4 text-coral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  new_message: (
    <svg className="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
}

export default function Header({ onMenuClick }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { profile, user } = useAuth()
  const userId = profile?.id || user?.id
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: () => getNotifications(userId),
    enabled: !!userId,
    refetchInterval: 60000, // keep it reasonably fresh without hammering the DB
  })

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const refresh = () => queryClient.invalidateQueries(["notifications", userId])

  // Global "new tenant message" alert — mounted once here (Header lives in
  // AppLayout, so it's present on every staff page), independent of whether
  // the Messages page is even open. Pops a clickable toast, plays a short
  // sound, and refreshes the bell so the new item shows up there too.
  useEffect(() => {
    const channel = supabase
      .channel("staff-message-alerts")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages", filter: "sender_type=eq.tenant",
      }, ({ new: msg }) => {
        playNotificationSound()
        toast((t) => (
          <div
            onClick={() => { navigate(`/messages?tenant=${msg.tenant_id}`); toast.dismiss(t.id) }}
            className="cursor-pointer">
            <div className="text-sm font-semibold text-gray-900">{msg.sender_name || "New message"}</div>
            <div className="text-xs text-gray-500 truncate max-w-[220px]">{msg.body}</div>
          </div>
        ), { icon: "💬", duration: 6000 })
        queryClient.invalidateQueries(["notifications", userId])
        queryClient.invalidateQueries(["conversations"])
        queryClient.invalidateQueries(["unread-message-count"])
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [userId, queryClient, navigate])

  const handleItemClick = async (n) => {
    setOpen(false)
    if (!n.read) {
      try { await markNotificationRead(userId, n.id); refresh() } catch { /* non-critical */ }
    }
    navigate(n.link)
  }

  const handleClearOne = async (e, key) => {
    e.stopPropagation()
    try {
      await clearNotification(userId, key)
      refresh()
    } catch (err) {
      console.error("Failed to clear notification", err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(userId, notifications.map(n => n.id))
      refresh()
    } catch (err) {
      console.error("Failed to mark all read", err)
    }
  }

  const handleClearAll = async () => {
    try {
      await clearAllNotifications(userId, notifications.map(n => n.id))
      refresh()
    } catch (err) {
      console.error("Failed to clear all", err)
    }
  }

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">

      {/* Left — mobile hamburger + page title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Dashboard</h1>
          <p className="text-xs text-gray-400 hidden sm:block">
            {new Date().toLocaleDateString("en-PK", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2 relative" ref={panelRef}>

        {/* Notifications */}
        <button onClick={() => setOpen(o => !o)}
          className="relative p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-semibold rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-gray-100 shadow-lg z-40 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {notifications.length > 0 && (
                <div className="flex items-center gap-3">
                  <button onClick={handleMarkAllRead}
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium transition">
                    Mark all read
                  </button>
                  <button onClick={handleClearAll}
                    className="text-xs text-gray-400 hover:text-red-500 font-medium transition">
                    Clear all
                  </button>
                </div>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  You're all caught up.
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} onClick={() => handleItemClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0 cursor-pointer group ${
                      !n.read ? "bg-brand-50/40" : ""
                    }`}>
                    <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5 relative">
                      {TYPE_ICON[n.type]}
                      {!n.read && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-500 rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm truncate ${!n.read ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                        {n.title}
                      </div>
                      {n.subtitle && <div className="text-xs text-gray-400 truncate">{n.subtitle}</div>}
                    </div>
                    <button onClick={(e) => handleClearOne(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition flex-shrink-0 mt-0.5"
                      title="Clear">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </header>
  )
}