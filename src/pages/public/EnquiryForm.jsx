import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getPublicBuildings, submitEnquiry } from "../../services/enquiryService"
import toast from "react-hot-toast"

const defaultForm = {
  full_name: "",
  phone: "",
  email: "",
  building_id: "",
  message: "",
}

export default function EnquiryForm() {
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const { data: buildings = [] } = useQuery({
    queryKey: ["buildings-public"],
    queryFn: getPublicBuildings,
  })

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error("Please enter your name"); return }
    if (!form.phone.trim()) { toast.error("Please enter your phone number"); return }

    setSubmitting(true)
    try {
      await submitEnquiry({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        building_id: form.building_id || null,
        message: form.message.trim() || null,
      })
      setSubmitted(true)
    } catch (err) {
      toast.error("Something went wrong: " + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center bg-white rounded-2xl border border-gray-100 p-8">
          <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Thank you!</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your enquiry has been received. Our team will contact you shortly.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <img
            src="/logo.png"
            alt="Company Logo"
            className="h-14 w-auto object-contain mx-auto mb-3"
            onError={e => { e.target.style.display = "none" }}
          />
          <h1 className="text-2xl font-semibold text-gray-900">Interested in renting?</h1>
          <p className="text-sm text-gray-500 mt-1">Fill in your details and we'll get back to you</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Full name <span className="text-red-400">*</span>
            </label>
            <input type="text" value={form.full_name}
              onChange={e => set("full_name", e.target.value)}
              placeholder="e.g. Ahmed Khan"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Phone number <span className="text-red-400">*</span>
            </label>
            <input type="tel" value={form.phone}
              onChange={e => set("phone", e.target.value)}
              placeholder="e.g. 0300-1234567"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <input type="email" value={form.email}
              onChange={e => set("email", e.target.value)}
              placeholder="e.g. ahmed@email.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Interested property</label>
            <select value={form.building_id}
              onChange={e => set("building_id", e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
              <option value="">Any / not sure yet</option>
              {buildings.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Message</label>
            <textarea value={form.message}
              onChange={e => set("message", e.target.value)}
              rows={3}
              placeholder="Tell us what you're looking for..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>

          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-coral-500 hover:bg-coral-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition disabled:opacity-60">
            {submitting
              ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</>
              : "Submit enquiry"
            }
          </button>
        </form>
      </div>
    </div>
  )
}
