import { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTenantAuth } from "../../context/TenantAuthContext"
import {
  getMyMessagesAsTenant, sendMessageAsTenant, supabaseTenant,
  markStaffMessagesReadForTenant,
} from "../../services/tenantPortalService"
import toast from "react-hot-toast"

export default function PortalMessages() {
  const { tenant } = useTenantAuth()
  const queryClient = useQueryClient()
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["my-messages", tenant?.id],
    queryFn: () => getMyMessagesAsTenant(tenant.id),
    enabled: !!tenant,
  })

  // Opening this page is the tenant "reading" staff's messages — clears the
  // unread badge on the sidebar.
  useEffect(() => {
    if (!tenant?.id) return
    markStaffMessagesReadForTenant(tenant.id)
      .then(() => queryClient.invalidateQueries(["unread-message-count-tenant", tenant.id]))
      .catch(() => { /* non-critical — badge just won't clear until next read */ })
  }, [tenant?.id, queryClient])

  // Realtime subscription
  useEffect(() => {
    if (!tenant?.id) return

    const channel = supabaseTenant
      .channel(`messages-${tenant.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `tenant_id=eq.${tenant.id}`,
      }, () => {
        queryClient.invalidateQueries(["my-messages", tenant.id])
        // A new staff message while already on this page is effectively
        // read immediately too.
        markStaffMessagesReadForTenant(tenant.id)
          .then(() => queryClient.invalidateQueries(["unread-message-count-tenant", tenant.id]))
          .catch(() => {})
      })
      .subscribe()

    return () => supabaseTenant.removeChannel(channel)
  }, [tenant?.id, queryClient])

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)
    try {
      await sendMessageAsTenant(tenant.id, tenant.full_name, newMessage.trim())
      setNewMessage("")
      queryClient.invalidateQueries(["my-messages", tenant.id])
    } catch (err) {
      toast.error("Failed to send: " + err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">Messages</h1>
        <p className="text-sm text-gray-500 mt-2">Correspondence with your property manager</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-gray-100/50 flex flex-col overflow-hidden max-w-3xl" style={{ height: "68vh" }}>

        {/* Thread header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 100-8 4 4 0 000 8zm6 0a4 4 0 10-1-7.87" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">Property management</div>
            <div className="text-xs text-gray-400">{tenant?.buildings?.name}</div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/40">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-gray-400">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id}
                className={`flex ${msg.sender_type === "tenant" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] sm:max-w-md rounded-2xl px-4 py-2.5 shadow-sm ${
                  msg.sender_type === "tenant"
                    ? "bg-brand-500 text-white rounded-br-sm"
                    : "bg-white text-gray-800 rounded-bl-sm border border-gray-100"
                }`}>
                  {msg.sender_type === "staff" && (
                    <div className="text-xs font-medium mb-1 text-brand-600">
                      {msg.sender_name}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                  <div className={`text-xs mt-1 ${
                    msg.sender_type === "tenant" ? "text-brand-200" : "text-gray-400"
                  }`}>
                    {new Date(msg.created_at).toLocaleTimeString("en-PK", {
                      hour: "2-digit", minute: "2-digit"
                    })}
                    {" · "}
                    {new Date(msg.created_at).toLocaleDateString("en-PK", {
                      day: "2-digit", month: "short"
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend}
          className="border-t border-gray-100 p-4 flex items-center gap-3 flex-shrink-0 bg-white">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button type="submit"
            disabled={sending || !newMessage.trim()}
            className="w-10 h-10 bg-coral-500 hover:bg-coral-700 text-white rounded-xl transition disabled:opacity-50 flex-shrink-0 flex items-center justify-center">
            {sending
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            }
          </button>
        </form>
      </div>
    </div>
  )
}
