-- ============================================================
-- PropFlow — Remove Enquiries from the permissions system
-- Run this in Supabase SQL Editor
-- ============================================================
--
-- The Enquiries feature (public enquiry form + staff list page) has been
-- removed from the app entirely. This only cleans up the permissions side
-- so it stops appearing in Role Management — it does NOT drop the
-- `enquiries` table or delete any historical enquiry data. If you also want
-- the table itself gone, run:
--   DROP TABLE IF EXISTS public.enquiries;
--   DROP VIEW IF EXISTS public.buildings_public;  -- only used by the removed public form

DELETE FROM public.role_permissions WHERE module = 'enquiries';

ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_module_check;
ALTER TABLE public.role_permissions ADD CONSTRAINT role_permissions_module_check
  CHECK (module = ANY (ARRAY['dashboard','tenants','invoices','employees','maintenance','buildings','reports','settings','tenant_portal','messages']));
