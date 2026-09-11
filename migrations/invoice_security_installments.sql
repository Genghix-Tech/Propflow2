-- ============================================================
-- PropFlow — Security deposit installments
-- Run this in Supabase SQL Editor
-- ============================================================

-- Lets staff manually add a security-deposit installment to ANY invoice
-- (not just the tenant's first one), for cases where a tenant pays their
-- security deposit split across two or more months instead of all at once
-- — e.g. half this month with rent, the rest next month.
-- Separate from invoices.security_deposit_amount (the auto-billed full
-- amount on the first invoice) so staff can freely split/adjust per tenant.
CREATE TABLE IF NOT EXISTS public.invoice_security_installments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_security_installments_invoice_id
  ON public.invoice_security_installments(invoice_id);

ALTER TABLE public.invoice_security_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage security installments"
  ON public.invoice_security_installments FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Tenants can view their own security installments"
  ON public.invoice_security_installments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.tenants ON tenants.id = invoices.tenant_id
      WHERE invoices.id = invoice_security_installments.invoice_id
      AND tenants.portal_user_id = auth.uid()
    )
  );

-- Running total of security installments on this invoice (same pattern as
-- other_charges for utilities), kept in sync by recalculateInvoiceTotal.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS security_installment_amount NUMERIC DEFAULT 0;
