import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getEnquiries, updateEnquiryStatus, deleteEnquiry } from "../../services/enquiryService"
import toast from "react-hot-toast"

const statusStyle = {
  new:       "bg-blue-50 text-blue-700",
  contacted: "bg-yellow-50 text-yellow-700",
  closed:    "bg-gray-100 text-gray-400",
}

const PAGE_SIZE = 20

export default function EnquiryList() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(0)

  const { data, isLoading } = useQuery({
    queryKey: ["enquiries", status, page],
    queryFn: () => getEnquiries({ status, page, pageSize: PAGE_SIZE }),
  })

  const enquiries = data?.data || []
  const total = data?.count || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateEnquiryStatus(id, newStatus)
      queryClient.invalidateQueries(["enquiries"])
      toast.success("Status updated")
    } catch (err) {
      toast.error("Failed to update: " + err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm("Delete this enquiry?")) return
    try {
      await deleteEnquiry(id)
      queryClient.invalidateQueries(["enquiries"])
      toast.success("Enquiry deleted")
    } catch (err) {
      toast.error("Failed to delete: " + err.message)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rental enquiries</h2>
          <p className="text-sm text-gray-400 mt-0.5">{total} total enquiries</p>
        </div>
        <select value={status}
          onChange={e => { setStatus(e.target.value); setPage(0) }}
          className="text-sm px-3.5 py-2 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Loading...</div>
        ) : enquiries.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">No enquiries yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-400 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Property</th>
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {enquiries.map(en => (
                <tr key={en.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-gray-900">{en.full_name}</div>
                    {en.message && <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">{en.message}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">
                    <div>{en.phone}</div>
                    {en.email && <div className="text-xs text-gray-400">{en.email}</div>}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600">{en.buildings?.name || "—"}</td>
                  <td className="px-5 py-3.5 text-gray-400 text-xs">
                    {new Date(en.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5">
                    <select value={en.status}
                      onChange={e => handleStatusChange(en.id, e.target.value)}
                      className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-brand-500 ${statusStyle[en.status]}`}>
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => handleDelete(en.id)}
                      className="text-gray-300 hover:text-red-500 transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50 transition">
            Previous
          </button>
          <span className="text-gray-400">Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-50 transition">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
