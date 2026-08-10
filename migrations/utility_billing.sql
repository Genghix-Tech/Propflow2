-- ============================================================
-- PropFlow — Utility Billing feature
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.utility_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  utility_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT utility_charges_type_check
    CHECK (utility_type = ANY (ARRAY['electricity', 'gas', 'water', 'internet', 'other']))
);

-- Performance: invoices will regularly be joined against their utility charges
CREATE INDEX IF NOT EXISTS idx_utility_charges_invoice_id ON public.utility_charges(invoice_id);

ALTER TABLE public.utility_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage utility charges"
  ON public.utility_charges FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Tenant portal: tenants can view (but not edit) utility charges on their own invoices
CREATE POLICY "Tenants can view their own utility charges"
  ON public.utility_charges FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.tenants ON tenants.id = invoices.tenant_id
      WHERE invoices.id = utility_charges.invoice_id
      AND tenants.portal_user_id = auth.uid()
    )
  );
