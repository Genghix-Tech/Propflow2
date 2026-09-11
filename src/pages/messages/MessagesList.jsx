import { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSearchParams, Link } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import {
  getConversations, getMyMessages, sendMessageAsStaff, markTenantMessagesRead,
} from "../../services/tenantPortalService"
import { useAuth } from "../../context/AuthContext"
import toast from "react-hot-toast"

export default function MessagesList() {
  const { user } = useAuth()
  const staffName = user?.user_metadata?.full_name || user?.email || "Staff"
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const selectedTenantId = searchParams.get("tenant")
  const queryClient = useQueryClient()

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: getConversations,
  })

  // Keep the inbox list's ordering/previews live for ANY tenant's new
  // message, not just the currently-open thread (that one also invalidates
  // this same query on its own realtime event, so this covers the rest).
  useEffect(() => {
    const channel = supabase
      .channel("staff-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        () => queryClient.invalidateQueries(["conversations"]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [queryClient])

  const filtered = conversations.filter(c =>
    c.tenant_name?.toLowerCase().includes(search.toLowerCase())
  )

  const selectedConversation = conversations.find(c => c.tenant_id === selectedTenantId)

  const selectConversation = (tenantId) => {
    setSearchParams({ tenant: tenantId })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} with tenants
        </p>
      </div>

      <div className="flex gap-5" style={{ height: "calc(100vh - 190px)", minHeight: "480px" }}>

        {/* Conversation list */}
        <div className="w-full sm:w-80 flex-shrink-0 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <svg className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search tenants..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-300 px-4 text-center">
                <svg className="w-9 h-9 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-gray-400">{conversations.length === 0 ? "No conversations yet" : "No matches"}</p>
              </div>
            ) : (
              filtered.map(c => {
                const initials = c.tenant_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "T"
                const needsReply = c.last_sender_type === "tenant"
                const isActive = c.tenant_id === selectedTenantId
                return (
                  <button key={c.tenant_id} onClick={() => selectConversation(c.tenant_id)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-50 transition ${
                      isActive ? "bg-brand-50" : "hover:bg-gray-50"
                    }`}>
                    <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className={`text-sm truncate ${needsReply ? "font-semibold text-gray-900" : "font-medium text-gray-700"}`}>
                          {c.tenant_name}
                        </div>
                        <div className="text-[11px] text-gray-400 flex-shrink-0">
                          {relativeTime(c.last_message_at)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {c.building_name}{c.unit_number ? ` · ${c.unit_number}` : ""}
                      </div>
                      <div className={`text-xs mt-0.5 truncate ${needsReply ? "text-gray-700" : "text-gray-400"}`}>
                        {c.last_sender_type === "staff" && <span className="text-gray-400">You: </span>}
                        {c.last_message}
                      </div>
                    </div>
                    {needsReply && <span className="w-2 h-2 rounded-full bg-coral-500 mt-1.5 flex-shrink-0" />}
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="hidden sm:flex flex-1 bg-white rounded-2xl border border-gray-100 overflow-hidden flex-col">
          {selectedTenantId ? (
            <Thread
              key={selectedTenantId}
              tenantId={selectedTenantId}
              staffName={staffName}
              conversation={selectedConversation}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
              <svg className="w-14 h-14 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-gray-400">Select a conversation to view messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Thread({ tenantId, staffName, conversation }) {
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const queryClient = useQueryClient()
  const scrollContainerRef = useRef(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", tenantId],
    queryFn: () => getMyMessages(tenantId),
  })

  // Opening this conversation is staff "reading" the tenant's messages —
  // clears the unread badge on the sidebar for this conversation.
  useEffect(() => {
    markTenantMessagesRead(tenantId)
      .then(() => {
        queryClient.invalidateQueries(["unread-message-count"])
        queryClient.invalidateQueries(["conversations"])
      })
      .catch(() => { /* non-critical — badge just won't clear until next read */ })
  }, [tenantId, queryClient])

  useEffect(() => {
    const channel = supabase
      .channel(`staff-messages-${tenantId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `tenant_id=eq.${tenantId}`,
      }, () => {
        queryClient.invalidateQueries(["messages", tenantId])
        queryClient.invalidateQueries(["conversations"])
        // A new tenant message while this exact conversation is already
        // open is effectively read immediately too.
        markTenantMessagesRead(tenantId)
          .then(() => queryClient.invalidateQueries(["unread-message-count"]))
          .catch(() => {})
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tenantId, queryClient])

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)
    try {
      await sendMessageAsStaff(tenantId, staffName, newMessage.trim())
      setNewMessage("")
      queryClient.invalidateQueries(["messages", tenantId])
      queryClient.invalidateQueries(["conversations"])
    } catch (err) {
      toast.error("Failed to send: " + err.message)
    } finally {
      setSending(false)
    }
  }

  const initials = conversation?.tenant_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "T"

  return (
    <>
      {/* Thread header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-gray-900 truncate">{conversation?.tenant_name || "Tenant"}</div>
            <div className="text-xs text-gray-400 truncate">
              {conversation?.building_name}{conversation?.unit_number ? ` · ${conversation.unit_number}` : ""}
            </div>
          </div>
        </div>
        <Link to={`/tenants/${tenantId}`}
          className="text-xs text-brand-500 hover:text-brand-700 font-medium flex items-center gap-1 transition flex-shrink-0">
          View profile
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/40">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet. Start the conversation!
          </div>
        ) : messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender_type === "staff" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] sm:max-w-md rounded-2xl px-4 py-2.5 shadow-sm ${
              msg.sender_type === "staff"
                ? "bg-brand-500 text-white rounded-br-sm"
                : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
            }`}>
              {msg.sender_type === "tenant" && (
                <div className="text-xs font-medium mb-1 text-gray-500">{msg.sender_name}</div>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
              <div className={`text-xs mt-1 ${msg.sender_type === "staff" ? "text-brand-200" : "text-gray-400"}`}>
                {new Date(msg.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                {" · "}
                {new Date(msg.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short" })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-gray-100 p-4 flex gap-3 flex-shrink-0 bg-white">
        <input type="text" value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a reply..."
          className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        <button type="submit" disabled={sending || !newMessage.trim()}
          className="w-10 h-10 bg-coral-500 hover:bg-coral-700 text-white rounded-xl transition disabled:opacity-50 flex-shrink-0 flex items-center justify-center">
          {sending
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
          }
        </button>
      </form>
    </>
  )
}

function relativeTime(dateStr) {
  if (!dateStr) return ""
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "now"
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "2-digit", month: "short" })
}
