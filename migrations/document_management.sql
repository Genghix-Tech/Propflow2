-- ============================================================
-- PropFlow — Document Management feature
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create a private storage bucket for tenant documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Only authenticated staff can upload/view/delete files in this bucket
--    (bucket is private — files are accessed via short-lived signed URLs, not public links)
CREATE POLICY "Authenticated users can upload tenant documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tenant-documents');

CREATE POLICY "Authenticated users can view tenant documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'tenant-documents');

CREATE POLICY "Authenticated users can delete tenant documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tenant-documents');

-- 3. Table tracking each document's status (collected/pending) and its file, if uploaded
CREATE TABLE IF NOT EXISTS public.tenant_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  file_path TEXT,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT tenant_documents_type_check
    CHECK (doc_type = ANY (ARRAY['cnic', 'rent_agreement', 'passport_photo', 'police_verification', 'bank_statement'])),
  CONSTRAINT tenant_documents_status_check
    CHECK (status = ANY (ARRAY['pending', 'collected'])),
  CONSTRAINT tenant_documents_tenant_doctype_key UNIQUE (tenant_id, doc_type)
);

-- Performance: documents are always looked up by tenant
CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant_id ON public.tenant_documents(tenant_id);

ALTER TABLE public.tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage tenant documents"
  ON public.tenant_documents FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
