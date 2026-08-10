-- ============================================================
-- PropFlow — Online Rental Enquiry feature
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  -- statuses: new, contacted, closed
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT enquiries_status_check CHECK (status = ANY (ARRAY['new', 'contacted', 'closed']))
);

-- Performance: these columns get filtered/joined often as data grows
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries(status);
CREATE INDEX IF NOT EXISTS idx_enquiries_building_id ON public.enquiries(building_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries(created_at DESC);

ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;

-- Public (anonymous) users can INSERT only — they submit an enquiry but can't read others' data
CREATE POLICY "Anyone can submit an enquiry"
  ON public.enquiries FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated staff can view/manage all enquiries
CREATE POLICY "Authenticated users can manage enquiries"
  ON public.enquiries FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Register the new module in the permissions system so it shows in Role Management
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_module_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_module_check
  CHECK (module = ANY (ARRAY['dashboard','tenants','invoices','employees','maintenance','buildings','reports','settings','tenant_portal','enquiries']));

-- Give existing roles view access to enquiries by default (adjust as needed in Role Management UI)
INSERT INTO public.role_permissions (role_id, module, can_view, can_add, can_edit, can_delete)
SELECT id, 'enquiries', true, false, true, true FROM public.roles
ON CONFLICT (role_id, module) DO NOTHING;

-- ============================================================
-- Public building list — the enquiry form is unauthenticated,
-- so it needs a SAFE way to show building names without exposing
-- the full buildings table (address etc.) to anonymous visitors.
-- ============================================================
CREATE OR REPLACE VIEW public.buildings_public AS
  SELECT id, name FROM public.buildings;

GRANT SELECT ON public.buildings_public TO anon;
