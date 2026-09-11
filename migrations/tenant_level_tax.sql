-- ============================================================
-- PropFlow — Move tax from per-invoice manual entry to a fixed
-- per-tenant recurring field (auto-applied on every invoice)
-- Run this in Supabase SQL Editor
-- ============================================================

-- The tenant's tax type (free text, e.g. "GST") and fixed monthly amount —
-- set once when adding/editing a tenant, applied automatically to every
-- invoice generated for them from then on (like rent/maintenance, not a
-- one-time thing like security deposit).
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tax_type TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;

-- Snapshot of the tax type on the invoice itself (invoices.tax_amount
-- already existed). Snapshotting means the invoice keeps showing the tax
-- label that was actually in effect when it was generated, even if the
-- tenant's tax_type is edited later.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_type TEXT;
