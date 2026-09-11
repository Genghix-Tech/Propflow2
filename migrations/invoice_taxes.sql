-- ============================================================
-- PropFlow — Invoice Taxes feature
-- Run this in Supabase SQL Editor
-- ============================================================

-- Manually-entered tax lines on an invoice. Unlike utility_charges,
-- tax_type is free text (not a fixed CHECK list) since tax names vary
-- (GST, sales tax, withholding tax, etc.) and are entered by staff.
CREATE TABLE IF NOT EXISTS public.invoice_taxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  tax_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance: invoices will regularly be joined against their tax lines
CREATE INDEX IF NOT EXISTS idx_invoice_taxes_invoice_id ON public.invoice_taxes(invoice_id);

ALTER TABLE public.invoice_taxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage invoice taxes"
  ON public.invoice_taxes FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Tenant portal: tenants can view (but not edit) tax lines on their own invoices
CREATE POLICY "Tenants can view their own invoice taxes"
  ON public.invoice_taxes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.tenants ON tenants.id = invoices.tenant_id
      WHERE invoices.id = invoice_taxes.invoice_id
      AND tenants.portal_user_id = auth.uid()
    )
  );

-- Tracks the sum of an invoice's tax lines separately from other_charges
-- (utility total), so the invoice UI/PDF can show Subtotal / Tax / Total due.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;
