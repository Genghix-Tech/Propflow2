import { supabase } from "../lib/supabase"

const BUCKET = "tenant-documents"

export const REQUIRED_DOCS = [
  { type: "cnic",                 label: "CNIC",                sub: "Front & back",     required: true  },
  { type: "rent_agreement",       label: "Rent agreement",       sub: "Signed copy",      required: true  },
  { type: "passport_photo",       label: "Passport photo",       sub: "Recent photo",     required: false },
  { type: "police_verification",  label: "Police verification",  sub: "NOC",               required: false },
  { type: "bank_statement",       label: "Bank statement",       sub: "Last 3 months",     required: false },
]

// Returns REQUIRED_DOCS merged with whatever rows already exist for this tenant,
// so the UI always has a full 5-item list even before any row has been created.
export const getTenantDocuments = async (tenantId) => {
  const { data, error } = await supabase
    .from("tenant_documents")
    .select("*")
    .eq("tenant_id", tenantId)
  if (error) throw error

  return REQUIRED_DOCS.map(doc => {
    const existing = data.find(d => d.doc_type === doc.type)
    return { ...doc, ...existing, status: existing?.status || "pending" }
  })
}

export const markDocumentStatus = async (tenantId, docType, status) => {
  const { error } = await supabase
    .from("tenant_documents")
    .upsert(
      [{ tenant_id: tenantId, doc_type: docType, status }],
      { onConflict: "tenant_id,doc_type" }
    )
  if (error) throw error
}

export const uploadTenantDocument = async (tenantId, docType, file) => {
  const filePath = `${tenantId}/${docType}-${Date.now()}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, { upsert: false })
  if (uploadError) throw uploadError

  const isRequired = REQUIRED_DOCS.find(d => d.type === docType)?.required
  // Required documents need staff sign-off before counting as "collected" —
  // optional ones are trusted as soon as a file is attached.
  const status = isRequired ? "pending_verification" : "collected"

  const { error: dbError } = await supabase
    .from("tenant_documents")
    .upsert(
      [{
        tenant_id: tenantId,
        doc_type: docType,
        status,
        file_path: filePath,
        file_name: file.name,
        uploaded_at: new Date().toISOString(),
      }],
      { onConflict: "tenant_id,doc_type" }
    )
  if (dbError) throw dbError
}

// Staff confirms an uploaded required document is genuine/valid
export const verifyTenantDocument = async (tenantId, docType) => {
  const { error } = await supabase
    .from("tenant_documents")
    .update({ status: "collected" })
    .eq("tenant_id", tenantId)
    .eq("doc_type", docType)
  if (error) throw error
}

// Bucket is private — generate a short-lived signed URL to view/download a file
export const getDocumentSignedUrl = async (filePath) => {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60)
  if (error) throw error
  return data.signedUrl
}

export const deleteTenantDocument = async (docId, filePath, tenantId, docType) => {
  if (filePath) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([filePath])
    if (storageError) throw storageError
  }
  // Reset back to a pending row rather than deleting entirely, so the checklist item remains
  const { error } = await supabase
    .from("tenant_documents")
    .upsert(
      [{ tenant_id: tenantId, doc_type: docType, status: "pending", file_path: null, file_name: null, uploaded_at: null }],
      { onConflict: "tenant_id,doc_type" }
    )
  if (error) throw error
}