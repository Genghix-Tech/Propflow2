-- ============================================================
-- PropFlow — Invoice Discounts feature
-- Run this in Supabase SQL Editor
-- ============================================================

-- Manually-entered discount lines on an invoice, kept separate from
-- utility_charges/invoice_taxes since discounts subtract from the total
-- instead of adding to it. discount_type is free text (staff types e.g.
-- "Early payment", "Loyalty discount") rather than a fixed list.
CREATE TABLE IF NOT EXISTS public.invoice_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Performance: invoices will regularly be joined against their discount lines
CREATE INDEX IF NOT EXISTS idx_invoice_discounts_invoice_id ON public.invoice_discounts(invoice_id);

ALTER TABLE public.invoice_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage invoice discounts"
  ON public.invoice_discounts FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Tenant portal: tenants can view (but not edit) discount lines on their own invoices
CREATE POLICY "Tenants can view their own invoice discounts"
  ON public.invoice_discounts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.tenants ON tenants.id = invoices.tenant_id
      WHERE invoices.id = invoice_discounts.invoice_id
      AND tenants.portal_user_id = auth.uid()
    )
  );

-- Tracks the sum of an invoice's discount lines so the invoice UI/PDF can
-- show Subtotal / Tax / Discount / Total due.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
