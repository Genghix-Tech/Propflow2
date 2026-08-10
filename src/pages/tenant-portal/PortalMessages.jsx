import { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTenantAuth } from "../../context/TenantAuthContext"
import { getMyMessages, sendMessageAsTenant, supabaseTenant } from "../../services/tenantPortalService"
import toast from "react-hot-toast"

export default function PortalMessages() {
  const { tenant } = useTenantAuth()
  const queryClient = useQueryClient()
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["my-messages", tenant?.id],
    queryFn: () => getMyMessages(tenant.id),
    enabled: !!tenant,
  })

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
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
        <p className="text-sm text-gray-400 mt-0.5">Correspondence with your property manager</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ height: "60vh" }}>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id}
                className={`flex ${msg.sender_type === "tenant" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-xs sm:max-w-md rounded-2xl px-4 py-2.5 ${
                  msg.sender_type === "tenant"
                    ? "bg-brand-500 text-white rounded-br-sm"
                    : "bg-gray-100 text-gray-800 rounded-bl-sm"
                }`}>
                  {msg.sender_type === "staff" && (
                    <div className="text-xs font-medium mb-1 text-gray-500">
                      {msg.sender_name}
                    </div>
                  )}
                  <p className="text-sm">{msg.body}</p>
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
          className="border-t border-gray-100 p-4 flex items-center gap-3">
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
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}