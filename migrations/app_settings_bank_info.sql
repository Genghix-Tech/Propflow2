-- Singleton settings table for app-wide config that isn't tied to any one
-- tenant/invoice/building. First use: the bank/payment-receiving details the
-- business wants printed on every invoice (Download PDF and Print).
--
-- The "id boolean primary key default true check (id)" trick guarantees this
-- table can only ever hold exactly one row.
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  invoice_bank_info text,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Staff AND tenants can read it (tenants need to see where to pay on their
-- portal invoices too). Only staff can update it.
DROP POLICY IF EXISTS "Anyone signed in can read app settings" ON public.app_settings;
CREATE POLICY "Anyone signed in can read app settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Staff can update app settings" ON public.app_settings;
CREATE POLICY "Staff can update app settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
