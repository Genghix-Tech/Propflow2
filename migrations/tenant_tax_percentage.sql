-- Tax moves from a fixed monthly amount to a percentage of rent. Tenant now
-- stores a percentage (tax_type + tax_percentage); the actual PKR amount is
-- computed at invoice-generation time as rent_amount * tax_percentage / 100
-- and snapshotted onto the invoice (invoices.tax_percentage + tax_amount),
-- same pattern already used for tax_amount before this change.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS tax_percentage numeric DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_percentage numeric DEFAULT 0;

-- tax_type is now a fixed dropdown (GST / WHT / OTHER TAX) instead of free text.
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_tax_type_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_tax_type_check
  CHECK (tax_type IS NULL OR tax_type IN ('GST', 'WHT', 'OTHER TAX'));

-- Backfill: any tenant that already had a flat tax_amount set (old model) but
-- no percentage gets left alone — tax_percentage defaults to 0, so their
-- invoices simply won't carry a tax line until an admin sets a percentage.
