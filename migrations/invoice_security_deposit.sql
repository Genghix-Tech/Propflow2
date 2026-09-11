-- ============================================================
-- PropFlow — Security deposit on first invoice
-- Run this in Supabase SQL Editor
-- ============================================================

-- Tracks the security deposit amount billed on an invoice, separately from
-- rent/maintenance, so the UI/PDF can show it as its own line item. Only
-- ever set on a tenant's very first invoice (see generateInvoice in
-- invoiceService.jsx) — 0 on every invoice after that.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS security_deposit_amount NUMERIC DEFAULT 0;
